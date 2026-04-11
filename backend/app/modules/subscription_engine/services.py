"""Subscription Engine service layer."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from app.exceptions import BadRequestError, NotFoundError
from app.modules.subscription_engine.models import (
    BillingInterval,
    CycleStatus,
    Subscription,
    SubscriptionCycle,
    SubscriptionEvent,
    SubscriptionEventType,
    SubscriptionPlan,
    SubscriptionPlanTier,
    SubscriptionSelection,
    SubscriptionStatus,
)
from app.modules.subscription_engine.repo import SubscriptionPlanRepo, SubscriptionRepo
from app.modules.subscription_engine.schemas import (
    SelectionCreate,
    SubscriptionCancelRequest,
    SubscriptionCreate,
    SubscriptionPauseRequest,
    SubscriptionPlanCreate,
)

# Maximum pause duration in days
MAX_PAUSE_DAYS = 30


def _cycle_end(start: datetime, interval: BillingInterval) -> datetime:
    """Calculate cycle end based on billing interval."""
    if interval == BillingInterval.weekly:
        return start + timedelta(weeks=1)
    if interval == BillingInterval.biweekly:
        return start + timedelta(weeks=2)
    # monthly
    return start + timedelta(days=30)


def _selection_deadline(cycle_end: datetime) -> datetime:
    """Selection deadline is 2 days before cycle ends."""
    return cycle_end - timedelta(days=2)


class SubscriptionPlanService:
    def __init__(self, plan_repo: SubscriptionPlanRepo):
        self.plan_repo = plan_repo

    async def list_plans(self, tenant_id: UUID, active_only: bool = True) -> list[SubscriptionPlan]:
        return await self.plan_repo.list_by_tenant(tenant_id, active_only=active_only)

    async def create_plan(self, tenant_id: UUID, data: SubscriptionPlanCreate) -> SubscriptionPlan:
        plan = SubscriptionPlan(
            tenant_id=tenant_id,
            name=data.name,
            slug=data.slug,
            description=data.description,
            billing_interval=BillingInterval(data.billing_interval),
            is_active=data.is_active,
            sort_order=data.sort_order,
            metadata_=data.metadata_,
        )
        plan = await self.plan_repo.create(plan)

        for tier_data in data.tiers:
            tier = SubscriptionPlanTier(
                plan_id=plan.id,
                name=tier_data.name,
                items_per_cycle=tier_data.items_per_cycle,
                price=tier_data.price,
                compare_at_price=tier_data.compare_at_price,
                is_active=tier_data.is_active,
                sort_order=tier_data.sort_order,
            )
            await self.plan_repo.add_tier(tier)

        # Re-fetch to include tiers
        return await self.plan_repo.get_by_id(plan.id)


class SubscriptionService:
    def __init__(
        self,
        sub_repo: SubscriptionRepo,
        plan_repo: SubscriptionPlanRepo,
    ):
        self.sub_repo = sub_repo
        self.plan_repo = plan_repo

    # ── Create ──────────────────────────────────────────────────────────

    async def create_subscription(self, user_id: UUID, tenant_id: UUID, data: SubscriptionCreate) -> Subscription:
        tier = await self.plan_repo.get_tier_by_id(data.plan_tier_id)
        if not tier or not tier.is_active:
            raise NotFoundError("Subscription plan tier not found or inactive")

        plan = tier.plan
        if not plan or not plan.is_active:
            raise BadRequestError("Subscription plan is not active")

        now = datetime.now(timezone.utc)
        cycle_end = _cycle_end(now, plan.billing_interval)

        sub = Subscription(
            tenant_id=tenant_id,
            user_id=user_id,
            plan_tier_id=data.plan_tier_id,
            status=SubscriptionStatus.active,
            current_cycle_start=now,
            current_cycle_end=cycle_end,
            next_billing_date=cycle_end,
            payment_method_id=data.payment_method_id,
        )
        sub = await self.sub_repo.create(sub)

        # Create first cycle
        cycle = SubscriptionCycle(
            subscription_id=sub.id,
            cycle_number=1,
            starts_at=now,
            ends_at=cycle_end,
            selection_deadline=_selection_deadline(cycle_end),
            status=CycleStatus.selection_open,
        )
        await self.sub_repo.create_cycle(cycle)

        # Log creation event
        await self.sub_repo.create_event(
            SubscriptionEvent(
                subscription_id=sub.id,
                event_type=SubscriptionEventType.created,
                event_data={"plan_tier_id": str(data.plan_tier_id)},
                actor_id=user_id,
            )
        )

        return await self.sub_repo.get_by_id(sub.id)

    # ── Read ────────────────────────────────────────────────────────────

    async def get_subscription(self, sub_id: UUID) -> Subscription:
        sub = await self.sub_repo.get_by_id(sub_id)
        if not sub:
            raise NotFoundError("Subscription not found")
        return sub

    # ── Pause ───────────────────────────────────────────────────────────

    async def pause_subscription(self, sub_id: UUID, actor_id: UUID, data: SubscriptionPauseRequest) -> Subscription:
        sub = await self.sub_repo.get_by_id(sub_id)
        if not sub:
            raise NotFoundError("Subscription not found")
        if sub.status != SubscriptionStatus.active:
            raise BadRequestError("Only active subscriptions can be paused")

        now = datetime.now(timezone.utc)
        pause_expires_at = data.resume_date
        if pause_expires_at:
            max_allowed = now + timedelta(days=MAX_PAUSE_DAYS)
            if pause_expires_at > max_allowed:
                raise BadRequestError(f"Pause cannot exceed {MAX_PAUSE_DAYS} days")
        else:
            pause_expires_at = now + timedelta(days=MAX_PAUSE_DAYS)

        sub = await self.sub_repo.update(
            sub_id,
            status=SubscriptionStatus.paused,
            paused_at=now,
            pause_expires_at=pause_expires_at,
        )

        await self.sub_repo.create_event(
            SubscriptionEvent(
                subscription_id=sub_id,
                event_type=SubscriptionEventType.paused,
                event_data={
                    "paused_at": now.isoformat(),
                    "pause_expires_at": pause_expires_at.isoformat(),
                },
                actor_id=actor_id,
            )
        )

        return sub

    # ── Resume ──────────────────────────────────────────────────────────

    async def resume_subscription(self, sub_id: UUID, actor_id: UUID) -> Subscription:
        sub = await self.sub_repo.get_by_id(sub_id)
        if not sub:
            raise NotFoundError("Subscription not found")
        if sub.status != SubscriptionStatus.paused:
            raise BadRequestError("Only paused subscriptions can be resumed")

        now = datetime.now(timezone.utc)
        sub = await self.sub_repo.update(
            sub_id,
            status=SubscriptionStatus.active,
            paused_at=None,
            pause_expires_at=None,
        )

        await self.sub_repo.create_event(
            SubscriptionEvent(
                subscription_id=sub_id,
                event_type=SubscriptionEventType.resumed,
                event_data={"resumed_at": now.isoformat()},
                actor_id=actor_id,
            )
        )

        return sub

    # ── Cancel ──────────────────────────────────────────────────────────

    async def cancel_subscription(self, sub_id: UUID, actor_id: UUID, data: SubscriptionCancelRequest) -> Subscription:
        sub = await self.sub_repo.get_by_id(sub_id)
        if not sub:
            raise NotFoundError("Subscription not found")
        if sub.status in (SubscriptionStatus.cancelled, SubscriptionStatus.pending_cancel):
            raise BadRequestError("Subscription is already cancelled or pending cancellation")

        now = datetime.now(timezone.utc)
        sub = await self.sub_repo.update(
            sub_id,
            status=SubscriptionStatus.pending_cancel,
            cancelled_at=now,
            cancellation_reason=data.reason,
        )

        await self.sub_repo.create_event(
            SubscriptionEvent(
                subscription_id=sub_id,
                event_type=SubscriptionEventType.cancelled,
                event_data={
                    "reason": data.reason,
                    "cancelled_at": now.isoformat(),
                },
                actor_id=actor_id,
            )
        )

        return sub

    # ── Modify Plan ─────────────────────────────────────────────────────

    async def modify_plan(self, sub_id: UUID, actor_id: UUID, new_plan_tier_id: UUID) -> Subscription:
        sub = await self.sub_repo.get_by_id(sub_id)
        if not sub:
            raise NotFoundError("Subscription not found")
        if sub.status not in (SubscriptionStatus.active, SubscriptionStatus.created):
            raise BadRequestError("Subscription must be active to change plan")

        new_tier = await self.plan_repo.get_tier_by_id(new_plan_tier_id)
        if not new_tier or not new_tier.is_active:
            raise NotFoundError("Target plan tier not found or inactive")

        old_tier_id = sub.plan_tier_id
        sub = await self.sub_repo.update(sub_id, plan_tier_id=new_plan_tier_id)

        await self.sub_repo.create_event(
            SubscriptionEvent(
                subscription_id=sub_id,
                event_type=SubscriptionEventType.modified,
                event_data={
                    "old_plan_tier_id": str(old_tier_id),
                    "new_plan_tier_id": str(new_plan_tier_id),
                },
                actor_id=actor_id,
            )
        )

        return sub

    # ── Cycles ──────────────────────────────────────────────────────────

    async def list_cycles(self, sub_id: UUID) -> list[SubscriptionCycle]:
        sub = await self.sub_repo.get_by_id(sub_id)
        if not sub:
            raise NotFoundError("Subscription not found")
        return await self.sub_repo.list_cycles(sub_id)

    # ── Selections ──────────────────────────────────────────────────────

    async def set_selections(self, sub_id: UUID, cycle_id: UUID, data: SelectionCreate) -> list[SubscriptionSelection]:
        sub = await self.sub_repo.get_by_id(sub_id)
        if not sub:
            raise NotFoundError("Subscription not found")

        cycle = await self.sub_repo.get_cycle(cycle_id)
        if not cycle or cycle.subscription_id != sub.id:
            raise NotFoundError("Cycle not found for this subscription")

        if cycle.status not in (CycleStatus.upcoming, CycleStatus.selection_open):
            raise BadRequestError("Selections are locked for this cycle")

        now = datetime.now(timezone.utc)
        if now > cycle.selection_deadline:
            raise BadRequestError("Selection deadline has passed")

        # Validate item count against tier limit
        tier = await self.plan_repo.get_tier_by_id(sub.plan_tier_id)
        total_items = sum(item.quantity for item in data.items)
        if total_items > tier.items_per_cycle:
            raise BadRequestError(f"Total items ({total_items}) exceeds tier limit ({tier.items_per_cycle})")

        # Replace existing selections
        await self.sub_repo.delete_selections_for_cycle(cycle_id)

        selections = []
        for item in data.items:
            sel = SubscriptionSelection(
                cycle_id=cycle_id,
                product_variant_id=item.product_variant_id,
                quantity=item.quantity,
            )
            sel = await self.sub_repo.create_selection(sel)
            selections.append(sel)

        # Update cycle status to selection_open if it was upcoming
        if cycle.status == CycleStatus.upcoming:
            await self.sub_repo.update_cycle(cycle_id, status=CycleStatus.selection_open)

        return selections

    # ── Skip Cycle ──────────────────────────────────────────────────────

    async def skip_cycle(self, sub_id: UUID, cycle_id: UUID, actor_id: UUID) -> SubscriptionCycle:
        sub = await self.sub_repo.get_by_id(sub_id)
        if not sub:
            raise NotFoundError("Subscription not found")

        cycle = await self.sub_repo.get_cycle(cycle_id)
        if not cycle or cycle.subscription_id != sub.id:
            raise NotFoundError("Cycle not found for this subscription")

        if cycle.status not in (CycleStatus.upcoming, CycleStatus.selection_open):
            raise BadRequestError("This cycle can no longer be skipped")

        cycle = await self.sub_repo.update_cycle(cycle_id, status=CycleStatus.skipped)

        await self.sub_repo.create_event(
            SubscriptionEvent(
                subscription_id=sub_id,
                event_type=SubscriptionEventType.skipped,
                event_data={"cycle_id": str(cycle_id), "cycle_number": cycle.cycle_number},
                actor_id=actor_id,
            )
        )

        return cycle
