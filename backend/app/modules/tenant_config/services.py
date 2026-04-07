from uuid import UUID

from app.exceptions import NotFoundError
from app.modules.tenant_config.models import TenantConfig
from app.modules.tenant_config.repo import FeatureFlagRepo, TenantConfigRepo
from app.modules.tenant_config.schemas import TenantConfigUpdateRequest


class ConfigService:
    def __init__(self, config_repo: TenantConfigRepo):
        self.config_repo = config_repo

    async def get_config(self, tenant_id: UUID) -> TenantConfig:
        config = await self.config_repo.get_by_tenant(tenant_id)
        if not config:
            raise NotFoundError("Tenant configuration not found")
        return config

    async def update_config(self, tenant_id: UUID, data: TenantConfigUpdateRequest) -> TenantConfig:
        existing = await self.config_repo.get_by_tenant(tenant_id)
        if not existing:
            raise NotFoundError("Tenant configuration not found")

        update_data = data.model_dump(exclude_unset=True, by_alias=False)
        # Map the pydantic alias field back to the column attribute
        if "metadata" in update_data:
            update_data["metadata_"] = update_data.pop("metadata")

        if not update_data:
            return existing

        config = await self.config_repo.update(tenant_id, **update_data)
        if not config:
            raise NotFoundError("Tenant configuration not found")
        return config


class FeatureFlagService:
    def __init__(self, flag_repo: FeatureFlagRepo):
        self.flag_repo = flag_repo

    async def list_flags(self, tenant_id: UUID) -> list:
        return await self.flag_repo.list_by_tenant(tenant_id)

    async def toggle_flag(self, tenant_id: UUID, flag_key: str, enabled: bool):
        existing = await self.flag_repo.get_by_key(tenant_id, flag_key)
        if not existing:
            raise NotFoundError(f"Feature flag '{flag_key}' not found")

        flag = await self.flag_repo.update_flag(tenant_id, flag_key, enabled)
        if not flag:
            raise NotFoundError(f"Feature flag '{flag_key}' not found")
        return flag
