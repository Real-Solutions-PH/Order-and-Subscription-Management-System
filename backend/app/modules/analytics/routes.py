"""Analytics & Reporting API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_analytics_service
from app.modules.analytics.schemas import (
    ChurnResponse,
    CohortResponse,
    DashboardResponse,
    MRRBreakdownResponse,
    PopularItemResponse,
)
from app.modules.analytics.services import AnalyticsService
from app.shared.auth import SuperUser

router = APIRouter(tags=["Analytics"])


# ── Dashboard ───────────────────────────────────────────────────────────


@router.get("/analytics/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    current_user: SuperUser,
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
):
    """Get high-level dashboard KPIs for the current tenant."""
    return await analytics_service.get_dashboard(current_user.tenant_id)


# ── MRR Breakdown ───────────────────────────────────────────────────────


@router.get("/analytics/mrr", response_model=MRRBreakdownResponse)
async def get_mrr_breakdown(
    current_user: SuperUser,
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
):
    """Get MRR broken down by subscription plan."""
    return await analytics_service.get_mrr_breakdown(current_user.tenant_id)


# ── Churn ───────────────────────────────────────────────────────────────


@router.get("/analytics/churn", response_model=ChurnResponse)
async def get_churn_data(
    current_user: SuperUser,
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
):
    """Get churn rate and cancellation reasons."""
    return await analytics_service.get_churn_data(current_user.tenant_id)


# ── Popular Items ───────────────────────────────────────────────────────


@router.get("/analytics/popular-items", response_model=PopularItemResponse)
async def get_popular_items(
    current_user: SuperUser,
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
    limit: int = Query(default=10, ge=1, le=100),
):
    """Get most popular items by order count."""
    return await analytics_service.get_popular_items(current_user.tenant_id, limit)


# ── Cohorts ─────────────────────────────────────────────────────────────


@router.get("/analytics/cohorts", response_model=CohortResponse)
async def get_cohort_data(
    current_user: SuperUser,
    analytics_service: Annotated[AnalyticsService, Depends(get_analytics_service)],
):
    """Get cohort retention and revenue data."""
    return await analytics_service.get_cohort_data(current_user.tenant_id)
