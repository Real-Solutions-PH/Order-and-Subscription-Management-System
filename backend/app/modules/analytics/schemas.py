"""Analytics & Reporting Pydantic schemas."""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field

from app.shared.schemas import BaseSchema


# ── Dashboard ───────────────────────────────────────────────────────────


class DashboardResponse(BaseSchema):
    revenue: Decimal
    mrr: Decimal
    total_orders: int
    active_subscribers: int
    churn_rate: Decimal
    aov: Decimal
    trends: dict | None = None


# ── MRR Breakdown ───────────────────────────────────────────────────────


class MRRPlanBreakdown(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    plan_name: str
    mrr: Decimal
    subscriber_count: int


class MRRBreakdownResponse(BaseSchema):
    total_mrr: Decimal
    breakdown: list[MRRPlanBreakdown]


# ── Churn ───────────────────────────────────────────────────────────────


class ChurnReason(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    reason: str
    count: int


class ChurnResponse(BaseSchema):
    churn_rate: Decimal
    reasons: list[ChurnReason]


# ── Popular Items ───────────────────────────────────────────────────────


class PopularItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    product_name: str
    order_count: int
    revenue: Decimal


class PopularItemResponse(BaseSchema):
    items: list[PopularItem]


# ── Cohort ──────────────────────────────────────────────────────────────


class CohortEntry(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    cohort_month: date
    months_since_signup: int
    total_users: int
    active_users: int
    retention_rate: Decimal
    revenue: Decimal


class CohortResponse(BaseSchema):
    cohorts: list[CohortEntry]
