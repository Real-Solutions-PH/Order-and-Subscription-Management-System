"""Subscription Engine repository layer."""

from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.subscription_engine.models import (
    Subscription,
    SubscriptionCycle,
    SubscriptionEvent,
    SubscriptionPlan,
    SubscriptionPlanTier,
    SubscriptionSelection,
)


class SubscriptionPlanRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_tenant(
        self, tenant_id: UUID, active_only: bool = True
    ) -> list[SubscriptionPlan]:
        query = (
            select(SubscriptionPlan)
            .where(SubscriptionPlan.tenant_id == tenant_id)
            .order_by(SubscriptionPlan.sort_order)
        )
        if active_only:
            query = query.where(SubscriptionPlan.is_active.is_(True))
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def get_by_id(self, plan_id: UUID) -> SubscriptionPlan | None:
        result = await self.db.execute(
            select(SubscriptionPlan).where(SubscriptionPlan.id == plan_id)
        )
        return result.scalar_one_or_none()

    async def create(self, plan: SubscriptionPlan) -> SubscriptionPlan:
        self.db.add(plan)
        await self.db.flush()
        return plan

    async def add_tier(self, tier: SubscriptionPlanTier) -> SubscriptionPlanTier:
        self.db.add(tier)
        await self.db.flush()
        return tier

    async def get_tier_by_id(self, tier_id: UUID) -> SubscriptionPlanTier | None:
        result = await self.db.execute(
            select(SubscriptionPlanTier)
            .options(selectinload(SubscriptionPlanTier.plan))
            .where(SubscriptionPlanTier.id == tier_id)
        )
        return result.scalar_one_or_none()


class SubscriptionRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_id(self, sub_id: UUID) -> Subscription | None:
        result = await self.db.execute(
            select(Subscription)
            .options(selectinload(Subscription.plan_tier))
            .where(Subscription.id == sub_id)
        )
        return result.scalar_one_or_none()

    async def get_by_user(
        self, user_id: UUID, tenant_id: UUID
    ) -> list[Subscription]:
        result = await self.db.execute(
            select(Subscription)
            .options(selectinload(Subscription.plan_tier))
            .where(
                Subscription.user_id == user_id,
                Subscription.tenant_id == tenant_id,
            )
            .order_by(Subscription.created_at.desc())
        )
        return list(result.scalars().all())

    async def create(self, sub: Subscription) -> Subscription:
        self.db.add(sub)
        await self.db.flush()
        return sub

    async def update(self, sub_id: UUID, **kwargs) -> Subscription | None:
        await self.db.execute(
            update(Subscription).where(Subscription.id == sub_id).values(**kwargs)
        )
        return await self.get_by_id(sub_id)

    # ── Cycles ──────────────────────────────────────────────────────────

    async def list_cycles(self, sub_id: UUID) -> list[SubscriptionCycle]:
        result = await self.db.execute(
            select(SubscriptionCycle)
            .where(SubscriptionCycle.subscription_id == sub_id)
            .order_by(SubscriptionCycle.cycle_number)
        )
        return list(result.scalars().all())

    async def get_cycle(self, cycle_id: UUID) -> SubscriptionCycle | None:
        result = await self.db.execute(
            select(SubscriptionCycle)
            .options(selectinload(SubscriptionCycle.selections))
            .where(SubscriptionCycle.id == cycle_id)
        )
        return result.scalar_one_or_none()

    async def create_cycle(self, cycle: SubscriptionCycle) -> SubscriptionCycle:
        self.db.add(cycle)
        await self.db.flush()
        return cycle

    async def update_cycle(self, cycle_id: UUID, **kwargs) -> SubscriptionCycle | None:
        await self.db.execute(
            update(SubscriptionCycle)
            .where(SubscriptionCycle.id == cycle_id)
            .values(**kwargs)
        )
        return await self.get_cycle(cycle_id)

    # ── Selections ──────────────────────────────────────────────────────

    async def create_selection(
        self, selection: SubscriptionSelection
    ) -> SubscriptionSelection:
        self.db.add(selection)
        await self.db.flush()
        return selection

    async def delete_selections_for_cycle(self, cycle_id: UUID) -> None:
        result = await self.db.execute(
            select(SubscriptionSelection).where(
                SubscriptionSelection.cycle_id == cycle_id
            )
        )
        for sel in result.scalars().all():
            await self.db.delete(sel)
        await self.db.flush()

    # ── Events ──────────────────────────────────────────────────────────

    async def create_event(self, event: SubscriptionEvent) -> SubscriptionEvent:
        self.db.add(event)
        await self.db.flush()
        return event
