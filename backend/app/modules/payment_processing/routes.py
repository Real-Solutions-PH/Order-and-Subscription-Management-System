"""Payment Processing API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_invoice_service, get_payment_service, get_promo_code_service
from app.modules.payment_processing.schemas import (
    AttachMethodRequest,
    CODCollectRequest,
    CODCreateRequest,
    InvoiceListResponse,
    InvoiceResponse,
    PaymentIntentCreate,
    PaymentIntentResponse,
    PaymentMethodCreate,
    PaymentMethodResponse,
    PaymentResponse,
    PromoCodeListResponse,
    PromoValidateRequest,
    PromoValidateResponse,
    RefundRequest,
)
from app.modules.payment_processing.services import (
    InvoiceService,
    PaymentService,
    PromoCodeService,
)
from app.shared.auth import CurrentUser, SuperUser

router = APIRouter(tags=["Payments"])


# ── Payment Intent ──────────────────────────────────────────────────────

@router.post("/payments/intent", response_model=PaymentIntentResponse, status_code=201)
async def create_payment_intent(
    body: PaymentIntentCreate,
    user: CurrentUser,
    payment_service: Annotated[PaymentService, Depends(get_payment_service)],
):
    """Create a new payment intent via PayMongo."""
    payment = await payment_service.create_intent(
        tenant_id=user.tenant_id,
        amount=body.amount,
        currency=body.currency,
        allowed_methods=body.allowed_methods,
        order_id=body.order_id,
        subscription_id=body.subscription_id,
        metadata=body.metadata,
    )
    return payment


@router.post("/payments/{payment_id}/attach-method", response_model=PaymentResponse)
async def attach_payment_method(
    payment_id: UUID,
    body: AttachMethodRequest,
    user: CurrentUser,
    payment_service: Annotated[PaymentService, Depends(get_payment_service)],
):
    """Attach a payment method to an existing payment intent."""
    return await payment_service.attach_method(
        payment_id=payment_id,
        payment_method_id=body.payment_method_id,
        method_type=body.type,
        details=body.details,
    )


@router.post("/payments/{payment_id}/confirm", response_model=PaymentResponse)
async def confirm_payment(
    payment_id: UUID,
    user: CurrentUser,
    payment_service: Annotated[PaymentService, Depends(get_payment_service)],
):
    """Confirm / finalize a payment."""
    return await payment_service.confirm_payment(payment_id)


@router.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: UUID,
    user: CurrentUser,
    payment_service: Annotated[PaymentService, Depends(get_payment_service)],
):
    """Get payment details by ID."""
    return await payment_service.get_payment(payment_id)


@router.post("/payments/{payment_id}/refund", response_model=PaymentResponse)
async def refund_payment(
    payment_id: UUID,
    body: RefundRequest,
    current_user: SuperUser,
    payment_service: Annotated[PaymentService, Depends(get_payment_service)],
):
    """Issue a full or partial refund (admin/manager only)."""
    return await payment_service.refund_payment(
        payment_id=payment_id,
        amount=body.amount,
        reason=body.reason,
    )


# ── COD ─────────────────────────────────────────────────────────────────

@router.post("/payments/cod", response_model=PaymentResponse, status_code=201)
async def create_cod_payment(
    body: CODCreateRequest,
    user: CurrentUser,
    payment_service: Annotated[PaymentService, Depends(get_payment_service)],
):
    """Create a cash-on-delivery payment record."""
    return await payment_service.create_cod_payment(
        tenant_id=user.tenant_id,
        order_id=body.order_id,
        amount=body.amount,
        currency=body.currency,
        metadata=body.metadata,
    )


@router.post("/payments/cod/{payment_id}/collect", response_model=PaymentResponse)
async def collect_cod_payment(
    payment_id: UUID,
    body: CODCollectRequest,
    current_user: SuperUser,
    payment_service: Annotated[PaymentService, Depends(get_payment_service)],
):
    """Mark a COD payment as collected (admin/manager/driver only)."""
    return await payment_service.collect_cod(
        payment_id=payment_id,
        collected_amount=body.collected_amount,
        notes=body.notes,
    )


# ── Payment Methods ─────────────────────────────────────────────────────

@router.get("/payment-methods", response_model=list[PaymentMethodResponse])
async def list_payment_methods(
    user: CurrentUser,
    payment_service: Annotated[PaymentService, Depends(get_payment_service)],
):
    """List saved payment methods for the current user."""
    return await payment_service.list_payment_methods(
        user_id=user.id,
        tenant_id=user.tenant_id,
    )


@router.post("/payment-methods", response_model=PaymentMethodResponse, status_code=201)
async def create_payment_method(
    body: PaymentMethodCreate,
    user: CurrentUser,
    payment_service: Annotated[PaymentService, Depends(get_payment_service)],
):
    """Save a new payment method."""
    return await payment_service.save_payment_method(
        tenant_id=user.tenant_id,
        user_id=user.id,
        type=body.type,
        display_name=body.display_name,
        paymongo_method_id=body.paymongo_method_id,
        last_four=body.last_four,
        card_brand=body.card_brand,
        is_default=body.is_default,
        expires_at=body.expires_at,
        metadata=body.metadata,
    )


# ── Promo Codes ─────────────────────────────────────────────────────────

@router.post("/promo-codes/validate", response_model=PromoValidateResponse)
async def validate_promo_code(
    body: PromoValidateRequest,
    user: CurrentUser,
    promo_service: Annotated[PromoCodeService, Depends(get_promo_code_service)],
):
    """Validate a promo code and calculate discount."""
    result = await promo_service.validate_promo(
        code=body.code,
        order_amount=body.order_amount,
        tenant_id=user.tenant_id,
        user_id=user.id,
    )
    return result


@router.get("/promo-codes", response_model=PromoCodeListResponse)
async def list_promo_codes(
    current_user: SuperUser,
    promo_service: Annotated[PromoCodeService, Depends(get_promo_code_service)],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List all promo codes for the tenant (admin/manager only)."""
    promos, total = await promo_service.list_promos(
        tenant_id=current_user.tenant_id,
        page=page,
        per_page=per_page,
    )
    return PromoCodeListResponse(total=total, page=page, per_page=per_page, items=promos)


# ── Invoices ────────────────────────────────────────────────────────────

@router.get("/invoices", response_model=InvoiceListResponse)
async def list_invoices(
    user: CurrentUser,
    invoice_service: Annotated[InvoiceService, Depends(get_invoice_service)],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    """List invoices for the current user's tenant."""
    invoices, total = await invoice_service.list_invoices(
        tenant_id=user.tenant_id,
        page=page,
        per_page=per_page,
    )
    return InvoiceListResponse(total=total, page=page, per_page=per_page, items=invoices)


@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: UUID,
    user: CurrentUser,
    invoice_service: Annotated[InvoiceService, Depends(get_invoice_service)],
):
    """Get a single invoice by ID."""
    return await invoice_service.get_invoice(invoice_id)
