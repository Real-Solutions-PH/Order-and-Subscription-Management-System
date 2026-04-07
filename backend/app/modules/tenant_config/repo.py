from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.tenant_config.models import FeatureFlag, TenantConfig


class TenantConfigRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_tenant(self, tenant_id: UUID) -> TenantConfig | None:
        result = await self.db.execute(
            select(TenantConfig).where(TenantConfig.tenant_id == tenant_id)
        )
        return result.scalar_one_or_none()

    async def create(self, config: TenantConfig) -> TenantConfig:
        self.db.add(config)
        await self.db.flush()
        return config

    async def update(self, tenant_id: UUID, **kwargs) -> TenantConfig | None:
        await self.db.execute(
            update(TenantConfig)
            .where(TenantConfig.tenant_id == tenant_id)
            .values(**kwargs)
        )
        return await self.get_by_tenant(tenant_id)


class FeatureFlagRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_tenant(self, tenant_id: UUID) -> list[FeatureFlag]:
        result = await self.db.execute(
            select(FeatureFlag)
            .where(FeatureFlag.tenant_id == tenant_id)
            .order_by(FeatureFlag.flag_key)
        )
        return list(result.scalars().all())

    async def get_by_key(self, tenant_id: UUID, flag_key: str) -> FeatureFlag | None:
        result = await self.db.execute(
            select(FeatureFlag).where(
                FeatureFlag.tenant_id == tenant_id,
                FeatureFlag.flag_key == flag_key,
            )
        )
        return result.scalar_one_or_none()

    async def create(self, flag: FeatureFlag) -> FeatureFlag:
        self.db.add(flag)
        await self.db.flush()
        return flag

    async def update_flag(self, tenant_id: UUID, flag_key: str, enabled: bool) -> FeatureFlag | None:
        await self.db.execute(
            update(FeatureFlag)
            .where(
                FeatureFlag.tenant_id == tenant_id,
                FeatureFlag.flag_key == flag_key,
            )
            .values(enabled=enabled)
        )
        return await self.get_by_key(tenant_id, flag_key)
