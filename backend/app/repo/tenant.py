"""Tenant, tenant configuration, and feature flag repositories."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select

from app.repo.base import BaseRepository
from app.repo.db import FeatureFlag, Tenant, TenantConfig


class TenantRepository(BaseRepository[Tenant]):
    """Repository for tenant CRUD operations."""

    model = Tenant

    async def get_by_slug(self, slug: str) -> Tenant | None:
        """Find a tenant by its unique slug."""
        stmt = select(Tenant).where(Tenant.slug == slug)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class TenantConfigRepository(BaseRepository[TenantConfig]):
    """Repository for tenant configuration operations."""

    model = TenantConfig

    async def get_by_tenant_id(self, tenant_id: UUID | str) -> TenantConfig | None:
        """Get the configuration record for a specific tenant."""
        stmt = select(TenantConfig).where(TenantConfig.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class FeatureFlagRepository(BaseRepository[FeatureFlag]):
    """Repository for feature flag operations."""

    model = FeatureFlag

    async def get_by_tenant(self, tenant_id: UUID | str) -> list[FeatureFlag]:
        """Get all feature flags for a tenant."""
        stmt = select(FeatureFlag).where(FeatureFlag.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_flag(
        self, tenant_id: UUID | str, flag_key: str
    ) -> FeatureFlag | None:
        """Get a specific feature flag by tenant and key."""
        stmt = select(FeatureFlag).where(
            FeatureFlag.tenant_id == tenant_id,
            FeatureFlag.flag_key == flag_key,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def toggle_flag(
        self, tenant_id: UUID | str, flag_key: str, enabled: bool
    ) -> FeatureFlag | None:
        """Toggle a feature flag's enabled state. Returns the updated flag or None."""
        flag = await self.get_flag(tenant_id, flag_key)
        if flag is None:
            return None
        flag.enabled = enabled
        await self.session.flush()
        await self.session.refresh(flag)
        return flag
