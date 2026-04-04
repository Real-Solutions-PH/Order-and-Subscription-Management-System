"""Services for the Subscription Engine module."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import RedisCache
from app.core.events import get_event_bus
from app.core.exceptions import BadRequestException, NotFoundException
from app.repo.db import (
    BillingInterval,
    CycleStatus,
    Subscription,
    SubscriptionCycle,
    SubscriptionEventType,
    SubscriptionPlan,
    SubscriptionPlanTier,
    SubscriptionSelection,
    SubscriptionStatus,
)
from app.repo.subscription import (
    SubscriptionCycleRepository,
    SubscriptionEventRepository,
    SubscriptionPlanRepository,
    SubscriptionRepository,
    SubscriptionSelectionRepository,
)
from app.schemas.subscription import (
    PlanCreate,
    PlanModifyRequest,
    SelectionCreate,
    SubscriptionCancelRequest,
    SubscriptionCreate,
    SubscriptionPauseRequest,
)
from app.utils.slug import generate_slug


def _cycle_end(start: datetime, interval: BillingInterval) -> datetime:
    """Calculate the end date of a billing cycle."""
    if interval == BillingInterval.weekly:
        return start + timedelta(weeks=1)
    if interval == BillingInterval.biweekly:
        return start + timedelta(weeks=2)
    # monthly
    return start + timedelta(days=30)


class SubscriptionService:
    """Domain logic for subscriptions, cycles, and selections."""

    def __init__(
        self,
        session: AsyncSession,
        cache: RedisCache | None = None,
    ) -> None:
        self.session = session
        self.cache = cache
        self.plan_repo = SubscriptionPlanRepository(session)
        self.sub_repo = SubscriptionRepository(session)
        self.cycle_repo = SubscriptionCycleRepository(session)
        self.selection_repo = SubscriptionSelectionRepository(session)
        self.event_repo = SubscriptionEventRepository(session)

    # ------------------------------------------------------------------
    # Plans
    # ------------------------------------------------------------------

    async def create_plan(
        self, tenant_id: UUID | str, data: PlanCreate
    ) -> SubscriptionPlan:
        slug = generate_slug(data.name)
        plan = await self.plan_repo.create(
            {
                "tenant_id": tenant_id,
                "name": data.name,
                "slug": slug,
                "description": data.description,
                "billing_interval": data.billing_interval,
            }
        )

        # Create tiers
        for tier_data in data.tiers:
            tier = SubscriptionPlanTier(
                plan_id=plan.id,
                name=tier_data.name,
                items_per_cycle=tier_data.items_per_cycle,
                price=tier_data.price,
                compare_at_price=tier_data.compare_at_price,
            )
            self.session.add(tier)

        await self.session.flush()
        return await self.plan_repo.get_with_tiers(plan.id)  # type: ignore[return-value]

    async def list_plans(
        self, tenant_id: UUID | str
    ) -> Sequence[SubscriptionPlan]:
        return await self.plan_repo.get_active_plans(tenant_id)

    # ------------------------------------------------------------------
    # Subscriptions
    # ------------------------------------------------------------------

    async def create_subscription(
        self,
        tenant_id: UUID | str,
        user_id: UUID | str,
        data: SubscriptionCreate,
    ) -> Subscription:
        # Validate tier exists
        from sqlalchemy import select

        stmt = select(SubscriptionPlanTier).where(
            SubscriptionPlanTier.id == data.plan_tier_id
        )
        result = await self.session.execute(stmt)
        tier = result.scalar_one_or_none()
        if tier is None:
            raise NotFoundException("Subscription plan tier", str(data.plan_tier_id))

        plan = await self.plan_repo.get_by_id(tier.plan_id)
        if plan is None:
            raise NotFoundException("Subscription plan")

        now = datetime.now(timezone.utc)
        cycle_end = _cycle_end(now, plan.billing_interval)

        subscription = await self.sub_repo.create(
            {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "plan_tier_id": data.plan_tier_id,
                "status": SubscriptionStatus.active,
                "current_cycle_start": now,
                "current_cycle_end": cycle_end,
                "next_billing_date": cycle_end,
                "payment_method_id": data.payment_method_id,
            }
        )

        # Generate first cycle
        selection_deadline = cycle_end - timedelta(days=2)
        cycle = SubscriptionCycle(
            subscription_id=subscription.id,
            cycle_number=1,
            starts_at=now,
            ends_at=cycle_end,
            selection_deadline=selection_deadline,
            status=CycleStatus.selection_open,
        )
        self.session.add(cycle)
        await self.session.flush()

        # Record event
        await self.event_repo.create_event(
            subscription_id=subscription.id,
            event_type=SubscriptionEventType.created,
            event_data={"plan_tier_id": str(data.plan_tier_id)},
            actor_id=user_id,
        )

        # Publish event
        event_bus = get_event_bus()
        await event_bus.publish(
            "subscription.created",
            {
                "subscription_id": str(subscription.id),
                "user_id": str(user_id),
                "tenant_id": str(tenant_id),
            },
        )

        return subscription

    async def get_subscription(
        self, subscription_id: UUID | str, tenant_id: UUID | str
    ) -> Subscription:
        sub = await self.sub_repo.get_by_id(subscription_id, tenant_id=tenant_id)
        if sub is None:
            raise NotFoundException("Subscription", str(subscription_id))
        return sub

    async def list_user_subscriptions(
        self, user_id: UUID | str, tenant_id: UUID | str
    ) -> Sequence[Subscription]:
        return await self.sub_repo.get_by_user(user_id, tenant_id)

    async def pause_subscription(
        self,
        subscription_id: UUID | str,
        tenant_id: UUID | str,
        data: SubscriptionPauseRequest,
        actor_id: UUID | str | None = None,
    ) -> Subscription:
        sub = await self.sub_repo.get_by_id(subscription_id, tenant_id=tenant_id)
        if sub is None:
            raise NotFoundException("Subscription", str(subscription_id))

        if sub.status != SubscriptionStatus.active:
            raise BadRequestException("Only active subscriptions can be paused")

        now = datetime.now(timezone.utc)
        update_data: dict[str, Any] = {
            "status": SubscriptionStatus.paused,
            "paused_at": now,
        }

        # Calculate pause_expires_at (default 30 days max)
        max_pause_days = 30
        if data.resume_date:
            pause_expires = data.resume_date
        else:
            pause_expires = now + timedelta(days=max_pause_days)
        update_data["pause_expires_at"] = pause_expires

        updated = await self.sub_repo.update(
            subscription_id, update_data, tenant_id=tenant_id
        )

        await self.event_repo.create_event(
            subscription_id=subscription_id,
            event_type=SubscriptionEventType.paused,
            event_data={"pause_expires_at": pause_expires.isoformat()},
            actor_id=actor_id,
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "subscription.paused",
            {"subscription_id": str(subscription_id), "tenant_id": str(tenant_id)},
        )

        return updated  # type: ignore[return-value]

    async def resume_subscription(
        self,
        subscription_id: UUID | str,
        tenant_id: UUID | str,
        actor_id: UUID | str | None = None,
    ) -> Subscription:
        sub = await self.sub_repo.get_by_id(subscription_id, tenant_id=tenant_id)
        if sub is None:
            raise NotFoundException("Subscription", str(subscription_id))

        if sub.status != SubscriptionStatus.paused:
            raise BadRequestException("Only paused subscriptions can be resumed")

        updated = await self.sub_repo.update(
            subscription_id,
            {
                "status": SubscriptionStatus.active,
                "paused_at": None,
                "pause_expires_at": None,
            },
            tenant_id=tenant_id,
        )

        await self.event_repo.create_event(
            subscription_id=subscription_id,
            event_type=SubscriptionEventType.resumed,
            actor_id=actor_id,
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "subscription.resumed",
            {"subscription_id": str(subscription_id), "tenant_id": str(tenant_id)},
        )

        return updated  # type: ignore[return-value]

    async def cancel_subscription(
        self,
        subscription_id: UUID | str,
        tenant_id: UUID | str,
        data: SubscriptionCancelRequest,
        actor_id: UUID | str | None = None,
    ) -> Subscription:
        sub = await self.sub_repo.get_by_id(subscription_id, tenant_id=tenant_id)
        if sub is None:
            raise NotFoundException("Subscription", str(subscription_id))

        if sub.status in (
            SubscriptionStatus.cancelled,
            SubscriptionStatus.pending_cancel,
        ):
            raise BadRequestException("Subscription is already cancelled or pending cancellation")

        now = datetime.now(timezone.utc)
        updated = await self.sub_repo.update(
            subscription_id,
            {
                "status": SubscriptionStatus.pending_cancel,
                "cancelled_at": now,
                "cancellation_reason": data.reason,
            },
            tenant_id=tenant_id,
        )

        await self.event_repo.create_event(
            subscription_id=subscription_id,
            event_type=SubscriptionEventType.cancelled,
            event_data={"reason": data.reason},
            actor_id=actor_id,
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "subscription.cancelled",
            {"subscription_id": str(subscription_id), "tenant_id": str(tenant_id)},
        )

        return updated  # type: ignore[return-value]

    async def modify_plan(
        self,
        subscription_id: UUID | str,
        tenant_id: UUID | str,
        data: PlanModifyRequest,
        actor_id: UUID | str | None = None,
    ) -> Subscription:
        sub = await self.sub_repo.get_by_id(subscription_id, tenant_id=tenant_id)
        if sub is None:
            raise NotFoundException("Subscription", str(subscription_id))

        if sub.status not in (SubscriptionStatus.active, SubscriptionStatus.created):
            raise BadRequestException(
                "Plan can only be modified for active or created subscriptions"
            )

        # Validate new tier exists
        from sqlalchemy import select

        stmt = select(SubscriptionPlanTier).where(
            SubscriptionPlanTier.id == data.new_plan_tier_id
        )
        result = await self.session.execute(stmt)
        new_tier = result.scalar_one_or_none()
        if new_tier is None:
            raise NotFoundException("Subscription plan tier", str(data.new_plan_tier_id))

        old_tier_id = sub.plan_tier_id
        updated = await self.sub_repo.update(
            subscription_id,
            {"plan_tier_id": data.new_plan_tier_id},
            tenant_id=tenant_id,
        )

        await self.event_repo.create_event(
            subscription_id=subscription_id,
            event_type=SubscriptionEventType.modified,
            event_data={
                "old_plan_tier_id": str(old_tier_id),
                "new_plan_tier_id": str(data.new_plan_tier_id),
            },
            actor_id=actor_id,
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "subscription.modified",
            {"subscription_id": str(subscription_id), "tenant_id": str(tenant_id)},
        )

        return updated  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # Cycles
    # ------------------------------------------------------------------

    async def get_cycles(
        self, subscription_id: UUID | str, tenant_id: UUID | str
    ) -> Sequence[SubscriptionCycle]:
        # Verify subscription belongs to tenant
        sub = await self.sub_repo.get_by_id(subscription_id, tenant_id=tenant_id)
        if sub is None:
            raise NotFoundException("Subscription", str(subscription_id))

        from sqlalchemy import select

        stmt = (
            select(SubscriptionCycle)
            .where(SubscriptionCycle.subscription_id == subscription_id)
            .options(selectinload(SubscriptionCycle.selections))
            .order_by(SubscriptionCycle.cycle_number)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def skip_cycle(
        self,
        subscription_id: UUID | str,
        cycle_id: UUID | str,
        tenant_id: UUID | str,
        actor_id: UUID | str | None = None,
    ) -> SubscriptionCycle:
        sub = await self.sub_repo.get_by_id(subscription_id, tenant_id=tenant_id)
        if sub is None:
            raise NotFoundException("Subscription", str(subscription_id))

        cycle = await self.cycle_repo.get_by_id(cycle_id)
        if cycle is None or cycle.subscription_id != subscription_id:
            raise NotFoundException("Subscription cycle", str(cycle_id))

        if cycle.status not in (CycleStatus.upcoming, CycleStatus.selection_open):
            raise BadRequestException(
                "Only upcoming or selection-open cycles can be skipped"
            )

        cycle.status = CycleStatus.skipped
        await self.session.flush()
        await self.session.refresh(cycle)

        await self.event_repo.create_event(
            subscription_id=subscription_id,
            event_type=SubscriptionEventType.skipped,
            event_data={"cycle_id": str(cycle_id), "cycle_number": cycle.cycle_number},
            actor_id=actor_id,
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "subscription.cycle_skipped",
            {
                "subscription_id": str(subscription_id),
                "cycle_id": str(cycle_id),
                "tenant_id": str(tenant_id),
            },
        )

        return cycle

    # ------------------------------------------------------------------
    # Selections
    # ------------------------------------------------------------------

    async def set_selections(
        self,
        subscription_id: UUID | str,
        cycle_id: UUID | str,
        tenant_id: UUID | str,
        user_id: UUID | str,
        selections: list[SelectionCreate],
    ) -> Sequence[SubscriptionSelection]:
        sub = await self.sub_repo.get_by_id(subscription_id, tenant_id=tenant_id)
        if sub is None:
            raise NotFoundException("Subscription", str(subscription_id))

        cycle = await self.cycle_repo.get_by_id(cycle_id)
        if cycle is None or cycle.subscription_id != subscription_id:
            raise NotFoundException("Subscription cycle", str(cycle_id))

        if cycle.status not in (CycleStatus.upcoming, CycleStatus.selection_open):
            raise BadRequestException("Selections cannot be modified for this cycle")

        # Validate against items_per_cycle limit
        from sqlalchemy import select

        stmt = select(SubscriptionPlanTier).where(
            SubscriptionPlanTier.id == sub.plan_tier_id
        )
        result = await self.session.execute(stmt)
        tier = result.scalar_one_or_none()

        if tier:
            total_qty = sum(s.quantity for s in selections)
            if total_qty > tier.items_per_cycle:
                raise BadRequestException(
                    f"Total quantity ({total_qty}) exceeds the allowed "
                    f"items per cycle ({tier.items_per_cycle})"
                )

        # Save selections
        sel_dicts = [
            {
                "product_variant_id": s.product_variant_id,
                "quantity": s.quantity,
                "customization": s.customization,
            }
            for s in selections
        ]
        return await self.selection_repo.set_selections(cycle_id, sel_dicts)
