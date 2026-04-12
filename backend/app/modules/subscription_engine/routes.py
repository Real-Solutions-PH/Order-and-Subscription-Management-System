"""Subscription Engine API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_subscription_plan_service, get_subscription_service
from app.modules.subscription_engine.schemas import (
    CycleResponse,
    PlanModifyRequest,
    SelectionCreate,
    SelectionResponse,
    SubscriptionCancelRequest,
    SubscriptionCreate,
    SubscriptionPauseRequest,
    SubscriptionPlanCreate,
    SubscriptionPlanResponse,
    SubscriptionResponse,
)
from app.modules.subscription_engine.services import (
    SubscriptionPlanService,
    SubscriptionService,
)
from app.shared.auth import CurrentUser, SuperUser

router = APIRouter(tags=["Subscriptions"])


# ── Plan Endpoints ──────────────────────────────────────────────────────


@router.post("/subscription-plans", response_model=SubscriptionPlanResponse)
async def create_plan(
    data: SubscriptionPlanCreate,
    current_user: SuperUser,
    plan_service: Annotated[SubscriptionPlanService, Depends(get_subscription_plan_service)],
):
    plan = await plan_service.create_plan(current_user.tenant_id, data)
    return plan


@router.get("/subscription-plans", response_model=list[SubscriptionPlanResponse])
async def list_plans(
    plan_service: Annotated[SubscriptionPlanService, Depends(get_subscription_plan_service)],
    tenant_id: UUID = Query(..., description="Tenant to list plans for"),
    active_only: bool = Query(True),
):
    return await plan_service.list_plans(tenant_id, active_only=active_only)


# ── Subscription Endpoints ──────────────────────────────────────────────


@router.get("/subscriptions", response_model=list[SubscriptionResponse])
async def list_subscriptions(
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    return await sub_service.list_user_subscriptions(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
    )


@router.post("/subscriptions", response_model=SubscriptionResponse)
async def create_subscription(
    data: SubscriptionCreate,
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    sub = await sub_service.create_subscription(
        user_id=current_user.id,
        tenant_id=current_user.tenant_id,
        data=data,
    )
    return sub


@router.get("/subscriptions/{sub_id}", response_model=SubscriptionResponse)
async def get_subscription(
    sub_id: UUID,
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    return await sub_service.get_subscription(sub_id)


@router.post("/subscriptions/{sub_id}/pause", response_model=SubscriptionResponse)
async def pause_subscription(
    sub_id: UUID,
    data: SubscriptionPauseRequest,
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    return await sub_service.pause_subscription(sub_id, actor_id=current_user.id, data=data)


@router.post("/subscriptions/{sub_id}/resume", response_model=SubscriptionResponse)
async def resume_subscription(
    sub_id: UUID,
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    return await sub_service.resume_subscription(sub_id, actor_id=current_user.id)


@router.post("/subscriptions/{sub_id}/cancel", response_model=SubscriptionResponse)
async def cancel_subscription(
    sub_id: UUID,
    data: SubscriptionCancelRequest,
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    return await sub_service.cancel_subscription(sub_id, actor_id=current_user.id, data=data)


@router.patch("/subscriptions/{sub_id}/plan", response_model=SubscriptionResponse)
async def modify_plan(
    sub_id: UUID,
    data: PlanModifyRequest,
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    return await sub_service.modify_plan(sub_id, actor_id=current_user.id, new_plan_tier_id=data.new_plan_tier_id)


# ── Cycle Endpoints ────────────────────────────────────────────────────


@router.get("/subscriptions/{sub_id}/cycles", response_model=list[CycleResponse])
async def list_cycles(
    sub_id: UUID,
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    return await sub_service.list_cycles(sub_id)


@router.post(
    "/subscriptions/{sub_id}/cycles/{cycle_id}/selections",
    response_model=list[SelectionResponse],
)
async def set_selections(
    sub_id: UUID,
    cycle_id: UUID,
    data: SelectionCreate,
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    return await sub_service.set_selections(sub_id, cycle_id, data)


@router.post(
    "/subscriptions/{sub_id}/cycles/{cycle_id}/skip",
    response_model=CycleResponse,
)
async def skip_cycle(
    sub_id: UUID,
    cycle_id: UUID,
    current_user: CurrentUser,
    sub_service: Annotated[SubscriptionService, Depends(get_subscription_service)],
):
    return await sub_service.skip_cycle(sub_id, cycle_id, actor_id=current_user.id)
