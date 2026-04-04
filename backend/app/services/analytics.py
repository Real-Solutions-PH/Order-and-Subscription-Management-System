"""Analytics & Reporting service."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repo.analytics import CohortDataRepository, MetricSnapshotRepository
from app.repo.db import (
    CohortData,
    Order,
    OrderItem,
    OrderStatus,
    Subscription,
    SubscriptionPlan,
    SubscriptionPlanTier,
    SubscriptionStatus,
)
from app.schemas.analytics import (
    ChurnData,
    ChurnReason,
    CohortResponse,
    DashboardResponse,
    ExportRequest,
    MRRBreakdown,
    PlanMRR,
    PopularItem,
)


class AnalyticsService:
    """Business logic for analytics dashboards and reporting."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.metric_repo = MetricSnapshotRepository(session)
        self.cohort_repo = CohortDataRepository(session)

    async def get_dashboard(self, tenant_id: UUID | str, period: str = "monthly") -> DashboardResponse:
        """Aggregate metrics for the dashboard summary."""
        # Total revenue from paid orders
        revenue_stmt = select(func.coalesce(func.sum(Order.total), 0)).where(
            Order.tenant_id == tenant_id,
            Order.status.in_(
                [
                    OrderStatus.confirmed,
                    OrderStatus.processing,
                    OrderStatus.ready,
                    OrderStatus.delivered,
                    OrderStatus.picked_up,
                ]
            ),
        )
        revenue_result = await self.session.execute(revenue_stmt)
        total_revenue = revenue_result.scalar_one() or Decimal("0")

        # Total orders
        order_count_stmt = select(func.count()).select_from(Order).where(Order.tenant_id == tenant_id)
        order_result = await self.session.execute(order_count_stmt)
        total_orders = order_result.scalar_one()

        # Active subscribers
        sub_count_stmt = (
            select(func.count())
            .select_from(Subscription)
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.active,
            )
        )
        sub_result = await self.session.execute(sub_count_stmt)
        active_subscribers = sub_result.scalar_one()

        # MRR from active subscriptions
        mrr_stmt = (
            select(func.coalesce(func.sum(SubscriptionPlanTier.price), 0))
            .join(
                Subscription,
                Subscription.plan_tier_id == SubscriptionPlanTier.id,
            )
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.active,
            )
        )
        mrr_result = await self.session.execute(mrr_stmt)
        mrr = mrr_result.scalar_one() or Decimal("0")

        # Churn rate (cancelled / (active + cancelled) over period)
        cancelled_stmt = (
            select(func.count())
            .select_from(Subscription)
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.cancelled,
            )
        )
        cancelled_result = await self.session.execute(cancelled_stmt)
        total_cancelled = cancelled_result.scalar_one()

        total_subs = active_subscribers + total_cancelled
        churn_rate = (total_cancelled / total_subs * 100) if total_subs > 0 else 0.0

        # AOV
        aov = Decimal(str(total_revenue / total_orders)) if total_orders > 0 else Decimal("0")

        return DashboardResponse(
            total_revenue=total_revenue,
            total_orders=total_orders,
            active_subscribers=active_subscribers,
            mrr=mrr,
            churn_rate=round(churn_rate, 2),
            aov=round(aov, 2),
            period=period,
        )

    async def get_mrr(self, tenant_id: UUID | str) -> MRRBreakdown:
        """Calculate MRR breakdown by plan from active subscriptions."""
        stmt = (
            select(
                SubscriptionPlan.name.label("plan_name"),
                func.sum(SubscriptionPlanTier.price).label("plan_mrr"),
                func.count(Subscription.id).label("sub_count"),
            )
            .join(
                Subscription,
                Subscription.plan_tier_id == SubscriptionPlanTier.id,
            )
            .join(
                SubscriptionPlan,
                SubscriptionPlan.id == SubscriptionPlanTier.plan_id,
            )
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .group_by(SubscriptionPlan.name)
        )
        result = await self.session.execute(stmt)

        by_plan: list[PlanMRR] = []
        total = Decimal("0")
        for row in result.all():
            plan_mrr = row.plan_mrr or Decimal("0")
            total += plan_mrr
            by_plan.append(
                PlanMRR(
                    plan_name=row.plan_name,
                    mrr=plan_mrr,
                    subscriber_count=row.sub_count,
                )
            )

        return MRRBreakdown(total=total, by_plan=by_plan)

    async def get_churn(self, tenant_id: UUID | str, period_start: date, period_end: date) -> ChurnData:
        """Calculate churn metrics for a period."""
        # Cancelled subscriptions in the period
        cancelled_stmt = (
            select(
                Subscription.cancellation_reason,
                func.count().label("cnt"),
            )
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.cancelled,
                Subscription.cancelled_at.isnot(None),
                func.date(Subscription.cancelled_at) >= period_start,
                func.date(Subscription.cancelled_at) <= period_end,
            )
            .group_by(Subscription.cancellation_reason)
        )
        result = await self.session.execute(cancelled_stmt)
        rows = result.all()

        total_cancelled = sum(r.cnt for r in rows)

        # Active at start of period (approximate)
        active_stmt = (
            select(func.count())
            .select_from(Subscription)
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status.in_(
                    [
                        SubscriptionStatus.active,
                        SubscriptionStatus.cancelled,
                    ]
                ),
            )
        )
        active_result = await self.session.execute(active_stmt)
        total_base = active_result.scalar_one()

        rate = (total_cancelled / total_base * 100) if total_base > 0 else 0.0

        reasons: list[ChurnReason] = []
        for row in rows:
            reason_text = row.cancellation_reason or "Not specified"
            pct = (row.cnt / total_cancelled * 100) if total_cancelled > 0 else 0.0
            reasons.append(
                ChurnReason(
                    reason=reason_text,
                    count=row.cnt,
                    percentage=round(pct, 2),
                )
            )

        return ChurnData(
            rate=round(rate, 2),
            total_cancelled=total_cancelled,
            reasons=reasons,
        )

    async def get_popular_items(self, tenant_id: UUID | str, limit: int = 10) -> list[PopularItem]:
        """Get popular items ranked by order count."""
        stmt = (
            select(
                OrderItem.product_name,
                OrderItem.variant_name,
                func.count(OrderItem.id).label("order_count"),
                func.sum(OrderItem.total_price).label("revenue"),
            )
            .join(Order, Order.id == OrderItem.order_id)
            .where(Order.tenant_id == tenant_id)
            .group_by(OrderItem.product_name, OrderItem.variant_name)
            .order_by(func.count(OrderItem.id).desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)

        return [
            PopularItem(
                product_name=row.product_name,
                variant_name=row.variant_name,
                order_count=row.order_count,
                revenue=row.revenue or Decimal("0"),
            )
            for row in result.all()
        ]

    async def get_cohorts(self, tenant_id: UUID | str) -> list[CohortResponse]:
        """Get cohort retention data."""
        cohort_rows = await self.cohort_repo.get_all_cohorts(tenant_id)
        return [
            CohortResponse(
                cohort_month=row.cohort_month,
                months_since_signup=row.months_since_signup,
                total_users=row.total_users,
                active_users=row.active_users,
                retention_rate=(round(row.active_users / row.total_users * 100, 2) if row.total_users > 0 else 0.0),
                revenue=row.revenue,
            )
            for row in cohort_rows
        ]

    async def export_report(self, tenant_id: UUID | str, data: ExportRequest) -> str:
        """Generate an export file and return the file path.

        TODO: Implement actual report generation (CSV/Excel export).
        Currently returns a stub file path.
        """
        # TODO: Generate actual report file
        return f"/tmp/reports/{tenant_id}_{data.report_type}_{data.period_start}_{data.period_end}.{data.format}"
