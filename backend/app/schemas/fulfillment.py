"""Fulfillment & Logistics schemas."""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.repo.db import FulfillmentStatus, FulfillmentType
from app.schemas.base import BaseSchema

# ---------------------------------------------------------------------------
# Address
# ---------------------------------------------------------------------------


class AddressCreate(BaseModel):
    label: str
    line_1: str
    line_2: str | None = None
    city: str
    province: str
    postal_code: str
    country: str = "PH"
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_default: bool = False
    notes: str | None = None


class AddressUpdate(BaseModel):
    label: str | None = None
    line_1: str | None = None
    line_2: str | None = None
    city: str | None = None
    province: str | None = None
    postal_code: str | None = None
    country: str | None = None
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_default: bool | None = None
    notes: str | None = None


class AddressResponse(BaseSchema):
    id: UUID
    label: str
    line_1: str
    line_2: str | None = None
    city: str
    province: str
    postal_code: str
    country: str
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_default: bool
    notes: str | None = None


# ---------------------------------------------------------------------------
# Delivery Zone
# ---------------------------------------------------------------------------


class DeliverySlotCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time
    capacity: int


class DeliverySlotResponse(BaseSchema):
    id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    capacity: int
    is_active: bool


class DeliveryZoneCreate(BaseModel):
    name: str
    description: str | None = None
    delivery_fee: Decimal
    min_order_amount: Decimal | None = None
    boundaries: dict
    cutoff_hours: int


class DeliveryZoneResponse(BaseSchema):
    id: UUID
    name: str
    description: str | None = None
    delivery_fee: Decimal
    min_order_amount: Decimal | None = None
    boundaries: dict | None = None
    cutoff_hours: int
    is_active: bool
    slots: list[DeliverySlotResponse] | None = None


# ---------------------------------------------------------------------------
# Fulfillment
# ---------------------------------------------------------------------------


class FulfillmentResponse(BaseSchema):
    id: UUID
    order_id: UUID
    fulfillment_type: FulfillmentType
    status: FulfillmentStatus
    scheduled_date: date
    shipped_at: datetime | None = None
    delivered_at: datetime | None = None
    tracking_number: str | None = None


class FulfillmentStatusUpdate(BaseModel):
    status: FulfillmentStatus
    notes: str | None = None


# ---------------------------------------------------------------------------
# Production Report
# ---------------------------------------------------------------------------


class ProductionItem(BaseModel):
    product_name: str
    variant_name: str
    quantity: int

    model_config = ConfigDict(from_attributes=True)


class ProductionReportResponse(BaseModel):
    date: date
    items: list[ProductionItem]
    total_orders: int

    model_config = ConfigDict(from_attributes=True)
