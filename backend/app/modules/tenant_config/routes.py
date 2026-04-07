from fastapi import APIRouter, Depends

from app.dependencies import get_config_service, get_feature_flag_service
from app.modules.tenant_config.schemas import (
    FeatureFlagListResponse,
    FeatureFlagResponse,
    FeatureFlagUpdateRequest,
    TenantConfigResponse,
    TenantConfigUpdateRequest,
)
from app.shared.auth import CurrentUser

router = APIRouter(tags=["Tenant Config"])


@router.get("/tenant/config", response_model=TenantConfigResponse)
async def get_tenant_config(
    current_user: CurrentUser,
    config_service=Depends(get_config_service),
):
    config = await config_service.get_config(current_user.tenant_id)
    return config


@router.patch("/tenant/config", response_model=TenantConfigResponse)
async def update_tenant_config(
    data: TenantConfigUpdateRequest,
    current_user: CurrentUser,
    config_service=Depends(get_config_service),
):
    config = await config_service.update_config(current_user.tenant_id, data)
    return config


@router.get("/tenant/features", response_model=FeatureFlagListResponse)
async def list_feature_flags(
    current_user: CurrentUser,
    flag_service=Depends(get_feature_flag_service),
):
    flags = await flag_service.list_flags(current_user.tenant_id)
    return FeatureFlagListResponse(items=flags)


@router.patch("/tenant/features/{flag_key}", response_model=FeatureFlagResponse)
async def toggle_feature_flag(
    flag_key: str,
    data: FeatureFlagUpdateRequest,
    current_user: CurrentUser,
    flag_service=Depends(get_feature_flag_service),
):
    flag = await flag_service.toggle_flag(current_user.tenant_id, flag_key, data.enabled)
    return flag
