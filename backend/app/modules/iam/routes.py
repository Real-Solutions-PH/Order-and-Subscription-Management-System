from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_auth_service, get_tenant_repo, get_user_service
from app.exceptions import NotFoundError
from app.modules.iam.schemas import (
    AdminUserUpdateRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserListResponse,
    UserResponse,
    UserUpdateRequest,
)
from app.shared.auth import CurrentUser, SuperUser

router = APIRouter(tags=["IAM"])


@router.post("/auth/register", response_model=TokenResponse)
async def register(
    data: RegisterRequest,
    auth_service=Depends(get_auth_service),
    tenant_repo=Depends(get_tenant_repo),
):
    tenant = await tenant_repo.get_by_slug(data.tenant_slug)
    if not tenant:
        raise NotFoundError("Tenant not found")
    user, access_token, refresh_token = await auth_service.register(data, tenant)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    auth_service=Depends(get_auth_service),
    tenant_repo=Depends(get_tenant_repo),
):
    tenant = await tenant_repo.get_by_slug(data.tenant_slug)
    if not tenant:
        raise NotFoundError("Tenant not found")
    user, access_token, refresh_token = await auth_service.login(data.email, data.password, tenant)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshRequest,
    auth_service=Depends(get_auth_service),
):
    access_token, refresh_token = await auth_service.refresh(data.refresh_token)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/auth/logout")
async def logout(current_user: CurrentUser):
    return {"message": "Logged out successfully"}


@router.get("/users/me", response_model=UserResponse)
async def get_me(current_user: CurrentUser):
    return current_user


@router.patch("/users/me", response_model=UserResponse)
async def update_me(
    data: UserUpdateRequest,
    current_user: CurrentUser,
    user_service=Depends(get_user_service),
):
    user = await user_service.update_profile(current_user.id, **data.model_dump(exclude_unset=True))
    return user


# ── Admin Endpoints (superuser only) ────────────────────────────────

@router.get("/users", response_model=UserListResponse)
async def list_users(
    current_user: SuperUser,
    user_service=Depends(get_user_service),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    is_active: bool | None = None,
):
    offset = (page - 1) * per_page
    users, total = await user_service.list_users(current_user.tenant_id, offset, per_page, is_active)
    return UserListResponse(total=total, page=page, per_page=per_page, items=users)


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: SuperUser,
    user_service=Depends(get_user_service),
):
    return await user_service.get_by_id(user_id)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: AdminUserUpdateRequest,
    current_user: SuperUser,
    user_service=Depends(get_user_service),
):
    return await user_service.update_profile(user_id, **data.model_dump(exclude_unset=True))


@router.delete("/users/{user_id}", response_model=UserResponse)
async def deactivate_user(
    user_id: UUID,
    current_user: SuperUser,
    user_service=Depends(get_user_service),
):
    return await user_service.deactivate(user_id)
