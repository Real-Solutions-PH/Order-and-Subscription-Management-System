"""Subscription Engine Pydantic schemas."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

# ── Subscription Plan Tier Schemas ──────────────────────────────────────


class SubscriptionPlanTierCreate(BaseModel):
    name: str = Field(..., max_length=100)
    items_per_cycle: int = Field(..., gt=0)
    price: Decimal = Field(..., ge=0, decimal_places=2)
    compare_at_price: Decimal | None = None
    is_active: bool = True
    sort_order: int = 0


class SubscriptionPlanTierSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    plan_id: UUID
    name: str
    items_per_cycle: int
    price: Decimal
    compare_at_price: Decimal | None = None
    is_active: bool
    sort_order: int


# ── Subscription Plan Schemas ───────────────────────────────────────────


class SubscriptionPlanCreate(BaseModel):
    name: str = Field(..., max_length=255)
    slug: str = Field(..., max_length=255)
    description: str | None = None
    billing_interval: str = Field(..., pattern="^(weekly|biweekly|monthly)$")
    is_active: bool = True
    sort_order: int = 0
    metadata_: dict | None = Field(None, alias="metadata")
    tiers: list[SubscriptionPlanTierCreate] = []


class SubscriptionPlanResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    slug: str
    description: str | None = None
    billing_interval: str
    is_active: bool
    sort_order: int
    metadata_: dict | None = Field(None, alias="metadata")
    tiers: list[SubscriptionPlanTierSchema] = []
    created_at: datetime
    updated_at: datetime


# ── Subscription Schemas ────────────────────────────────────────────────


class SubscriptionCreate(BaseModel):
    plan_tier_id: UUID
    payment_method_id: UUID | None = None


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    user_id: UUID
    plan_tier_id: UUID
    status: str
    current_cycle_start: datetime
    current_cycle_end: datetime
    next_billing_date: datetime
    paused_at: datetime | None = None
    pause_expires_at: datetime | None = None
    cancelled_at: datetime | None = None
    cancellation_reason: str | None = None
    payment_method_id: UUID | None = None
    metadata_: dict | None = Field(None, alias="metadata")
    created_at: datetime
    updated_at: datetime


# ── Subscription Action Schemas ─────────────────────────────────────────


class SubscriptionPauseRequest(BaseModel):
    resume_date: datetime | None = None


class SubscriptionCancelRequest(BaseModel):
    reason: str = Field(..., max_length=500)


class PlanModifyRequest(BaseModel):
    new_plan_tier_id: UUID


# ── Cycle / Selection Schemas ───────────────────────────────────────────


class SelectionItem(BaseModel):
    product_variant_id: UUID
    quantity: int = Field(1, ge=1)


class SelectionCreate(BaseModel):
    items: list[SelectionItem] = Field(..., min_length=1)


class SelectionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    cycle_id: UUID
    product_variant_id: UUID
    quantity: int
    customization: dict | None = None


class CycleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    subscription_id: UUID
    cycle_number: int
    starts_at: datetime
    ends_at: datetime
    selection_deadline: datetime
    status: str
    order_id: UUID | None = None
    billed_amount: Decimal | None = None
    selections: list[SelectionResponse] = []
    created_at: datetime
    updated_at: datetime
