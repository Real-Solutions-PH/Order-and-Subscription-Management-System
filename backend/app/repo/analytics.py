"""Analytics repositories."""

from __future__ import annotations

from datetime import date
from uuid import UUID

from sqlalchemy import select

from app.repo.base import BaseRepository
from app.repo.db import CohortData, MetricSnapshot, PeriodType


class MetricSnapshotRepository(BaseRepository[MetricSnapshot]):
    """Repository for metric snapshots."""

    model = MetricSnapshot

    async def get_latest(
        self, tenant_id: UUID | str, metric_type: str
    ) -> MetricSnapshot | None:
        """Return the most recent snapshot for a given metric type."""
        stmt = (
            select(MetricSnapshot)
            .where(
                MetricSnapshot.tenant_id == tenant_id,
                MetricSnapshot.metric_type == metric_type,
            )
            .order_by(MetricSnapshot.period_start.desc())
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_range(
        self,
        tenant_id: UUID | str,
        metric_type: str,
        start: date,
        end: date,
        period_type: PeriodType,
    ) -> list[MetricSnapshot]:
        """Return snapshots for a metric in a date range and period type."""
        stmt = (
            select(MetricSnapshot)
            .where(
                MetricSnapshot.tenant_id == tenant_id,
                MetricSnapshot.metric_type == metric_type,
                MetricSnapshot.period_type == period_type,
                MetricSnapshot.period_start >= start,
                MetricSnapshot.period_start <= end,
            )
            .order_by(MetricSnapshot.period_start.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class CohortDataRepository(BaseRepository[CohortData]):
    """Repository for cohort analysis data."""

    model = CohortData

    async def get_by_cohort(
        self, tenant_id: UUID | str, cohort_month: date
    ) -> list[CohortData]:
        """Return all data points for a specific cohort month."""
        stmt = (
            select(CohortData)
            .where(
                CohortData.tenant_id == tenant_id,
                CohortData.cohort_month == cohort_month,
            )
            .order_by(CohortData.months_since_signup.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_all_cohorts(
        self, tenant_id: UUID | str
    ) -> list[CohortData]:
        """Return all cohort data for a tenant."""
        stmt = (
            select(CohortData)
            .where(CohortData.tenant_id == tenant_id)
            .order_by(
                CohortData.cohort_month.asc(),
                CohortData.months_since_signup.asc(),
            )
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
