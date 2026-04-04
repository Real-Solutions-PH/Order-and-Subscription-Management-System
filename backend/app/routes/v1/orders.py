"""Order management routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import RedisCache, get_cache
from app.core.permissions import PermissionChecker, get_current_user
from app.repo.db import OrderStatus
from app.repo.session import get_app_db
from app.schemas.order import (
    CheckoutRequest,
    OrderCancelRequest,
    OrderListResponse,
    OrderResponse,
    OrderStatusUpdate,
)
from app.services.order import OrderService

router = APIRouter(prefix="/orders", tags=["orders"])


@router.post(
    "/checkout",
    response_model=OrderResponse,
    status_code=status.HTTP_201_CREATED,
)
async def checkout(
    data: CheckoutRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Create an order from the current cart."""
    service = OrderService(session, cache)
    return await service.checkout(
        user_id=current_user["sub"],
        tenant_id=current_user["tenant_id"],
        data=data,
    )


@router.get("/", response_model=OrderListResponse)
async def list_orders(
    status_filter: OrderStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """List orders.

    Admins (with ``orders:read`` permission) see all tenant orders.
    Regular customers see only their own orders.
    """
    service = OrderService(session, cache)
    user_permissions: list[str] = current_user.get("permissions", [])

    # Admin with orders:read sees all; otherwise scoped to own orders
    user_id = None if "orders:read" in user_permissions else current_user["sub"]

    return await service.list_orders(
        tenant_id=current_user["tenant_id"],
        user_id=user_id,
        status=status_filter,
        skip=skip,
        limit=limit,
    )


@router.get("/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Retrieve a single order by ID."""
    service = OrderService(session, cache)
    return await service.get_order(
        order_id=order_id,
        tenant_id=current_user["tenant_id"],
    )


@router.patch("/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    current_user: dict[str, Any] = Depends(PermissionChecker(["orders:update"])),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Update the status of an order (admin only)."""
    service = OrderService(session, cache)
    return await service.update_status(
        order_id=order_id,
        tenant_id=current_user["tenant_id"],
        data=data,
        changed_by=current_user["sub"],
    )


@router.post("/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: UUID,
    data: OrderCancelRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Cancel an order (only pending or confirmed orders)."""
    service = OrderService(session, cache)
    return await service.cancel_order(
        order_id=order_id,
        tenant_id=current_user["tenant_id"],
        user_id=current_user["sub"],
        data=data,
    )
