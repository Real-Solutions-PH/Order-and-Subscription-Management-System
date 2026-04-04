"""Admin user management routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionChecker
from app.repo.session import get_iam_db
from app.schemas.base import MessageResponse
from app.schemas.user import UserListResponse, UserResponse, UserUpdate
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict[str, Any] = Depends(PermissionChecker(["users:read"])),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """List all users in the tenant (admin only)."""
    tenant_id = current_user["tenant_id"]
    skip = (page - 1) * page_size

    service = UserService(session)
    users, total = await service.list_users(tenant_id, skip=skip, limit=page_size)

    return UserListResponse.build(
        items=[UserResponse.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: dict[str, Any] = Depends(PermissionChecker(["users:read"])),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """Get a specific user by ID (admin only)."""
    service = UserService(session)
    return await service.get_user(user_id, current_user["tenant_id"])


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    current_user: dict[str, Any] = Depends(PermissionChecker(["users:write"])),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """Update a user's profile (admin only)."""
    service = UserService(session)
    return await service.update_user(
        user_id, current_user["tenant_id"], data
    )


@router.delete(
    "/{user_id}",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def deactivate_user(
    user_id: UUID,
    current_user: dict[str, Any] = Depends(PermissionChecker(["users:write"])),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """Deactivate a user (admin only). Performs a soft-delete."""
    service = UserService(session)
    await service.deactivate_user(user_id, current_user["tenant_id"])
    return MessageResponse(message="User deactivated successfully")
