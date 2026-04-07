"""Analytics & Reporting routes."""

from __future__ import annotations

from datetime import date
from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionChecker
from app.repo.session import get_app_db
from app.schemas.analytics import (
    ChurnData,
    CohortResponse,
    DashboardResponse,
    ExportRequest,
    MRRBreakdown,
    PopularItem,
)
from app.schemas.base import MessageResponse
from app.services.analytics import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    period: str = Query("monthly", description="Period type: daily, weekly, monthly"),
    current_user: dict[str, Any] = Depends(PermissionChecker(["analytics:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Get dashboard summary metrics (admin)."""
    service = AnalyticsService(session)
    return await service.get_dashboard(current_user["tenant_id"], period=period)


@router.get("/mrr", response_model=MRRBreakdown)
async def get_mrr(
    current_user: dict[str, Any] = Depends(PermissionChecker(["analytics:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Get MRR breakdown by plan (admin)."""
    service = AnalyticsService(session)
    return await service.get_mrr(current_user["tenant_id"])


@router.get("/churn", response_model=ChurnData)
async def get_churn(
    period_start: date = Query(..., description="Start of analysis period"),
    period_end: date = Query(..., description="End of analysis period"),
    current_user: dict[str, Any] = Depends(PermissionChecker(["analytics:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Get churn data for a period (admin)."""
    service = AnalyticsService(session)
    return await service.get_churn(current_user["tenant_id"], period_start, period_end)


@router.get("/popular-items", response_model=list[PopularItem])
async def get_popular_items(
    limit: int = Query(10, ge=1, le=100),
    current_user: dict[str, Any] = Depends(PermissionChecker(["analytics:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Get popular items ranked by order count (admin)."""
    service = AnalyticsService(session)
    return await service.get_popular_items(current_user["tenant_id"], limit=limit)


@router.get("/cohorts", response_model=list[CohortResponse])
async def get_cohorts(
    current_user: dict[str, Any] = Depends(PermissionChecker(["analytics:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Get cohort retention data (admin)."""
    service = AnalyticsService(session)
    return await service.get_cohorts(current_user["tenant_id"])


@router.get("/export", response_model=MessageResponse)
async def export_report(
    report_type: str = Query(..., description="Type of report to export"),
    period_start: date = Query(..., description="Start of report period"),
    period_end: date = Query(..., description="End of report period"),
    export_format: str = Query("csv", description="Export format: csv, xlsx", alias="format"),
    current_user: dict[str, Any] = Depends(PermissionChecker(["analytics:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Export a report (admin).

    TODO: Return actual file download instead of path stub.
    """
    service = AnalyticsService(session)
    data = ExportRequest(
        report_type=report_type,
        period_start=period_start,
        period_end=period_end,
        format=export_format,
    )
    file_path = await service.export_report(current_user["tenant_id"], data)
    return MessageResponse(message=f"Report generated: {file_path}")
