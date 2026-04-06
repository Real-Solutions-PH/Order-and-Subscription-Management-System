"""Repositories for the Subscription Engine module."""

from __future__ import annotations

from collections.abc import Sequence
from typing import Any
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.repo.base import BaseRepository
from app.repo.db import (
    CycleStatus,
    Subscription,
    SubscriptionCycle,
    SubscriptionEvent,
    SubscriptionEventType,
    SubscriptionPlan,
    SubscriptionSelection,
    SubscriptionStatus,
)


class SubscriptionPlanRepository(BaseRepository[SubscriptionPlan]):
    model = SubscriptionPlan

    async def get_active_plans(self, tenant_id: UUID | str) -> Sequence[SubscriptionPlan]:
        stmt = (
            select(self.model)
            .where(self.model.is_active.is_(True))
            .options(selectinload(self.model.tiers))
            .order_by(self.model.sort_order)
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_with_tiers(self, plan_id: UUID | str) -> SubscriptionPlan | None:
        stmt = select(self.model).where(self.model.id == plan_id).options(selectinload(self.model.tiers))
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class SubscriptionRepository(BaseRepository[Subscription]):
    model = Subscription

    async def get_by_user(self, user_id: UUID | str, tenant_id: UUID | str) -> Sequence[Subscription]:
        stmt = select(self.model).where(self.model.user_id == user_id).options(selectinload(self.model.plan_tier))
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_active_by_user(self, user_id: UUID | str, tenant_id: UUID | str) -> Sequence[Subscription]:
        stmt = (
            select(self.model)
            .where(
                self.model.user_id == user_id,
                self.model.status == SubscriptionStatus.active,
            )
            .options(selectinload(self.model.plan_tier))
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def count_active(self, tenant_id: UUID | str) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).select_from(self.model).where(self.model.status == SubscriptionStatus.active)
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one()


class SubscriptionCycleRepository(BaseRepository[SubscriptionCycle]):
    model = SubscriptionCycle

    async def get_upcoming(self, subscription_id: UUID | str) -> Sequence[SubscriptionCycle]:
        stmt = (
            select(self.model)
            .where(
                self.model.subscription_id == subscription_id,
                self.model.status == CycleStatus.upcoming,
            )
            .order_by(self.model.cycle_number)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_current(self, subscription_id: UUID | str) -> SubscriptionCycle | None:
        from sqlalchemy import func as sa_func

        now = sa_func.now()
        stmt = (
            select(self.model)
            .where(
                self.model.subscription_id == subscription_id,
                self.model.starts_at <= now,
                self.model.ends_at >= now,
            )
            .options(selectinload(self.model.selections))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class SubscriptionSelectionRepository(BaseRepository[SubscriptionSelection]):
    model = SubscriptionSelection

    async def get_by_cycle(self, cycle_id: UUID | str) -> Sequence[SubscriptionSelection]:
        stmt = select(self.model).where(self.model.cycle_id == cycle_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def set_selections(
        self,
        cycle_id: UUID | str,
        selections: list[dict[str, Any]],
    ) -> Sequence[SubscriptionSelection]:
        """Replace all selections for a cycle with the provided list."""
        # Delete existing selections
        existing = await self.get_by_cycle(cycle_id)
        for sel in existing:
            await self.session.delete(sel)
        await self.session.flush()

        # Create new selections
        created: list[SubscriptionSelection] = []
        for sel_data in selections:
            sel_data["cycle_id"] = cycle_id
            instance = self.model(**sel_data)
            self.session.add(instance)
            created.append(instance)

        await self.session.flush()
        for item in created:
            await self.session.refresh(item)
        return created


class SubscriptionEventRepository:
    """Lightweight repository for subscription events (append-only)."""

    def __init__(self, session: Any) -> None:
        self.session = session

    async def create_event(
        self,
        subscription_id: UUID | str,
        event_type: SubscriptionEventType,
        event_data: dict[str, Any] | None = None,
        actor_id: UUID | str | None = None,
    ) -> SubscriptionEvent:
        event = SubscriptionEvent(
            subscription_id=subscription_id,
            event_type=event_type,
            event_data=event_data,
            actor_id=actor_id,
        )
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event
