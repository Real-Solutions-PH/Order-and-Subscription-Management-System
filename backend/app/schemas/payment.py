"""Payment, invoice, and promo-code schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import Field

from app.repo.db import (
    DiscountType,
    InvoiceStatus,
    PaymentMethodType,
    PaymentStatus,
)
from app.schemas.base import BaseSchema, PaginatedResponse


# ---------------------------------------------------------------------------
# Payment intent / payment
# ---------------------------------------------------------------------------


class PaymentIntentCreate(BaseSchema):
    """Create a new payment intent."""

    order_id: UUID | None = None
    subscription_id: UUID | None = None
    amount: Decimal = Field(gt=0)
    currency: str = "PHP"
    allowed_methods: list[str] | None = None


class PaymentIntentResponse(BaseSchema):
    """Returned after creating a payment intent."""

    id: UUID
    amount: Decimal
    currency: str
    status: PaymentStatus
    client_key: str | None = None
    checkout_url: str | None = None


class AttachMethodRequest(BaseSchema):
    """Attach a payment method to an existing payment."""

    payment_method_type: str
    payment_method_id: UUID | None = None


class PaymentResponse(BaseSchema):
    """Full payment record returned in API responses."""

    id: UUID
    order_id: UUID | None = None
    subscription_id: UUID | None = None
    amount: Decimal
    currency: str
    status: PaymentStatus
    payment_channel: str
    paid_at: datetime | None = None
    created_at: datetime


# ---------------------------------------------------------------------------
# Payment methods (saved)
# ---------------------------------------------------------------------------


class PaymentMethodCreate(BaseSchema):
    """Save a new payment method for a user."""

    type: PaymentMethodType
    paymongo_method_id: str | None = None
    last_four: str | None = None
    display_name: str
    card_brand: str | None = None


class PaymentMethodResponse(BaseSchema):
    """Saved payment method returned in API responses."""

    id: UUID
    type: PaymentMethodType
    last_four: str | None = None
    display_name: str
    card_brand: str | None = None
    is_default: bool


# ---------------------------------------------------------------------------
# COD
# ---------------------------------------------------------------------------


class CODCreateRequest(BaseSchema):
    """Create a COD payment record."""

    order_id: UUID
    amount: Decimal = Field(gt=0)


class CODCollectRequest(BaseSchema):
    """Mark a COD payment as collected."""

    collected_amount: Decimal = Field(gt=0)


# ---------------------------------------------------------------------------
# Promo codes
# ---------------------------------------------------------------------------


class PromoCodeValidate(BaseSchema):
    """Validate a promo code against an order amount."""

    code: str
    order_amount: Decimal


class PromoCodeResponse(BaseSchema):
    """Promo code details with the calculated discount amount."""

    id: UUID
    code: str
    discount_type: DiscountType
    discount_value: Decimal
    discount_amount: Decimal


class PromoCodeCreate(BaseSchema):
    """Create a new promo code (admin)."""

    code: str
    discount_type: DiscountType
    discount_value: Decimal = Field(gt=0)
    min_order_amount: Decimal | None = None
    max_discount_amount: Decimal | None = None
    usage_limit: int | None = None
    per_user_limit: int | None = None
    first_order_only: bool = False
    starts_at: datetime
    expires_at: datetime


# ---------------------------------------------------------------------------
# Invoices
# ---------------------------------------------------------------------------


class InvoiceLineItemResponse(BaseSchema):
    """Single line item on an invoice."""

    id: UUID
    description: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal


class InvoiceResponse(BaseSchema):
    """Full invoice returned in API responses."""

    id: UUID
    invoice_number: str
    status: InvoiceStatus
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    currency: str
    issued_at: datetime
    paid_at: datetime | None = None
    pdf_url: str | None = None
    line_items: list[InvoiceLineItemResponse] = []


class InvoiceListResponse(PaginatedResponse[InvoiceResponse]):
    """Paginated list of invoices."""

    pass


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------


class WebhookPayload(BaseSchema):
    """Raw PayMongo webhook payload."""

    data: dict[str, Any]
