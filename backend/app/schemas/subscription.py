"""Schemas for the Subscription Engine module."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.repo.db import BillingInterval, CycleStatus, SubscriptionStatus
from app.schemas.base import BaseSchema


# ---------------------------------------------------------------------------
# Tier
# ---------------------------------------------------------------------------


class TierCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=100)
    items_per_cycle: int = Field(gt=0)
    price: Decimal = Field(ge=0)
    compare_at_price: Decimal | None = None


class TierResponse(BaseSchema):
    id: UUID
    name: str
    items_per_cycle: int
    price: Decimal
    compare_at_price: Decimal | None = None
    is_active: bool


# ---------------------------------------------------------------------------
# Plan
# ---------------------------------------------------------------------------


class PlanCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    billing_interval: BillingInterval
    tiers: list[TierCreate]


class PlanUpdate(BaseSchema):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class PlanResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    billing_interval: BillingInterval
    is_active: bool
    tiers: list[TierResponse] = []
    created_at: datetime


# ---------------------------------------------------------------------------
# Subscription
# ---------------------------------------------------------------------------


class SubscriptionCreate(BaseSchema):
    plan_tier_id: UUID
    payment_method_id: UUID | None = None


class SubscriptionResponse(BaseSchema):
    id: UUID
    user_id: UUID
    plan_tier: TierResponse
    status: SubscriptionStatus
    current_cycle_start: datetime
    current_cycle_end: datetime
    next_billing_date: datetime
    paused_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None
    created_at: datetime


class SubscriptionPauseRequest(BaseSchema):
    resume_date: datetime | None = None


class SubscriptionCancelRequest(BaseSchema):
    reason: str


class PlanModifyRequest(BaseSchema):
    new_plan_tier_id: UUID


# ---------------------------------------------------------------------------
# Cycle & Selection
# ---------------------------------------------------------------------------


class SelectionCreate(BaseSchema):
    product_variant_id: UUID
    quantity: int = 1
    customization: dict | None = None


class SelectionResponse(BaseSchema):
    id: UUID
    product_variant_id: UUID
    quantity: int
    customization: dict | None = None


class CycleResponse(BaseSchema):
    id: UUID
    cycle_number: int
    starts_at: datetime
    ends_at: datetime
    selection_deadline: datetime
    status: CycleStatus
    selections: list[SelectionResponse] | None = None
