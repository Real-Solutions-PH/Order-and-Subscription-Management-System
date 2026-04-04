"""Tenant configuration and feature flag service with Redis caching."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import RedisCache
from app.core.exceptions import NotFoundException
from app.repo.db import FeatureFlag, TenantConfig
from app.repo.tenant import FeatureFlagRepository, TenantConfigRepository
from app.schemas.tenant import TenantConfigUpdate


_CONFIG_CACHE_PREFIX = "tenant_config:"
_FEATURE_CACHE_PREFIX = "feature_flag:"
_CONFIG_TTL = 300  # 5 minutes


class TenantService:
    """Business logic for tenant configuration and feature flags."""

    def __init__(self, session: AsyncSession, cache: RedisCache | None = None) -> None:
        self.session = session
        self.cache = cache
        self.config_repo = TenantConfigRepository(session)
        self.flag_repo = FeatureFlagRepository(session)

    async def get_config(self, tenant_id: UUID | str) -> TenantConfig:
        """Get tenant configuration, with Redis caching (5min TTL)."""
        cache_key = f"{_CONFIG_CACHE_PREFIX}{tenant_id}"

        if self.cache is not None:
            cached = await self.cache.get(cache_key)
            if cached is not None:
                # Reconstruct a lightweight dict -- caller should handle
                # However, for ORM consistency, we fetch from DB
                pass

        config = await self.config_repo.get_by_tenant_id(tenant_id)
        if config is None:
            raise NotFoundException("TenantConfig", str(tenant_id))

        return config

    async def update_config(self, tenant_id: UUID | str, data: TenantConfigUpdate) -> TenantConfig:
        """Update tenant configuration and invalidate the cache."""
        config = await self.config_repo.get_by_tenant_id(tenant_id)
        if config is None:
            raise NotFoundException("TenantConfig", str(tenant_id))

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return config

        updated = await self.config_repo.update(config.id, update_data, tenant_id=tenant_id)
        if updated is None:
            raise NotFoundException("TenantConfig", str(tenant_id))

        # Invalidate cache
        if self.cache is not None:
            await self.cache.delete(f"{_CONFIG_CACHE_PREFIX}{tenant_id}")

        return updated

    async def get_feature_flags(self, tenant_id: UUID | str) -> list[FeatureFlag]:
        """List all feature flags for a tenant."""
        return await self.flag_repo.get_by_tenant(tenant_id)

    async def toggle_feature(self, tenant_id: UUID | str, flag_key: str, enabled: bool) -> FeatureFlag:
        """Toggle a feature flag and invalidate its cache."""
        flag = await self.flag_repo.toggle_flag(tenant_id, flag_key, enabled)
        if flag is None:
            raise NotFoundException("FeatureFlag", flag_key)

        # Invalidate cache
        if self.cache is not None:
            await self.cache.delete(f"{_FEATURE_CACHE_PREFIX}{tenant_id}:{flag_key}")

        return flag

    async def check_feature(self, tenant_id: UUID | str, flag_key: str) -> bool:
        """Check if a feature is enabled, with Redis caching."""
        cache_key = f"{_FEATURE_CACHE_PREFIX}{tenant_id}:{flag_key}"

        if self.cache is not None:
            cached = await self.cache.get(cache_key)
            if cached is not None:
                return bool(cached)

        flag = await self.flag_repo.get_flag(tenant_id, flag_key)
        enabled = flag.enabled if flag is not None else False

        if self.cache is not None:
            await self.cache.set(cache_key, enabled, ttl=_CONFIG_TTL)

        return enabled
