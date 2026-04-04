"""Tenant configuration and feature flag routes."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import RedisCache, get_cache
from app.core.permissions import PermissionChecker, get_current_user
from app.repo.session import get_iam_db
from app.schemas.tenant import (
    FeatureFlagResponse,
    FeatureFlagUpdate,
    TenantConfigResponse,
    TenantConfigUpdate,
)
from app.services.tenant import TenantService

router = APIRouter(prefix="/tenant", tags=["tenant"])


@router.get("/config", response_model=TenantConfigResponse)
async def get_tenant_config(
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_iam_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Get the configuration for the current tenant."""
    service = TenantService(session, cache=cache)
    return await service.get_config(current_user["tenant_id"])


@router.patch("/config", response_model=TenantConfigResponse)
async def update_tenant_config(
    data: TenantConfigUpdate,
    current_user: dict[str, Any] = Depends(PermissionChecker(["tenant:write"])),
    session: AsyncSession = Depends(get_iam_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Update the tenant configuration (admin only)."""
    service = TenantService(session, cache=cache)
    return await service.update_config(current_user["tenant_id"], data)


@router.get("/features", response_model=list[FeatureFlagResponse])
async def list_feature_flags(
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_iam_db),
) -> Any:
    """List all feature flags for the current tenant."""
    service = TenantService(session)
    return await service.get_feature_flags(current_user["tenant_id"])


@router.patch(
    "/features/{flag_key}",
    response_model=FeatureFlagResponse,
)
async def toggle_feature_flag(
    flag_key: str,
    data: FeatureFlagUpdate,
    current_user: dict[str, Any] = Depends(PermissionChecker(["tenant:write"])),
    session: AsyncSession = Depends(get_iam_db),
    cache: RedisCache = Depends(get_cache),
) -> Any:
    """Toggle a feature flag (admin only)."""
    service = TenantService(session, cache=cache)
    return await service.toggle_feature(current_user["tenant_id"], flag_key, data.enabled)
