"""Order and cart schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Optional
from uuid import UUID

from pydantic import Field

from app.repo.db import OrderStatus, OrderType
from app.schemas.base import BaseSchema, PaginatedResponse


# ---------------------------------------------------------------------------
# Cart
# ---------------------------------------------------------------------------


class CustomizationInput(BaseSchema):
    """A single customization for a cart/order item."""

    key: str
    value: str
    price_adjustment: Decimal = Decimal("0")


class CartItemAdd(BaseSchema):
    """Payload to add an item to the cart."""

    product_variant_id: UUID
    quantity: int = Field(ge=1)
    customizations: list[CustomizationInput] | None = None


class CartItemUpdate(BaseSchema):
    """Payload to update a cart item's quantity."""

    quantity: int = Field(ge=1)


class CartItemResponse(BaseSchema):
    """Single cart item returned in API responses."""

    id: UUID
    product_variant_id: UUID
    quantity: int
    unit_price: Decimal
    customizations: list[CustomizationInput] = []
    subtotal: Decimal


class CartResponse(BaseSchema):
    """Full cart returned in API responses."""

    id: UUID
    items: list[CartItemResponse]
    subtotal: Decimal
    item_count: int
    promo_code: str | None = None


class ApplyPromoRequest(BaseSchema):
    """Payload for applying a promo code to the cart."""

    code: str


# ---------------------------------------------------------------------------
# Orders
# ---------------------------------------------------------------------------


class CheckoutRequest(BaseSchema):
    """Payload to initiate checkout from the current cart."""

    delivery_address_id: UUID | None = None
    delivery_slot_id: UUID | None = None
    payment_method: str
    promo_code: str | None = None
    notes: str | None = None


class OrderItemResponse(BaseSchema):
    """Single order item in API responses."""

    id: UUID
    product_variant_id: UUID
    product_name: str
    variant_name: str
    quantity: int
    unit_price: Decimal
    total_price: Decimal
    customizations: list[CustomizationInput] = []


class OrderResponse(BaseSchema):
    """Full order returned in API responses."""

    id: UUID
    order_number: str
    status: OrderStatus
    order_type: OrderType
    items: list[OrderItemResponse] = []
    subtotal: Decimal
    discount_amount: Decimal
    tax_amount: Decimal
    delivery_fee: Decimal
    total: Decimal
    currency: str
    notes: str | None = None
    placed_at: datetime | None = None
    confirmed_at: datetime | None = None
    delivered_at: datetime | None = None
    created_at: datetime


class OrderListResponse(PaginatedResponse[OrderResponse]):
    """Paginated list of orders."""

    pass


class OrderStatusUpdate(BaseSchema):
    """Payload to update order status (admin)."""

    status: OrderStatus
    notes: str | None = None


class OrderCancelRequest(BaseSchema):
    """Payload for cancelling an order."""

    reason: str
