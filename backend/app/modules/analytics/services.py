"""Analytics & Reporting business logic."""

import uuid

from app.modules.analytics.repo import AnalyticsRepo


class AnalyticsService:
    def __init__(self, analytics_repo: AnalyticsRepo) -> None:
        self.analytics_repo = analytics_repo

    async def get_dashboard(self, tenant_id: uuid.UUID) -> dict:
        return await self.analytics_repo.get_dashboard_metrics(tenant_id)

    async def get_mrr_breakdown(self, tenant_id: uuid.UUID) -> dict:
        return await self.analytics_repo.get_mrr_breakdown(tenant_id)

    async def get_churn_data(self, tenant_id: uuid.UUID) -> dict:
        return await self.analytics_repo.get_churn_data(tenant_id)

    async def get_popular_items(self, tenant_id: uuid.UUID, limit: int = 10) -> dict:
        items = await self.analytics_repo.get_popular_items(tenant_id, limit)
        return {"items": items}

    async def get_cohort_data(self, tenant_id: uuid.UUID) -> dict:
        cohorts = await self.analytics_repo.get_cohort_data(tenant_id)
        return {"cohorts": cohorts}
