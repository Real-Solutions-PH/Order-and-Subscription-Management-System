"""Payment processing, invoice, and promo-code services."""

from __future__ import annotations

import logging
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import RedisCache
from app.core.events import get_event_bus
from app.core.exceptions import BadRequestException, NotFoundException, PaymentException
from app.repo.db import (
    DiscountType,
    Invoice,
    InvoiceLineItem,
    InvoiceStatus,
    Order,
    OrderItem,
    Payment,
    PaymentChannel,
    PaymentMethod,
    PaymentStatus,
    PromoCode,
    TransactionStatus,
    TransactionType,
)
from app.repo.payment import (
    InvoiceRepository,
    PaymentMethodRepository,
    PaymentRepository,
    PaymentTransactionRepository,
    PromoCodeRepository,
)
from app.schemas.base import PaginatedResponse
from app.schemas.payment import (
    AttachMethodRequest,
    CODCollectRequest,
    CODCreateRequest,
    InvoiceLineItemResponse,
    InvoiceResponse,
    PaymentIntentCreate,
    PaymentIntentResponse,
    PaymentMethodCreate,
    PaymentMethodResponse,
    PaymentResponse,
    PromoCodeCreate,
    PromoCodeResponse,
    PromoCodeValidate,
)

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# PaymentService
# ---------------------------------------------------------------------------


