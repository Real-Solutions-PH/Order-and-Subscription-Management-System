"""Payment Processing business logic."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app.exceptions import BadRequestError, NotFoundError
from app.modules.payment_processing.models import (
    DiscountType,
    Invoice,
    InvoiceLineItem,
    InvoiceStatus,
    Payment,
    PaymentChannel,
    PaymentMethod,
    PaymentMethodType,
    PaymentStatus,
    PaymentTransaction,
    TransactionStatus,
    TransactionType,
)
from app.modules.payment_processing.repo import InvoiceRepo, PaymentRepo, PromoCodeRepo


class PaymentService:
    def __init__(self, payment_repo: PaymentRepo) -> None:
        self.payment_repo = payment_repo

    async def create_intent(
        self,
        tenant_id: uuid.UUID,
        amount: Decimal,
        currency: str = "PHP",
        allowed_methods: list[str] | None = None,
        order_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        metadata: dict | None = None,
    ) -> Payment:
        """Create a PayMongo payment intent and persist the Payment record."""
        # TODO: Call PayMongo API to create a payment intent
        # paymongo_intent = await paymongo_client.create_intent(amount, currency, allowed_methods)
        paymongo_intent_id = f"pi_{uuid.uuid4().hex[:24]}"  # placeholder

        payment = Payment(
            tenant_id=tenant_id,
            order_id=order_id,
            subscription_id=subscription_id,
            amount=amount,
            currency=currency,
            status=PaymentStatus.AWAITING_METHOD,
            payment_channel=PaymentChannel.PAYMONGO,
            paymongo_intent_id=paymongo_intent_id,
            metadata_=metadata,
        )
        payment = await self.payment_repo.create(payment)

        # Record the intent_created transaction
        txn = PaymentTransaction(
            payment_id=payment.id,
            type=TransactionType.INTENT_CREATED,
            amount=amount,
            status=TransactionStatus.SUCCESS,
            paymongo_resource_id=paymongo_intent_id,
        )
        await self.payment_repo.add_transaction(txn)

        return await self.payment_repo.get_by_id(payment.id)  # type: ignore[return-value]

    async def attach_method(
        self,
        payment_id: uuid.UUID,
        payment_method_id: str | None = None,
        method_type: str | None = None,
        details: dict | None = None,
    ) -> Payment:
        """Attach a payment method to an existing payment intent."""
        payment = await self.payment_repo.get_by_id(payment_id)
        if payment is None:
            raise NotFoundError("Payment not found")
        if payment.status != PaymentStatus.AWAITING_METHOD:
            raise BadRequestError(
                f"Cannot attach method to payment in '{payment.status.value}' status"
            )

        # TODO: Call PayMongo API to attach method to intent
        # result = await paymongo_client.attach_method(payment.paymongo_intent_id, ...)
        checkout_url = None  # PayMongo may return a redirect URL for 3DS / e-wallet auth

        update_fields: dict = {"status": PaymentStatus.AWAITING_ACTION}
        if payment_method_id:
            update_fields["payment_method_id"] = None  # link to local method if needed
        if checkout_url:
            update_fields["checkout_url"] = checkout_url

        await self.payment_repo.update(payment_id, **update_fields)

        txn = PaymentTransaction(
            payment_id=payment_id,
            type=TransactionType.METHOD_ATTACHED,
            amount=payment.amount,
            status=TransactionStatus.SUCCESS,
            payment_method_type=method_type or "unknown",
        )
        await self.payment_repo.add_transaction(txn)

        return await self.payment_repo.get_by_id(payment_id)  # type: ignore[return-value]

    async def confirm_payment(self, payment_id: uuid.UUID) -> Payment:
        """Confirm / finalize a payment (webhook or polling callback)."""
        payment = await self.payment_repo.get_by_id(payment_id)
        if payment is None:
            raise NotFoundError("Payment not found")
        if payment.status not in (
            PaymentStatus.AWAITING_ACTION,
            PaymentStatus.PROCESSING,
            PaymentStatus.AWAITING_METHOD,
        ):
            raise BadRequestError(
                f"Cannot confirm payment in '{payment.status.value}' status"
            )

        # TODO: Verify with PayMongo API that payment is actually paid
        now = datetime.now(timezone.utc)
        await self.payment_repo.update(
            payment_id, status=PaymentStatus.PAID, paid_at=now
        )

        txn = PaymentTransaction(
            payment_id=payment_id,
            type=TransactionType.PAID,
            amount=payment.amount,
            status=TransactionStatus.SUCCESS,
        )
        await self.payment_repo.add_transaction(txn)

        return await self.payment_repo.get_by_id(payment_id)  # type: ignore[return-value]

    async def get_payment(self, payment_id: uuid.UUID) -> Payment:
        payment = await self.payment_repo.get_by_id(payment_id)
        if payment is None:
            raise NotFoundError("Payment not found")
        return payment

    async def refund_payment(
        self,
        payment_id: uuid.UUID,
        amount: Decimal | None = None,
        reason: str | None = None,
    ) -> Payment:
        """Issue a full or partial refund."""
        payment = await self.payment_repo.get_by_id(payment_id)
        if payment is None:
            raise NotFoundError("Payment not found")
        if payment.status not in (PaymentStatus.PAID, PaymentStatus.PARTIALLY_REFUNDED):
            raise BadRequestError(
                f"Cannot refund payment in '{payment.status.value}' status"
            )

        refund_amount = amount if amount is not None else payment.amount
        if refund_amount > payment.amount:
            raise BadRequestError("Refund amount exceeds payment amount")

        # TODO: Call PayMongo API to create refund
        new_status = (
            PaymentStatus.REFUNDED
            if refund_amount == payment.amount
            else PaymentStatus.PARTIALLY_REFUNDED
        )
        await self.payment_repo.update(payment_id, status=new_status)

        txn = PaymentTransaction(
            payment_id=payment_id,
            type=TransactionType.REFUNDED,
            amount=refund_amount,
            status=TransactionStatus.SUCCESS,
            error_message=reason,
        )
        await self.payment_repo.add_transaction(txn)

        return await self.payment_repo.get_by_id(payment_id)  # type: ignore[return-value]

    async def create_cod_payment(
        self,
        tenant_id: uuid.UUID,
        order_id: uuid.UUID,
        amount: Decimal,
        currency: str = "PHP",
        metadata: dict | None = None,
    ) -> Payment:
        """Create a cash-on-delivery payment record."""
        payment = Payment(
            tenant_id=tenant_id,
            order_id=order_id,
            amount=amount,
            currency=currency,
            status=PaymentStatus.PENDING_COLLECTION,
            payment_channel=PaymentChannel.COD,
            metadata_=metadata,
        )
        payment = await self.payment_repo.create(payment)

        txn = PaymentTransaction(
            payment_id=payment.id,
            type=TransactionType.INTENT_CREATED,
            amount=amount,
            status=TransactionStatus.SUCCESS,
        )
        await self.payment_repo.add_transaction(txn)

        return await self.payment_repo.get_by_id(payment.id)  # type: ignore[return-value]

    async def collect_cod(
        self,
        payment_id: uuid.UUID,
        collected_amount: Decimal | None = None,
        notes: str | None = None,
    ) -> Payment:
        """Mark a COD payment as collected by the delivery agent."""
        payment = await self.payment_repo.get_by_id(payment_id)
        if payment is None:
            raise NotFoundError("Payment not found")
        if payment.status != PaymentStatus.PENDING_COLLECTION:
            raise BadRequestError(
                f"Cannot collect COD payment in '{payment.status.value}' status"
            )

        actual_amount = collected_amount if collected_amount is not None else payment.amount
        now = datetime.now(timezone.utc)
        await self.payment_repo.update(
            payment_id, status=PaymentStatus.PAID, paid_at=now
        )

        txn = PaymentTransaction(
            payment_id=payment_id,
            type=TransactionType.COD_COLLECTED,
            amount=actual_amount,
            status=TransactionStatus.SUCCESS,
            error_message=notes,
        )
        await self.payment_repo.add_transaction(txn)

        return await self.payment_repo.get_by_id(payment_id)  # type: ignore[return-value]

    async def list_payment_methods(
        self, user_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> list[PaymentMethod]:
        return await self.payment_repo.list_methods_by_user(user_id, tenant_id)

    async def save_payment_method(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        type: str,
        display_name: str,
        paymongo_method_id: str | None = None,
        last_four: str | None = None,
        card_brand: str | None = None,
        is_default: bool = False,
        expires_at: datetime | None = None,
        metadata: dict | None = None,
    ) -> PaymentMethod:
        method = PaymentMethod(
            tenant_id=tenant_id,
            user_id=user_id,
            type=PaymentMethodType(type),
            display_name=display_name,
            paymongo_method_id=paymongo_method_id,
            last_four=last_four,
            card_brand=card_brand,
            is_default=is_default,
            expires_at=expires_at,
            metadata_=metadata,
        )
        return await self.payment_repo.create_method(method)


class PromoCodeService:
    def __init__(self, promo_repo: PromoCodeRepo) -> None:
        self.promo_repo = promo_repo

    async def validate_promo(
        self,
        code: str,
        order_amount: Decimal,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
    ) -> dict:
        """Validate a promo code and calculate the discount.

        Returns a dict with keys: valid, code, discount_amount, discount_type, message.
        """
        promo = await self.promo_repo.get_by_code(code, tenant_id)

        if promo is None:
            return {"valid": False, "code": code, "discount_amount": Decimal("0.00"),
                    "discount_type": None, "message": "Promo code not found"}

        now = datetime.now(timezone.utc)

        if not promo.is_active:
            return {"valid": False, "code": code, "discount_amount": Decimal("0.00"),
                    "discount_type": None, "message": "Promo code is inactive"}

        if now < promo.starts_at:
            return {"valid": False, "code": code, "discount_amount": Decimal("0.00"),
                    "discount_type": None, "message": "Promo code is not yet active"}

        if now > promo.expires_at:
            return {"valid": False, "code": code, "discount_amount": Decimal("0.00"),
                    "discount_type": None, "message": "Promo code has expired"}

        if promo.min_order_amount is not None and order_amount < promo.min_order_amount:
            return {"valid": False, "code": code, "discount_amount": Decimal("0.00"),
                    "discount_type": None,
                    "message": f"Minimum order amount is {promo.min_order_amount}"}

        # Check global usage limit
        if promo.usage_limit is not None:
            usage_count = await self.promo_repo.get_usage_count(promo.id)
            if usage_count >= promo.usage_limit:
                return {"valid": False, "code": code, "discount_amount": Decimal("0.00"),
                        "discount_type": None, "message": "Promo code usage limit reached"}

        # Check per-user usage limit
        if promo.per_user_limit is not None:
            user_usage = await self.promo_repo.get_user_usage_count(promo.id, user_id)
            if user_usage >= promo.per_user_limit:
                return {"valid": False, "code": code, "discount_amount": Decimal("0.00"),
                        "discount_type": None,
                        "message": "You have reached the usage limit for this promo code"}

        # Check first_order_only
        if promo.first_order_only:
            # Any prior usage by this user means they are not a first-time user of this promo
            user_usage = await self.promo_repo.get_user_usage_count(promo.id, user_id)
            if user_usage > 0:
                return {"valid": False, "code": code, "discount_amount": Decimal("0.00"),
                        "discount_type": None,
                        "message": "Promo code is valid for first order only"}

        # Calculate discount
        if promo.discount_type == DiscountType.PERCENTAGE:
            discount = order_amount * promo.discount_value / Decimal("100")
        else:
            discount = promo.discount_value

        # Apply max discount cap
        if promo.max_discount_amount is not None:
            discount = min(discount, promo.max_discount_amount)

        # Discount cannot exceed order amount
        discount = min(discount, order_amount)

        return {
            "valid": True,
            "code": code,
            "discount_amount": discount.quantize(Decimal("0.01")),
            "discount_type": promo.discount_type.value,
            "message": None,
        }

    async def list_promos(
        self,
        tenant_id: uuid.UUID,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list, int]:
        offset = (page - 1) * per_page
        return await self.promo_repo.list_by_tenant(tenant_id, offset, per_page)


class InvoiceService:
    def __init__(self, invoice_repo: InvoiceRepo) -> None:
        self.invoice_repo = invoice_repo

    async def create_invoice(
        self,
        tenant_id: uuid.UUID,
        subtotal: Decimal,
        tax_amount: Decimal = Decimal("0.00"),
        discount_amount: Decimal = Decimal("0.00"),
        currency: str = "PHP",
        order_id: uuid.UUID | None = None,
        subscription_id: uuid.UUID | None = None,
        line_items: list[dict] | None = None,
    ) -> Invoice:
        """Create an invoice with optional line items."""
        total = subtotal - discount_amount + tax_amount
        invoice_number = await self.invoice_repo.get_next_invoice_number(tenant_id)

        invoice = Invoice(
            tenant_id=tenant_id,
            order_id=order_id,
            subscription_id=subscription_id,
            invoice_number=invoice_number,
            status=InvoiceStatus.ISSUED,
            subtotal=subtotal,
            tax_amount=tax_amount,
            discount_amount=discount_amount,
            total=total,
            currency=currency,
            issued_at=datetime.now(timezone.utc),
        )
        invoice = await self.invoice_repo.create(invoice)

        if line_items:
            for item_data in line_items:
                line_item = InvoiceLineItem(
                    invoice_id=invoice.id,
                    description=item_data["description"],
                    quantity=item_data["quantity"],
                    unit_price=item_data["unit_price"],
                    total_price=item_data["total_price"],
                )
                await self.invoice_repo.add_line_item(line_item)

        return await self.invoice_repo.get_by_id(invoice.id)  # type: ignore[return-value]

    async def get_invoice(self, invoice_id: uuid.UUID) -> Invoice:
        invoice = await self.invoice_repo.get_by_id(invoice_id)
        if invoice is None:
            raise NotFoundError("Invoice not found")
        return invoice

    async def list_invoices(
        self,
        tenant_id: uuid.UUID,
        page: int = 1,
        per_page: int = 20,
    ) -> tuple[list[Invoice], int]:
        offset = (page - 1) * per_page
        return await self.invoice_repo.list_by_tenant(tenant_id, offset, per_page)
