"""Analytics & Reporting domain models."""

import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import Date, DateTime, Enum, Integer, Numeric, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.shared.models import Base, TenantMixin, UUIDPrimaryKeyMixin

# ── Enums ───────────────────────────────────────────────────────────────


class PeriodType(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


# ── Models ──────────────────────────────────────────────────────────────


class MetricSnapshot(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "metric_snapshots"

    metric_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
    period_type: Mapped[PeriodType] = mapped_column(
        Enum(PeriodType, name="period_type_enum", values_callable=lambda e: [x.value for x in e]),
        nullable=False,
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(14, 4), nullable=False)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)


class CohortData(Base, UUIDPrimaryKeyMixin, TenantMixin):
    __tablename__ = "cohort_data"

    cohort_month: Mapped[date] = mapped_column(Date, nullable=False)
    months_since_signup: Mapped[int] = mapped_column(Integer, nullable=False)
    total_users: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    active_users: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    revenue: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False, default=0)