class PaymentService:
    """Service layer for payment lifecycle and PayMongo integration (stubs)."""

    def __init__(self, session: AsyncSession, cache: RedisCache | None = None) -> None:
        self.session = session
        self.cache = cache
        self.payment_repo = PaymentRepository(session)
        self.tx_repo = PaymentTransactionRepository(session)
        self.method_repo = PaymentMethodRepository(session)
        self.promo_repo = PromoCodeRepository(session)

    # -- helpers -------------------------------------------------------------

    def _build_payment_response(self, payment: Payment) -> PaymentResponse:
        return PaymentResponse(
            id=payment.id,
            order_id=payment.order_id,
            subscription_id=payment.subscription_id,
            amount=payment.amount,
            currency=payment.currency,
            status=payment.status,
            payment_channel=payment.payment_channel.value,
            paid_at=payment.paid_at,
            created_at=payment.created_at,
        )

    def _build_intent_response(self, payment: Payment) -> PaymentIntentResponse:
        return PaymentIntentResponse(
            id=payment.id,
            amount=payment.amount,
            currency=payment.currency,
            status=payment.status,
            client_key=None,  # TODO: populate from PayMongo response
            checkout_url=payment.checkout_url,
        )

    # -- payment intent flow -------------------------------------------------

    async def create_payment_intent(
        self,
        tenant_id: UUID | str,
        data: PaymentIntentCreate,
    ) -> PaymentIntentResponse:
        """Create a payment record (PayMongo intent creation is stubbed)."""
        # TODO: Call PayMongo API to create a payment intent
        # response = await paymongo_client.create_intent(
        #     amount=int(data.amount * 100),  # centavos
        #     currency=data.currency,
        #     allowed_methods=data.allowed_methods,
        # )
        # paymongo_intent_id = response["data"]["id"]
        # client_key = response["data"]["attributes"]["client_key"]

        payment = await self.payment_repo.create(
            {
                "tenant_id": tenant_id,
                "order_id": data.order_id,
                "subscription_id": data.subscription_id,
                "amount": data.amount,
                "currency": data.currency,
                "status": PaymentStatus.pending,
                "payment_channel": PaymentChannel.paymongo,
                "paymongo_intent_id": None,  # TODO: set from PayMongo
            }
        )

        # Log the transaction
        await self.tx_repo.create(
            {
                "payment_id": payment.id,
                "type": TransactionType.intent_created,
                "amount": data.amount,
                "status": TransactionStatus.success,
            }
        )

        return self._build_intent_response(payment)

    async def attach_method(
        self,
        payment_id: UUID | str,
        tenant_id: UUID | str,
        data: AttachMethodRequest,
    ) -> PaymentResponse:
        """Attach a payment method to a payment (PayMongo stub)."""
        payment = await self.payment_repo.get_by_id(payment_id, tenant_id)
        if payment is None:
            raise NotFoundException("Payment", str(payment_id))

        # TODO: Call PayMongo API to attach method
        # response = await paymongo_client.attach_method(
        #     intent_id=payment.paymongo_intent_id,
        #     method_id=data.payment_method_id,
        #     method_type=data.payment_method_type,
        # )

        payment.status = PaymentStatus.awaiting_action
        if data.payment_method_id:
            payment.payment_method_id = data.payment_method_id
        await self.session.flush()

        await self.tx_repo.create(
            {
                "payment_id": payment.id,
                "type": TransactionType.method_attached,
                "amount": payment.amount,
                "status": TransactionStatus.success,
                "payment_method_type": data.payment_method_type,
            }
        )

        return self._build_payment_response(payment)

    async def confirm_payment(
        self,
        payment_id: UUID | str,
        tenant_id: UUID | str,
    ) -> PaymentResponse:
        """Confirm / mark a payment as paid."""
        payment = await self.payment_repo.get_by_id(payment_id, tenant_id)
        if payment is None:
            raise NotFoundException("Payment", str(payment_id))

        if payment.status == PaymentStatus.paid:
            raise BadRequestException("Payment is already paid")

        payment.status = PaymentStatus.paid
        payment.paid_at = datetime.now(timezone.utc)
        await self.session.flush()

        await self.tx_repo.create(
            {
                "payment_id": payment.id,
                "type": TransactionType.paid,
                "amount": payment.amount,
                "status": TransactionStatus.success,
            }
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "payment.paid",
            {
                "payment_id": str(payment.id),
                "order_id": str(payment.order_id) if payment.order_id else None,
                "tenant_id": str(tenant_id),
            },
        )

        return self._build_payment_response(payment)

    async def get_payment(
        self,
        payment_id: UUID | str,
        tenant_id: UUID | str,
    ) -> PaymentResponse:
        """Retrieve a single payment by ID."""
        payment = await self.payment_repo.get_by_id(payment_id, tenant_id)
        if payment is None:
            raise NotFoundException("Payment", str(payment_id))
        return self._build_payment_response(payment)

    # -- webhook processing --------------------------------------------------

    async def process_webhook(self, payload: dict[str, Any]) -> None:
        """Process an incoming PayMongo webhook event.

        This method is idempotent -- duplicate events are silently skipped.
        """
        # TODO: Verify webhook signature using PayMongo secret
        # signature = headers.get("paymongo-signature")
        # verify_signature(payload, signature, secret)

        event_data = payload.get("data", {})
        event_type = event_data.get("attributes", {}).get("type", "")
        resource = event_data.get("attributes", {}).get("data", {})
        paymongo_event_id = event_data.get("id", "")

        # Idempotency check
        if paymongo_event_id:
            already_processed = await self.tx_repo.check_idempotency(paymongo_event_id)
            if already_processed:
                logger.info("Duplicate webhook event %s -- skipping", paymongo_event_id)
                return

        # Route based on event type
        if event_type == "payment.paid":
            await self._handle_payment_paid(resource, paymongo_event_id)
        elif event_type == "payment.failed":
            await self._handle_payment_failed(resource, paymongo_event_id)
        elif event_type == "payment.refunded":
            await self._handle_payment_refunded(resource, paymongo_event_id)
        else:
            logger.warning("Unhandled webhook event type: %s", event_type)

    async def _handle_payment_paid(self, resource: dict[str, Any], event_id: str) -> None:
        """Handle a payment.paid webhook event."""
        intent_id = resource.get("attributes", {}).get("payment_intent_id")
        if not intent_id:
            return

        payment = await self.payment_repo.get_by_intent(intent_id)
        if payment is None:
            logger.warning("No payment found for intent %s", intent_id)
            return

        payment.status = PaymentStatus.paid
        payment.paid_at = datetime.now(timezone.utc)
        await self.session.flush()

        await self.tx_repo.create(
            {
                "payment_id": payment.id,
                "type": TransactionType.paid,
                "amount": payment.amount,
                "status": TransactionStatus.success,
                "paymongo_event_id": event_id,
                "paymongo_response": resource,
            }
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "payment.paid",
            {"payment_id": str(payment.id), "order_id": str(payment.order_id)},
        )

    async def _handle_payment_failed(self, resource: dict[str, Any], event_id: str) -> None:
        """Handle a payment.failed webhook event."""
        intent_id = resource.get("attributes", {}).get("payment_intent_id")
        if not intent_id:
            return

        payment = await self.payment_repo.get_by_intent(intent_id)
        if payment is None:
            return

        payment.status = PaymentStatus.failed
        await self.session.flush()

        error_code = resource.get("attributes", {}).get("last_payment_error", {}).get("code")
        error_message = resource.get("attributes", {}).get("last_payment_error", {}).get("message")

        await self.tx_repo.create(
            {
                "payment_id": payment.id,
                "type": TransactionType.failed,
                "amount": payment.amount,
                "status": TransactionStatus.failed,
                "paymongo_event_id": event_id,
                "error_code": error_code,
                "error_message": error_message,
                "paymongo_response": resource,
            }
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "payment.failed",
            {"payment_id": str(payment.id), "order_id": str(payment.order_id)},
        )

    async def _handle_payment_refunded(self, resource: dict[str, Any], event_id: str) -> None:
        """Handle a payment.refunded webhook event."""
        intent_id = resource.get("attributes", {}).get("payment_intent_id")
        if not intent_id:
            return

        payment = await self.payment_repo.get_by_intent(intent_id)
        if payment is None:
            return

        payment.status = PaymentStatus.refunded
        await self.session.flush()

        await self.tx_repo.create(
            {
                "payment_id": payment.id,
                "type": TransactionType.refunded,
                "amount": payment.amount,
                "status": TransactionStatus.success,
                "paymongo_event_id": event_id,
                "paymongo_response": resource,
            }
        )

    # -- COD -----------------------------------------------------------------

    async def create_cod_payment(
        self,
        tenant_id: UUID | str,
        data: CODCreateRequest,
    ) -> PaymentResponse:
        """Create a COD (cash-on-delivery) payment record."""
        payment = await self.payment_repo.create(
            {
                "tenant_id": tenant_id,
                "order_id": data.order_id,
                "amount": data.amount,
                "currency": "PHP",
                "status": PaymentStatus.pending_collection,
                "payment_channel": PaymentChannel.cod,
            }
        )

        await self.tx_repo.create(
            {
                "payment_id": payment.id,
                "type": TransactionType.intent_created,
                "amount": data.amount,
                "status": TransactionStatus.success,
            }
        )

        return self._build_payment_response(payment)

    async def collect_cod(
        self,
        payment_id: UUID | str,
        tenant_id: UUID | str,
    ) -> PaymentResponse:
        """Mark a COD payment as collected."""
        payment = await self.payment_repo.get_by_id(payment_id, tenant_id)
        if payment is None:
            raise NotFoundException("Payment", str(payment_id))

        if payment.payment_channel != PaymentChannel.cod:
            raise BadRequestException("Payment is not a COD payment")

        if payment.status == PaymentStatus.paid:
            raise BadRequestException("COD payment already collected")

        payment.status = PaymentStatus.paid
        payment.paid_at = datetime.now(timezone.utc)
        await self.session.flush()

        await self.tx_repo.create(
            {
                "payment_id": payment.id,
                "type": TransactionType.cod_collected,
                "amount": payment.amount,
                "status": TransactionStatus.success,
            }
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "payment.cod_collected",
            {
                "payment_id": str(payment.id),
                "order_id": str(payment.order_id) if payment.order_id else None,
                "tenant_id": str(tenant_id),
            },
        )

        return self._build_payment_response(payment)

    # -- refund --------------------------------------------------------------

    async def refund_payment(
        self,
        payment_id: UUID | str,
        tenant_id: UUID | str,
        amount: Decimal | None = None,
    ) -> PaymentResponse:
        """Refund a payment (full or partial). PayMongo call is stubbed."""
        payment = await self.payment_repo.get_by_id(payment_id, tenant_id)
        if payment is None:
            raise NotFoundException("Payment", str(payment_id))

        if payment.status not in (PaymentStatus.paid, PaymentStatus.partially_refunded):
            raise BadRequestException("Payment is not eligible for refund")

        refund_amount = amount if amount is not None else payment.amount

        if refund_amount > payment.amount:
            raise BadRequestException("Refund amount exceeds payment amount")

        # TODO: Call PayMongo API to create a refund
        # response = await paymongo_client.create_refund(
        #     payment_id=payment.paymongo_payment_id,
        #     amount=int(refund_amount * 100),
        #     reason="requested_by_customer",
        # )

        if refund_amount == payment.amount:
            payment.status = PaymentStatus.refunded
        else:
            payment.status = PaymentStatus.partially_refunded
        await self.session.flush()

        await self.tx_repo.create(
            {
                "payment_id": payment.id,
                "type": TransactionType.refunded,
                "amount": refund_amount,
                "status": TransactionStatus.success,
            }
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "payment.refunded",
            {
                "payment_id": str(payment.id),
                "tenant_id": str(tenant_id),
                "amount": str(refund_amount),
            },
        )

        return self._build_payment_response(payment)

    # -- promo validation ----------------------------------------------------

    async def validate_promo(
        self,
        tenant_id: UUID | str,
        user_id: UUID | str,
        data: PromoCodeValidate,
    ) -> PromoCodeResponse:
        """Validate a promo code and return the calculated discount."""
        promo = await self.promo_repo.get_by_code(data.code, tenant_id)
        if promo is None:
            raise BadRequestException("Invalid promo code")

        now = datetime.now(timezone.utc)
        if now < promo.starts_at or now > promo.expires_at:
            raise BadRequestException("Promo code is not currently active")

        if promo.min_order_amount and data.order_amount < promo.min_order_amount:
            raise BadRequestException(f"Minimum order amount of {promo.min_order_amount} required")

        can_use = await self.promo_repo.validate_usage(promo.id, user_id)
        if not can_use:
            raise BadRequestException("Promo code usage limit reached")

        # Calculate discount
        if promo.discount_type == DiscountType.percentage:
            discount_amount = data.order_amount * promo.discount_value / Decimal("100")
        else:
            discount_amount = promo.discount_value

        if promo.max_discount_amount is not None:
            discount_amount = min(discount_amount, promo.max_discount_amount)

        return PromoCodeResponse(
            id=promo.id,
            code=promo.code,
            discount_type=promo.discount_type,
            discount_value=promo.discount_value,
            discount_amount=discount_amount,
        )

    # -- payment methods -----------------------------------------------------

    async def save_payment_method(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        data: PaymentMethodCreate,
    ) -> PaymentMethodResponse:
        """Save a new payment method for the user."""
        pm = await self.method_repo.create(
            {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "type": data.type,
                "paymongo_method_id": data.paymongo_method_id,
                "last_four": data.last_four,
                "display_name": data.display_name,
                "card_brand": data.card_brand,
                "is_default": False,
            }
        )
        return PaymentMethodResponse(
            id=pm.id,
            type=pm.type,
            last_four=pm.last_four,
            display_name=pm.display_name,
            card_brand=pm.card_brand,
            is_default=pm.is_default,
        )

    async def list_payment_methods(self, user_id: UUID | str, tenant_id: UUID | str) -> list[PaymentMethodResponse]:
        """Return all saved payment methods for a user."""
        methods = await self.method_repo.get_by_user(user_id, tenant_id)
        return [
            PaymentMethodResponse(
                id=m.id,
                type=m.type,
                last_four=m.last_four,
                display_name=m.display_name,
                card_brand=m.card_brand,
                is_default=m.is_default,
            )
            for m in methods
        ]

    # -- promo code management (admin) ---------------------------------------

    async def create_promo_code(
        self,
        tenant_id: UUID | str,
        data: PromoCodeCreate,
    ) -> PromoCodeResponse:
        """Create a new promo code (admin only)."""
        existing = await self.promo_repo.get_by_code(data.code, tenant_id)
        if existing is not None:
            raise BadRequestException(f"Promo code '{data.code}' already exists")

        promo = await self.promo_repo.create(
            {
                "tenant_id": tenant_id,
                "code": data.code,
                "discount_type": data.discount_type,
                "discount_value": data.discount_value,
                "min_order_amount": data.min_order_amount,
                "max_discount_amount": data.max_discount_amount,
                "usage_limit": data.usage_limit,
                "per_user_limit": data.per_user_limit,
                "first_order_only": data.first_order_only,
                "starts_at": data.starts_at,
                "expires_at": data.expires_at,
            }
        )
        return PromoCodeResponse(
            id=promo.id,
            code=promo.code,
            discount_type=promo.discount_type,
            discount_value=promo.discount_value,
            discount_amount=Decimal("0"),
        )

    async def list_promo_codes(self, tenant_id: UUID | str, skip: int = 0, limit: int = 50) -> list[PromoCodeResponse]:
        """Return all promo codes for a tenant."""
        promos = await self.promo_repo.get_all(skip=skip, limit=limit, tenant_id=tenant_id)
        return [
            PromoCodeResponse(
                id=p.id,
                code=p.code,
                discount_type=p.discount_type,
                discount_value=p.discount_value,
                discount_amount=Decimal("0"),
            )
            for p in promos
        ]


