"""Subscription Engine SQLAlchemy models."""

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.models import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

# ── Enums ───────────────────────────────────────────────────────────────


class BillingInterval(str, enum.Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


class SubscriptionStatus(str, enum.Enum):
    created = "created"
    active = "active"
    paused = "paused"
    pending_cancel = "pending_cancel"
    cancelled = "cancelled"


class CycleStatus(str, enum.Enum):
    upcoming = "upcoming"
    selection_open = "selection_open"
    selections_locked = "selections_locked"
    order_created = "order_created"
    completed = "completed"
    skipped = "skipped"


class SubscriptionEventType(str, enum.Enum):
    created = "created"
    activated = "activated"
    paused = "paused"
    resumed = "resumed"
    modified = "modified"
    cancelled = "cancelled"
    renewed = "renewed"
    skipped = "skipped"


# ── Models ──────────────────────────────────────────────────────────────


class SubscriptionPlan(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "subscription_plans"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    billing_interval: Mapped[BillingInterval] = mapped_column(
        Enum(BillingInterval, name="billing_interval_enum"), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    # Relationships
    tiers: Mapped[list["SubscriptionPlanTier"]] = relationship(
        "SubscriptionPlanTier",
        back_populates="plan",
        lazy="selectin",
        order_by="SubscriptionPlanTier.sort_order",
    )


class SubscriptionPlanTier(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "subscription_plan_tiers"

    plan_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("subscription_plans.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    items_per_cycle: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    compare_at_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    plan: Mapped["SubscriptionPlan"] = relationship(
        "SubscriptionPlan", back_populates="tiers"
    )


class Subscription(Base, UUIDPrimaryKeyMixin, TimestampMixin, TenantMixin):
    __tablename__ = "subscriptions"

    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    plan_tier_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_plan_tiers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    status: Mapped[SubscriptionStatus] = mapped_column(
        Enum(SubscriptionStatus, name="subscription_status_enum"),
        default=SubscriptionStatus.created,
        nullable=False,
    )
    current_cycle_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    current_cycle_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    next_billing_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    paused_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    pause_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancelled_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cancellation_reason: Mapped[str | None] = mapped_column(String(500), nullable=True)
    payment_method_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    # Relationships
    plan_tier: Mapped["SubscriptionPlanTier"] = relationship(
        "SubscriptionPlanTier", lazy="selectin"
    )
    cycles: Mapped[list["SubscriptionCycle"]] = relationship(
        "SubscriptionCycle",
        back_populates="subscription",
        lazy="selectin",
        order_by="SubscriptionCycle.cycle_number",
    )
    events: Mapped[list["SubscriptionEvent"]] = relationship(
        "SubscriptionEvent",
        back_populates="subscription",
        lazy="noload",
        order_by="SubscriptionEvent.created_at.desc()",
    )


class SubscriptionCycle(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    __tablename__ = "subscription_cycles"

    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
    )
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    selection_deadline: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[CycleStatus] = mapped_column(
        Enum(CycleStatus, name="cycle_status_enum"),
        default=CycleStatus.upcoming,
        nullable=False,
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    billed_amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    # Relationships
    subscription: Mapped["Subscription"] = relationship(
        "Subscription", back_populates="cycles"
    )
    selections: Mapped[list["SubscriptionSelection"]] = relationship(
        "SubscriptionSelection",
        back_populates="cycle",
        lazy="selectin",
    )


class SubscriptionSelection(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "subscription_selections"

    cycle_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscription_cycles.id", ondelete="CASCADE"),
        nullable=False,
    )
    product_variant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    customization: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    # Relationships
    cycle: Mapped["SubscriptionCycle"] = relationship(
        "SubscriptionCycle", back_populates="selections"
    )


class SubscriptionEvent(Base, UUIDPrimaryKeyMixin):
    __tablename__ = "subscription_events"

    subscription_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("subscriptions.id", ondelete="CASCADE"),
        nullable=False,
    )
    event_type: Mapped[SubscriptionEventType] = mapped_column(
        Enum(SubscriptionEventType, name="subscription_event_type_enum"), nullable=False
    )
    event_data: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # Relationships
    subscription: Mapped["Subscription"] = relationship(
        "Subscription", back_populates="events"
    )
