"""Fulfillment & Logistics Pydantic schemas."""

from datetime import date, datetime, time
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.schemas import BaseSchema, IDTimestampSchema

# ── Address ─────────────────────────────────────────────────────────────


class AddressCreate(BaseModel):
    label: str = Field(..., max_length=50)
    line_1: str = Field(..., max_length=255)
    line_2: str | None = Field(default=None, max_length=255)
    city: str = Field(..., max_length=100)
    province: str = Field(..., max_length=100)
    postal_code: str = Field(..., max_length=20)
    country: str = Field(default="PH", max_length=2)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_default: bool = False
    notes: str | None = None


class AddressUpdate(BaseModel):
    label: str | None = Field(default=None, max_length=50)
    line_1: str | None = Field(default=None, max_length=255)
    line_2: str | None = Field(default=None, max_length=255)
    city: str | None = Field(default=None, max_length=100)
    province: str | None = Field(default=None, max_length=100)
    postal_code: str | None = Field(default=None, max_length=20)
    country: str | None = Field(default=None, max_length=2)
    latitude: Decimal | None = None
    longitude: Decimal | None = None
    is_default: bool | None = None
    notes: str | None = None


class AddressResponse(IDTimestampSchema):
    tenant_id: UUID
    user_id: UUID
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


# ── Delivery Slot ───────────────────────────────────────────────────────


class DeliverySlotCreate(BaseModel):
    day_of_week: int = Field(..., ge=0, le=6)
    start_time: time
    end_time: time
    capacity: int = Field(..., ge=1)
    is_active: bool = True


class DeliverySlotResponse(BaseSchema):
    id: UUID
    zone_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    capacity: int
    is_active: bool


class DeliverySlotAvailability(BaseSchema):
    id: UUID
    zone_id: UUID
    day_of_week: int
    start_time: time
    end_time: time
    capacity: int
    booked: int
    available: int


# ── Delivery Zone ───────────────────────────────────────────────────────


class DeliveryZoneCreate(BaseModel):
    name: str = Field(..., max_length=100)
    description: str | None = None
    delivery_fee: Decimal = Field(..., decimal_places=2)
    min_order_amount: Decimal | None = None
    boundaries: dict | None = None
    cutoff_hours: int = Field(default=24, ge=0)
    is_active: bool = True
    slots: list[DeliverySlotCreate] | None = None


class DeliveryZoneResponse(IDTimestampSchema):
    tenant_id: UUID
    name: str
    description: str | None = None
    delivery_fee: Decimal
    min_order_amount: Decimal | None = None
    boundaries: dict | None = None
    cutoff_hours: int
    is_active: bool
    slots: list[DeliverySlotResponse] = []


# ── Fulfillment Order ──────────────────────────────────────────────────


class FulfillmentCreate(BaseModel):
    order_id: UUID
    address_id: UUID | None = None
    delivery_slot_id: UUID | None = None
    fulfillment_type: str = Field(..., pattern="^(delivery|pickup)$")
    scheduled_date: date
    tracking_number: str | None = Field(default=None, max_length=100)
    driver_notes: str | None = None
    metadata_: dict | None = None


class FulfillmentResponse(IDTimestampSchema):
    tenant_id: UUID
    order_id: UUID
    address_id: UUID | None = None
    delivery_slot_id: UUID | None = None
    fulfillment_type: str
    status: str
    scheduled_date: date
    shipped_at: datetime | None = None
    delivered_at: datetime | None = None
    tracking_number: str | None = None
    driver_notes: str | None = None
    address: AddressResponse | None = None
    slot: DeliverySlotResponse | None = None


class FulfillmentStatusUpdate(BaseModel):
    status: str
    tracking_number: str | None = Field(default=None, max_length=100)
    driver_notes: str | None = None


# ── Production Report ──────────────────────────────────────────────────


class ProductionReportItem(BaseSchema):
    product_name: str
    variant_name: str
    total_quantity: int


class ProductionReportResponse(BaseSchema):
    date: date
    total_meals: int
    total_orders: int
    items: list[ProductionReportItem] = []
