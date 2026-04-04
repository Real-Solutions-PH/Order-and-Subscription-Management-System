"""Fulfillment & Logistics schemas."""

from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal
from typing import Optional
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
    line_2: Optional[str] = None
    city: str
    province: str
    postal_code: str
    country: str = "PH"
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    is_default: bool = False
    notes: Optional[str] = None


class AddressUpdate(BaseModel):
    label: Optional[str] = None
    line_1: Optional[str] = None
    line_2: Optional[str] = None
    city: Optional[str] = None
    province: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    is_default: Optional[bool] = None
    notes: Optional[str] = None


class AddressResponse(BaseSchema):
    id: UUID
    label: str
    line_1: str
    line_2: Optional[str] = None
    city: str
    province: str
    postal_code: str
    country: str
    latitude: Optional[Decimal] = None
    longitude: Optional[Decimal] = None
    is_default: bool
    notes: Optional[str] = None


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
    description: Optional[str] = None
    delivery_fee: Decimal
    min_order_amount: Optional[Decimal] = None
    boundaries: dict
    cutoff_hours: int


class DeliveryZoneResponse(BaseSchema):
    id: UUID
    name: str
    description: Optional[str] = None
    delivery_fee: Decimal
    min_order_amount: Optional[Decimal] = None
    boundaries: Optional[dict] = None
    cutoff_hours: int
    is_active: bool
    slots: Optional[list[DeliverySlotResponse]] = None


# ---------------------------------------------------------------------------
# Fulfillment
# ---------------------------------------------------------------------------


class FulfillmentResponse(BaseSchema):
    id: UUID
    order_id: UUID
    fulfillment_type: FulfillmentType
    status: FulfillmentStatus
    scheduled_date: date
    shipped_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    tracking_number: Optional[str] = None


class FulfillmentStatusUpdate(BaseModel):
    status: FulfillmentStatus
    notes: Optional[str] = None


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
