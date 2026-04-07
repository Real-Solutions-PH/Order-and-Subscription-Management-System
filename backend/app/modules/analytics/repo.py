"""Analytics & Reporting repository layer (SQLAlchemy 2.0 async)."""

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal

from sqlalchemy import case, cast, func, select, Date
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.analytics.models import CohortData, MetricSnapshot
from app.modules.order_management.models import Order, OrderItem, OrderStatus
from app.modules.subscription_engine.models import (
    Subscription,
    SubscriptionPlan,
    SubscriptionPlanTier,
    SubscriptionStatus,
)


class AnalyticsRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    # ── Dashboard ───────────────────────────────────────────────────────

    async def get_dashboard_metrics(self, tenant_id: uuid.UUID) -> dict:
        now = datetime.now(timezone.utc)
        today = now.date()
        month_start = today.replace(day=1)
        thirty_days_ago = now - timedelta(days=30)

        # Total orders this month & revenue
        order_stats_stmt = (
            select(
                func.count(Order.id).label("total_orders"),
                func.coalesce(func.sum(Order.total), 0).label("revenue"),
            )
            .where(
                Order.tenant_id == tenant_id,
                Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.REFUNDED]),
                cast(Order.placed_at, Date) >= month_start,
            )
        )
        order_result = await self.db.execute(order_stats_stmt)
        order_row = order_result.one()
        total_orders = order_row.total_orders
        revenue = Decimal(str(order_row.revenue))

        # Average order value
        aov = revenue / total_orders if total_orders > 0 else Decimal("0.00")

        # Active subscribers count
        active_subs_stmt = (
            select(func.count(Subscription.id))
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.active,
            )
        )
        active_subs_result = await self.db.execute(active_subs_stmt)
        active_subscribers = active_subs_result.scalar_one()

        # MRR: sum of tier prices for all active subscriptions
        mrr_stmt = (
            select(func.coalesce(func.sum(SubscriptionPlanTier.price), 0))
            .select_from(Subscription)
            .join(SubscriptionPlanTier, Subscription.plan_tier_id == SubscriptionPlanTier.id)
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.active,
            )
        )
        mrr_result = await self.db.execute(mrr_stmt)
        mrr = Decimal(str(mrr_result.scalar_one()))

        # Churn rate: cancelled in last 30 days / (active + cancelled in last 30 days)
        cancelled_stmt = (
            select(func.count(Subscription.id))
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.cancelled,
                Subscription.cancelled_at >= thirty_days_ago,
            )
        )
        cancelled_result = await self.db.execute(cancelled_stmt)
        cancelled_count = cancelled_result.scalar_one()

        denominator = active_subscribers + cancelled_count
        churn_rate = (
            Decimal(str(cancelled_count)) / Decimal(str(denominator)) * 100
            if denominator > 0
            else Decimal("0.00")
        )

        return {
            "revenue": revenue,
            "mrr": mrr,
            "total_orders": total_orders,
            "active_subscribers": active_subscribers,
            "churn_rate": churn_rate.quantize(Decimal("0.01")),
            "aov": aov.quantize(Decimal("0.01")),
        }

    # ── MRR Breakdown ───────────────────────────────────────────────────

    async def get_mrr_breakdown(self, tenant_id: uuid.UUID) -> dict:
        stmt = (
            select(
                SubscriptionPlan.name.label("plan_name"),
                func.sum(SubscriptionPlanTier.price).label("mrr"),
                func.count(Subscription.id).label("subscriber_count"),
            )
            .select_from(Subscription)
            .join(SubscriptionPlanTier, Subscription.plan_tier_id == SubscriptionPlanTier.id)
            .join(SubscriptionPlan, SubscriptionPlanTier.plan_id == SubscriptionPlan.id)
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.active,
            )
            .group_by(SubscriptionPlan.name)
            .order_by(func.sum(SubscriptionPlanTier.price).desc())
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        breakdown = [
            {
                "plan_name": row.plan_name,
                "mrr": Decimal(str(row.mrr)),
                "subscriber_count": row.subscriber_count,
            }
            for row in rows
        ]
        total_mrr = sum(item["mrr"] for item in breakdown)

        return {"total_mrr": total_mrr, "breakdown": breakdown}

    # ── Churn Data ──────────────────────────────────────────────────────

    async def get_churn_data(self, tenant_id: uuid.UUID) -> dict:
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        # Count active subscriptions for churn rate denominator
        active_stmt = (
            select(func.count(Subscription.id))
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.active,
            )
        )
        active_result = await self.db.execute(active_stmt)
        active_count = active_result.scalar_one()

        # Cancelled in last 30 days grouped by reason
        reason_stmt = (
            select(
                func.coalesce(Subscription.cancellation_reason, "No reason provided").label("reason"),
                func.count(Subscription.id).label("count"),
            )
            .where(
                Subscription.tenant_id == tenant_id,
                Subscription.status == SubscriptionStatus.cancelled,
                Subscription.cancelled_at >= thirty_days_ago,
            )
            .group_by(func.coalesce(Subscription.cancellation_reason, "No reason provided"))
            .order_by(func.count(Subscription.id).desc())
        )
        reason_result = await self.db.execute(reason_stmt)
        reason_rows = reason_result.all()

        total_cancelled = sum(row.count for row in reason_rows)
        denominator = active_count + total_cancelled
        churn_rate = (
            Decimal(str(total_cancelled)) / Decimal(str(denominator)) * 100
            if denominator > 0
            else Decimal("0.00")
        )

        reasons = [{"reason": row.reason, "count": row.count} for row in reason_rows]

        return {"churn_rate": churn_rate.quantize(Decimal("0.01")), "reasons": reasons}

    # ── Popular Items ───────────────────────────────────────────────────

    async def get_popular_items(self, tenant_id: uuid.UUID, limit: int = 10) -> list[dict]:
        stmt = (
            select(
                OrderItem.product_name,
                func.count(OrderItem.id).label("order_count"),
                func.sum(OrderItem.total_price).label("revenue"),
            )
            .select_from(OrderItem)
            .join(Order, OrderItem.order_id == Order.id)
            .where(
                Order.tenant_id == tenant_id,
                Order.status.notin_([OrderStatus.CANCELLED, OrderStatus.REFUNDED]),
            )
            .group_by(OrderItem.product_name)
            .order_by(func.count(OrderItem.id).desc())
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        rows = result.all()

        return [
            {
                "product_name": row.product_name,
                "order_count": row.order_count,
                "revenue": Decimal(str(row.revenue)),
            }
            for row in rows
        ]

    # ── Cohort Data ─────────────────────────────────────────────────────

    async def get_cohort_data(self, tenant_id: uuid.UUID) -> list[dict]:
        stmt = (
            select(CohortData)
            .where(CohortData.tenant_id == tenant_id)
            .order_by(CohortData.cohort_month, CohortData.months_since_signup)
        )
        result = await self.db.execute(stmt)
        rows = result.scalars().all()

        return [
            {
                "cohort_month": row.cohort_month,
                "months_since_signup": row.months_since_signup,
                "total_users": row.total_users,
                "active_users": row.active_users,
                "retention_rate": (
                    Decimal(str(row.active_users)) / Decimal(str(row.total_users)) * 100
                    if row.total_users > 0
                    else Decimal("0.00")
                ).quantize(Decimal("0.01")),
                "revenue": row.revenue,
            }
            for row in rows
        ]

    # ── Snapshot Persistence ────────────────────────────────────────────

    async def save_metric_snapshot(self, snapshot: MetricSnapshot) -> MetricSnapshot:
        self.db.add(snapshot)
        await self.db.flush()
        await self.db.refresh(snapshot)
        return snapshot
