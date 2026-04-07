"""Analytics & Reporting schemas."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

# ---------------------------------------------------------------------------
# Dashboard
# ---------------------------------------------------------------------------


class DashboardResponse(BaseModel):
    total_revenue: Decimal
    total_orders: int
    active_subscribers: int
    mrr: Decimal
    churn_rate: float
    aov: Decimal
    period: str

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# MRR
# ---------------------------------------------------------------------------


class PlanMRR(BaseModel):
    plan_name: str
    mrr: Decimal
    subscriber_count: int

    model_config = ConfigDict(from_attributes=True)


class MRRBreakdown(BaseModel):
    total: Decimal
    by_plan: list[PlanMRR]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Popular Items
# ---------------------------------------------------------------------------


class PopularItem(BaseModel):
    product_name: str
    variant_name: str
    order_count: int
    revenue: Decimal

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Churn
# ---------------------------------------------------------------------------


class ChurnReason(BaseModel):
    reason: str
    count: int
    percentage: float

    model_config = ConfigDict(from_attributes=True)


class ChurnData(BaseModel):
    rate: float
    total_cancelled: int
    reasons: list[ChurnReason]

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Cohort
# ---------------------------------------------------------------------------


class CohortResponse(BaseModel):
    cohort_month: date
    months_since_signup: int
    total_users: int
    active_users: int
    retention_rate: float
    revenue: Decimal

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Export
# ---------------------------------------------------------------------------


class ExportRequest(BaseModel):
    report_type: str
    period_start: date
    period_end: date
    format: str = "csv"
