"""Authentication and current-user profile routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Header, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import RedisCache, get_cache
from app.core.exceptions import BadRequestException
from app.core.permissions import get_current_user
from app.repo.session import get_iam_db
from app.schemas.auth import (
    LoginRequest,
    RefreshTokenRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.base import MessageResponse
from app.schemas.user import UserResponse, UserUpdate
from app.services.auth import AuthService
from app.services.user import UserService

router = APIRouter(tags=["auth"])


def _require_tenant_id(x_tenant_id: str = Header(...)) -> str:
    """Extract and validate the X-Tenant-ID header."""
    try:
        UUID(x_tenant_id)
    except ValueError as err:
        raise BadRequestException("X-Tenant-ID must be a valid UUID") from err
    return x_tenant_id


@router.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(
    data: RegisterRequest,
    tenant_id: str = Depends(_require_tenant_id),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """Register a new user within the given tenant."""
    service = AuthService(session)
    user = await service.register(tenant_id, data)
    return user


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    tenant_id: str = Depends(_require_tenant_id),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """Authenticate a user and return JWT tokens."""
    service = AuthService(session)
    return await service.login(tenant_id, data)


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshTokenRequest,
    session: AsyncSession = Depends(get_iam_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Refresh an access token using a valid refresh token."""
    service = AuthService(session, cache=cache)
    return await service.refresh_token(data.refresh_token)


@router.post(
    "/auth/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
)
async def logout(
    data: RefreshTokenRequest,
    current_user: dict[str, Any] = Depends(get_current_user),
    cache: RedisCache = Depends(get_cache),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """Blacklist the refresh token (requires authentication)."""
    service = AuthService(session, cache=cache)
    await service.logout(data.refresh_token)
    return MessageResponse(message="Successfully logged out")


@router.get("/users/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """Return the authenticated user's profile."""
    service = UserService(session)
    return await service.get_user(current_user["sub"], current_user["tenant_id"])


@router.patch("/users/me", response_model=UserResponse)
async def update_current_user_profile(
    data: UserUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """Update the authenticated user's profile."""
    service = UserService(session)
    return await service.update_user(current_user["sub"], current_user["tenant_id"], data)
