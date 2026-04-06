"""Payment processing, promo code, invoice, and webhook routes."""

from __future__ import annotations

from decimal import Decimal
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import RedisCache, get_cache
from app.core.permissions import PermissionChecker, get_current_user
from app.repo.session import get_app_db
from app.schemas.base import MessageResponse
from app.schemas.payment import (
    AttachMethodRequest,
    CODCreateRequest,
    InvoiceResponse,
    PaymentIntentCreate,
    PaymentIntentResponse,
    PaymentMethodCreate,
    PaymentMethodResponse,
    PaymentResponse,
    PromoCodeCreate,
    PromoCodeResponse,
    PromoCodeValidate,
    WebhookPayload,
)
from app.services.payment import InvoiceService, PaymentService

router = APIRouter(tags=["payments"])


# ---------------------------------------------------------------------------
# Payment intent / lifecycle
# ---------------------------------------------------------------------------


@router.post(
    "/payments/intent",
    response_model=PaymentIntentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_payment_intent(
    data: PaymentIntentCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Create a new payment intent."""
    service = PaymentService(session, cache)
    return await service.create_payment_intent(
        tenant_id=current_user["tenant_id"],
        data=data,
    )


@router.post("/payments/{payment_id}/attach-method", response_model=PaymentResponse)
async def attach_method(
    payment_id: UUID,
    data: AttachMethodRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Attach a payment method to an existing payment."""
    service = PaymentService(session, cache)
    return await service.attach_method(
        payment_id=payment_id,
        tenant_id=current_user["tenant_id"],
        data=data,
    )


@router.post("/payments/{payment_id}/confirm", response_model=PaymentResponse)
async def confirm_payment(
    payment_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Confirm a payment (mark as paid)."""
    service = PaymentService(session, cache)
    return await service.confirm_payment(
        payment_id=payment_id,
        tenant_id=current_user["tenant_id"],
    )


@router.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Get the current status of a payment."""
    service = PaymentService(session, cache)
    return await service.get_payment(
        payment_id=payment_id,
        tenant_id=current_user["tenant_id"],
    )


@router.post("/payments/{payment_id}/refund", response_model=PaymentResponse)
async def refund_payment(
    payment_id: UUID,
    amount: Decimal | None = None,
    current_user: dict[str, Any] = Depends(PermissionChecker(["payments:refund"])),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Refund a payment (admin only, full or partial)."""
    service = PaymentService(session, cache)
    return await service.refund_payment(
        payment_id=payment_id,
        tenant_id=current_user["tenant_id"],
        amount=amount,
    )


# ---------------------------------------------------------------------------
# COD
# ---------------------------------------------------------------------------


@router.post(
    "/payments/cod",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_cod_payment(
    data: CODCreateRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Create a cash-on-delivery payment."""
    service = PaymentService(session, cache)
    return await service.create_cod_payment(
        tenant_id=current_user["tenant_id"],
        data=data,
    )


@router.post("/payments/cod/{payment_id}/collect", response_model=PaymentResponse)
async def collect_cod(
    payment_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Mark a COD payment as collected."""
    service = PaymentService(session, cache)
    return await service.collect_cod(
        payment_id=payment_id,
        tenant_id=current_user["tenant_id"],
    )


# ---------------------------------------------------------------------------
# Promo codes
# ---------------------------------------------------------------------------


@router.post("/promo-codes/validate", response_model=PromoCodeResponse)
async def validate_promo_code(
    data: PromoCodeValidate,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Validate a promo code and return the calculated discount."""
    service = PaymentService(session, cache)
    return await service.validate_promo(
        tenant_id=current_user["tenant_id"],
        user_id=current_user["sub"],
        data=data,
    )


@router.get("/promo-codes", response_model=list[PromoCodeResponse])
async def list_promo_codes(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    current_user: dict[str, Any] = Depends(PermissionChecker(["promo_codes:read"])),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """List all promo codes (admin only)."""
    service = PaymentService(session, cache)
    return await service.list_promo_codes(
        tenant_id=current_user["tenant_id"],
        skip=skip,
        limit=limit,
    )


@router.post(
    "/promo-codes",
    response_model=PromoCodeResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_promo_code(
    data: PromoCodeCreate,
    current_user: dict[str, Any] = Depends(PermissionChecker(["promo_codes:create"])),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Create a new promo code (admin only)."""
    service = PaymentService(session, cache)
    return await service.create_promo_code(
        tenant_id=current_user["tenant_id"],
        data=data,
    )


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------


@router.get("/invoices", response_model=list[InvoiceResponse])
async def list_invoices(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """List invoices for the current tenant."""
    service = InvoiceService(session, cache)
    result = await service.list_invoices(
        tenant_id=current_user["tenant_id"],
        skip=skip,
        limit=limit,
    )
    return result.items


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Retrieve a single invoice."""
    service = InvoiceService(session, cache)
    return await service.get_invoice(
        invoice_id=invoice_id,
        tenant_id=current_user["tenant_id"],
    )


# ---------------------------------------------------------------------------
# Webhook (no auth -- signature verification only)
# ---------------------------------------------------------------------------


@router.post(
    "/webhooks/paymongo",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def paymongo_webhook(
    payload: WebhookPayload,
    request: Request,
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Receive PayMongo webhook events.

    No JWT authentication is required; the webhook is verified via
    PayMongo signature (TODO: implement verification).
    """
    service = PaymentService(session, cache)
    await service.process_webhook(payload.data)
    return MessageResponse(message="Webhook processed")


# ---------------------------------------------------------------------------
# Payment methods
# ---------------------------------------------------------------------------


@router.post(
    "/payment-methods",
    response_model=PaymentMethodResponse,
    status_code=status.HTTP_201_CREATED,
)
async def save_payment_method(
    data: PaymentMethodCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Save a new payment method."""
    service = PaymentService(session, cache)
    return await service.save_payment_method(
        user_id=current_user["sub"],
        tenant_id=current_user["tenant_id"],
        data=data,
    )


@router.get("/payment-methods", response_model=list[PaymentMethodResponse])
async def list_payment_methods(
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """List saved payment methods for the current user."""
    service = PaymentService(session, cache)
    return await service.list_payment_methods(
        user_id=current_user["sub"],
        tenant_id=current_user["tenant_id"],
    )
