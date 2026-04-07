"""Shopping cart routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import RedisCache, get_cache
from app.core.permissions import get_current_user
from app.repo.session import get_app_db
from app.schemas.base import MessageResponse
from app.schemas.order import (
    ApplyPromoRequest,
    CartItemAdd,
    CartItemUpdate,
    CartResponse,
)
from app.services.order import CartService

router = APIRouter(prefix="/cart", tags=["cart"])


@router.get("/", response_model=CartResponse)
async def get_cart(
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Return the current user's cart."""
    service = CartService(session, cache)
    return await service.get_cart(
        user_id=current_user["sub"],
        tenant_id=current_user["tenant_id"],
    )


@router.post(
    "/items",
    response_model=CartResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_item(
    data: CartItemAdd,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Add an item to the cart."""
    service = CartService(session, cache)
    return await service.add_item(
        user_id=current_user["sub"],
        tenant_id=current_user["tenant_id"],
        data=data,
    )


@router.patch("/items/{item_id}", response_model=CartResponse)
async def update_item(
    item_id: UUID,
    data: CartItemUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Update the quantity of a cart item."""
    service = CartService(session, cache)
    return await service.update_item(
        user_id=current_user["sub"],
        tenant_id=current_user["tenant_id"],
        item_id=item_id,
        data=data,
    )


@router.delete("/items/{item_id}", response_model=CartResponse)
async def remove_item(
    item_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Remove an item from the cart."""
    service = CartService(session, cache)
    return await service.remove_item(
        user_id=current_user["sub"],
        tenant_id=current_user["tenant_id"],
        item_id=item_id,
    )


@router.delete("/", response_model=MessageResponse)
async def clear_cart(
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Clear all items from the cart."""
    service = CartService(session, cache)
    await service.clear_cart(
        user_id=current_user["sub"],
        tenant_id=current_user["tenant_id"],
    )
    return MessageResponse(message="Cart cleared")


@router.post("/promo", response_model=CartResponse)
async def apply_promo(
    data: ApplyPromoRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Apply a promo code to the cart."""
    service = CartService(session, cache)
    return await service.apply_promo(
        user_id=current_user["sub"],
        tenant_id=current_user["tenant_id"],
        code=data.code,
    )
