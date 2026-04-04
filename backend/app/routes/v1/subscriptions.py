"""Subscription Engine API routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_cache
from app.core.permissions import PermissionChecker, get_current_user
from app.repo.session import get_app_db
from app.schemas.subscription import (
    CycleResponse,
    PlanCreate,
    PlanModifyRequest,
    PlanResponse,
    SelectionCreate,
    SelectionResponse,
    SubscriptionCancelRequest,
    SubscriptionCreate,
    SubscriptionPauseRequest,
    SubscriptionResponse,
)
from app.services.subscription import SubscriptionService

router = APIRouter(prefix="", tags=["subscriptions"])


def _subscription_service(
    session: AsyncSession = Depends(get_app_db),
) -> SubscriptionService:
    return SubscriptionService(session, cache=get_cache())


# ------------------------------------------------------------------
# Plans
# ------------------------------------------------------------------


@router.post(
    "/subscription-plans",
    response_model=PlanResponse,
    status_code=201,
)
async def create_plan(
    data: PlanCreate,
    user: dict[str, Any] = Depends(PermissionChecker(["subscriptions:create"])),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """Create a new subscription plan with tiers."""
    tenant_id = user["tenant_id"]
    return await service.create_plan(tenant_id, data)


@router.get(
    "/subscription-plans",
    response_model=list[PlanResponse],
)
async def list_plans(
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """List active subscription plans."""
    tenant_id = user["tenant_id"]
    return await service.list_plans(tenant_id)


# ------------------------------------------------------------------
# Subscriptions
# ------------------------------------------------------------------


@router.post(
    "/subscriptions",
    response_model=SubscriptionResponse,
    status_code=201,
)
async def create_subscription(
    data: SubscriptionCreate,
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """Create a new subscription for the authenticated user."""
    tenant_id = user["tenant_id"]
    user_id = user["sub"]
    return await service.create_subscription(tenant_id, user_id, data)


@router.get(
    "/subscriptions/{subscription_id}",
    response_model=SubscriptionResponse,
)
async def get_subscription(
    subscription_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """Get subscription detail."""
    tenant_id = user["tenant_id"]
    return await service.get_subscription(subscription_id, tenant_id)


@router.post(
    "/subscriptions/{subscription_id}/pause",
    response_model=SubscriptionResponse,
)
async def pause_subscription(
    subscription_id: UUID,
    data: SubscriptionPauseRequest,
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """Pause an active subscription."""
    tenant_id = user["tenant_id"]
    actor_id = user["sub"]
    return await service.pause_subscription(
        subscription_id, tenant_id, data, actor_id=actor_id
    )


@router.post(
    "/subscriptions/{subscription_id}/resume",
    response_model=SubscriptionResponse,
)
async def resume_subscription(
    subscription_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """Resume a paused subscription."""
    tenant_id = user["tenant_id"]
    actor_id = user["sub"]
    return await service.resume_subscription(
        subscription_id, tenant_id, actor_id=actor_id
    )


@router.post(
    "/subscriptions/{subscription_id}/cancel",
    response_model=SubscriptionResponse,
)
async def cancel_subscription(
    subscription_id: UUID,
    data: SubscriptionCancelRequest,
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """Cancel a subscription."""
    tenant_id = user["tenant_id"]
    actor_id = user["sub"]
    return await service.cancel_subscription(
        subscription_id, tenant_id, data, actor_id=actor_id
    )


@router.patch(
    "/subscriptions/{subscription_id}/plan",
    response_model=SubscriptionResponse,
)
async def modify_plan(
    subscription_id: UUID,
    data: PlanModifyRequest,
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """Modify the plan tier for an existing subscription."""
    tenant_id = user["tenant_id"]
    actor_id = user["sub"]
    return await service.modify_plan(
        subscription_id, tenant_id, data, actor_id=actor_id
    )


# ------------------------------------------------------------------
# Cycles
# ------------------------------------------------------------------


@router.get(
    "/subscriptions/{subscription_id}/cycles",
    response_model=list[CycleResponse],
)
async def list_cycles(
    subscription_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """List all cycles for a subscription."""
    tenant_id = user["tenant_id"]
    return await service.get_cycles(subscription_id, tenant_id)


@router.post(
    "/subscriptions/{subscription_id}/cycles/{cycle_id}/selections",
    response_model=list[SelectionResponse],
)
async def set_selections(
    subscription_id: UUID,
    cycle_id: UUID,
    selections: list[SelectionCreate],
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """Set product selections for a cycle."""
    tenant_id = user["tenant_id"]
    user_id = user["sub"]
    return await service.set_selections(
        subscription_id, cycle_id, tenant_id, user_id, selections
    )


@router.post(
    "/subscriptions/{subscription_id}/cycles/{cycle_id}/skip",
    response_model=CycleResponse,
)
async def skip_cycle(
    subscription_id: UUID,
    cycle_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
    service: SubscriptionService = Depends(_subscription_service),
) -> Any:
    """Skip a subscription cycle."""
    tenant_id = user["tenant_id"]
    actor_id = user["sub"]
    return await service.skip_cycle(
        subscription_id, cycle_id, tenant_id, actor_id=actor_id
    )
