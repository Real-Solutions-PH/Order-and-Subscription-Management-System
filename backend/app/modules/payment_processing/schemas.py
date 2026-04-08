"""Payment Processing Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.schemas import BaseSchema, IDTimestampSchema

# ── Payment Intent ──────────────────────────────────────────────────────

class PaymentIntentCreate(BaseModel):
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field(default="PHP", max_length=3)
    allowed_methods: list[str] = Field(
        default_factory=lambda: ["card", "gcash", "maya", "grabpay"],
        description="PayMongo payment method types allowed for this intent",
    )
    order_id: UUID | None = None
    subscription_id: UUID | None = None
    metadata: dict | None = None


class PaymentIntentResponse(BaseSchema):
    id: UUID
    amount: Decimal
    currency: str
    status: str
    payment_channel: str
    paymongo_intent_id: str | None = None
    checkout_url: str | None = None
    created_at: datetime
    updated_at: datetime


# ── Attach Method ───────────────────────────────────────────────────────

class AttachMethodRequest(BaseModel):
    payment_method_id: str | None = Field(
        default=None,
        description="Existing PayMongo payment method ID to attach",
    )
    type: str | None = Field(
        default=None,
        description="Payment method type (card, gcash, etc.) for inline creation",
    )
    details: dict | None = Field(
        default=None,
        description="Payment method details when creating inline",
    )


# ── Payment Response ────────────────────────────────────────────────────

class PaymentTransactionResponse(BaseSchema):
    id: UUID
    type: str
    amount: Decimal
    status: str
    paymongo_event_id: str | None = None
    payment_method_type: str | None = None
    fee_amount: Decimal | None = None
    net_amount: Decimal | None = None
    error_code: str | None = None
    error_message: str | None = None
    created_at: datetime


class PaymentResponse(BaseSchema):
    id: UUID
    tenant_id: UUID
    order_id: UUID | None = None
    subscription_id: UUID | None = None
    payment_method_id: UUID | None = None
    amount: Decimal
    currency: str
    status: str
    payment_channel: str
    paymongo_intent_id: str | None = None
    paymongo_payment_id: str | None = None
    checkout_url: str | None = None
    retry_count: int
    paid_at: datetime | None = None
    transactions: list[PaymentTransactionResponse] = []
    created_at: datetime
    updated_at: datetime


# ── Refund ──────────────────────────────────────────────────────────────

class RefundRequest(BaseModel):
    amount: Decimal | None = Field(
        default=None,
        gt=0,
        decimal_places=2,
        description="Partial refund amount. Omit for full refund.",
    )
    reason: str | None = Field(default=None, max_length=500)


# ── Payment Method CRUD ─────────────────────────────────────────────────

class PaymentMethodCreate(BaseModel):
    type: str = Field(..., description="Payment method type (card, gcash, etc.)")
    paymongo_method_id: str | None = None
    last_four: str | None = Field(default=None, max_length=4)
    display_name: str = Field(..., max_length=100)
    card_brand: str | None = Field(default=None, max_length=20)
    is_default: bool = False
    expires_at: datetime | None = None
    metadata: dict | None = None


class PaymentMethodResponse(BaseSchema):
    id: UUID
    tenant_id: UUID
    user_id: UUID
    type: str
    paymongo_method_id: str | None = None
    last_four: str | None = None
    display_name: str
    card_brand: str | None = None
    is_default: bool
    expires_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


# ── COD ─────────────────────────────────────────────────────────────────

class CODCreateRequest(BaseModel):
    order_id: UUID
    amount: Decimal = Field(..., gt=0, decimal_places=2)
    currency: str = Field(default="PHP", max_length=3)
    metadata: dict | None = None


class CODCollectRequest(BaseModel):
    collected_amount: Decimal | None = Field(
        default=None,
        gt=0,
        decimal_places=2,
        description="Actual amount collected. Defaults to payment amount.",
    )
    notes: str | None = Field(default=None, max_length=500)


# ── Promo Code ──────────────────────────────────────────────────────────

class PromoValidateRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    order_amount: Decimal = Field(..., gt=0, decimal_places=2)


class PromoValidateResponse(BaseSchema):
    valid: bool
    code: str
    discount_amount: Decimal = Decimal("0.00")
    discount_type: str | None = None
    message: str | None = None


class PromoCodeResponse(IDTimestampSchema):
    tenant_id: UUID
    code: str
    discount_type: str
    discount_value: Decimal
    min_order_amount: Decimal | None = None
    max_discount_amount: Decimal | None = None
    usage_limit: int | None = None
    per_user_limit: int | None = None
    first_order_only: bool
    starts_at: datetime
    expires_at: datetime
    is_active: bool


class PromoCodeListResponse(BaseSchema):
    total: int
    page: int
    per_page: int
    items: list[PromoCodeResponse]


# ── Invoice ─────────────────────────────────────────────────────────────

class InvoiceLineItemResponse(BaseSchema):
    id: UUID
    description: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal


class InvoiceResponse(IDTimestampSchema):
    tenant_id: UUID
    order_id: UUID | None = None
    subscription_id: UUID | None = None
    invoice_number: str
    status: str
    subtotal: Decimal
    tax_amount: Decimal
    discount_amount: Decimal
    total: Decimal
    currency: str
    issued_at: datetime
    paid_at: datetime | None = None
    pdf_url: str | None = None
    line_items: list[InvoiceLineItemResponse] = []


class InvoiceListResponse(BaseSchema):
    total: int
    page: int
    per_page: int
    items: list[InvoiceResponse]