# ---------------------------------------------------------------------------
# InvoiceService
# ---------------------------------------------------------------------------


class InvoiceService:
    """Service layer for invoice generation and retrieval."""

    def __init__(self, session: AsyncSession, cache: RedisCache | None = None) -> None:
        self.session = session
        self.cache = cache
        self.invoice_repo = InvoiceRepository(session)

    def _build_invoice_response(self, invoice: Invoice) -> InvoiceResponse:
        return InvoiceResponse(
            id=invoice.id,
            invoice_number=invoice.invoice_number,
            status=invoice.status,
            subtotal=invoice.subtotal,
            tax_amount=invoice.tax_amount,
            discount_amount=invoice.discount_amount,
            total=invoice.total,
            currency=invoice.currency,
            issued_at=invoice.issued_at,
            paid_at=invoice.paid_at,
            pdf_url=invoice.pdf_url,
            line_items=[
                InvoiceLineItemResponse(
                    id=li.id,
                    description=li.description,
                    quantity=li.quantity,
                    unit_price=li.unit_price,
                    total_price=li.total_price,
                )
                for li in (invoice.line_items if invoice.line_items else [])
            ],
        )

    async def generate_invoice(
        self,
        tenant_id: UUID | str,
        order_id: UUID | str,
    ) -> InvoiceResponse:
        """Generate an invoice from an existing order."""
        from sqlalchemy import select

        # Load order with items
        stmt = (
            select(Order).where(Order.id == order_id, Order.tenant_id == tenant_id).options(selectinload(Order.items))
        )
        result = await self.session.execute(stmt)
        order = result.scalar_one_or_none()
        if order is None:
            raise NotFoundException("Order", str(order_id))

        # Check for existing invoice
        existing = await self.invoice_repo.get_by_order(order_id)
        if existing is not None:
            return self._build_invoice_response(existing)

        invoice_number = await self.invoice_repo.generate_invoice_number(tenant_id)
        now = datetime.now(timezone.utc)

        invoice = await self.invoice_repo.create(
            {
                "tenant_id": tenant_id,
                "order_id": order_id,
                "invoice_number": invoice_number,
                "status": InvoiceStatus.issued,
                "subtotal": order.subtotal,
                "tax_amount": order.tax_amount,
                "discount_amount": order.discount_amount,
                "total": order.total,
                "currency": order.currency,
                "issued_at": now,
            }
        )

        # Create line items from order items
        for oi in order.items:
            line_item = InvoiceLineItem(
                invoice_id=invoice.id,
                description=f"{oi.product_name} - {oi.variant_name}",
                quantity=oi.quantity,
                unit_price=oi.unit_price,
                total_price=oi.total_price,
            )
            self.session.add(line_item)

        await self.session.flush()

        # Reload with line items
        reloaded = await self.invoice_repo.get_by_order(order_id)
        if reloaded is None:
            raise NotFoundException("Invoice")
        return self._build_invoice_response(reloaded)

    async def get_invoice(
        self,
        invoice_id: UUID | str,
        tenant_id: UUID | str,
    ) -> InvoiceResponse:
        """Retrieve a single invoice by ID."""
        invoice = await self.invoice_repo.get_by_id(invoice_id, tenant_id)
        if invoice is None:
            raise NotFoundException("Invoice", str(invoice_id))
        # Reload with line items
        full = await self.invoice_repo.get_by_order(invoice.order_id)  # type: ignore[arg-type]
        return self._build_invoice_response(full or invoice)

    async def list_invoices(
        self,
        tenant_id: UUID | str,
        skip: int = 0,
        limit: int = 20,
    ) -> PaginatedResponse[InvoiceResponse]:
        """Return a paginated list of invoices for a tenant."""
        invoices = await self.invoice_repo.get_by_tenant(tenant_id, skip, limit)
        total = await self.invoice_repo.count_by_tenant(tenant_id)
        page = (skip // limit) + 1 if limit > 0 else 1
        items = [self._build_invoice_response(inv) for inv in invoices]
        return PaginatedResponse[InvoiceResponse].build(
            items=items,
            total=total,
            page=page,
            page_size=limit,
        )
