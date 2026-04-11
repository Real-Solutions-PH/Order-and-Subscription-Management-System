"""Order Management Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.schemas import BaseSchema, IDTimestampSchema

# ── Cart Schemas ────────────────────────────────────────────────────────


class CartItemCustomizationRequest(BaseModel):
    key: str = Field(..., max_length=100)
    value: str = Field(..., max_length=255)
    price_adjustment: Decimal = Field(default=Decimal("0.00"), decimal_places=2)


class CartItemCustomizationResponse(BaseSchema):
    id: UUID
    key: str
    value: str
    price_adjustment: Decimal


class CartItemAdd(BaseModel):
    product_variant_id: UUID
    quantity: int = Field(ge=1, default=1)
    unit_price: Decimal = Field(decimal_places=2)
    customizations: list[CartItemCustomizationRequest] | None = None


class CartItemUpdate(BaseModel):
    quantity: int | None = Field(default=None, ge=1)
    customizations: list[CartItemCustomizationRequest] | None = None


class CartItemResponse(BaseSchema):
    id: UUID
    cart_id: UUID
    product_variant_id: UUID
    quantity: int
    unit_price: Decimal
    customizations: list[CartItemCustomizationResponse] = []


class CartResponse(IDTimestampSchema):
    tenant_id: UUID
    user_id: UUID | None = None
    session_id: str | None = None
    promo_code_id: UUID | None = None
    expires_at: datetime | None = None
    items: list[CartItemResponse] = []


# ── Promo ───────────────────────────────────────────────────────────────


class PromoApplyRequest(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)


# ── Checkout / Order Create ─────────────────────────────────────────────


class CheckoutRequest(BaseModel):
    delivery_address_id: UUID | None = None
    delivery_slot_id: UUID | None = None
    payment_method: str = Field(..., max_length=50)
    notes: str | None = Field(default=None, max_length=1000)


# ── Order Schemas ───────────────────────────────────────────────────────


class OrderItemCustomizationResponse(BaseSchema):
    id: UUID
    key: str
    value: str
    price_adjustment: Decimal


class OrderItemResponse(BaseSchema):
    id: UUID
    order_id: UUID
    product_variant_id: UUID
    product_name: str
    variant_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    customizations: list[OrderItemCustomizationResponse] = []


class OrderResponse(IDTimestampSchema):
    tenant_id: UUID
    user_id: UUID | None = None
    order_number: str
    status: str
    order_type: str
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    delivery_fee: Decimal
    total: Decimal
    currency: str
    delivery_address_id: UUID | None = None
    delivery_slot_id: UUID | None = None
    promo_code_id: UUID | None = None
    notes: str | None = None
    placed_at: datetime
    confirmed_at: datetime | None = None
    delivered_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None
    items: list[OrderItemResponse] = []


class OrderListResponse(BaseSchema):
    total: int
    page: int
    per_page: int
    items: list[OrderResponse]


# ── Status / Cancel ─────────────────────────────────────────────────────


class OrderStatusUpdateRequest(BaseModel):
    status: str
    notes: str | None = None


class OrderCancelRequest(BaseModel):
    reason: str | None = Field(default=None, max_length=500)
