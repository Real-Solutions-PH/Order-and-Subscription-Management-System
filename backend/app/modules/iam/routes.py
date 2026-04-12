from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_auth_service, get_tenant_repo, get_user_service
from app.exceptions import NotFoundError
from app.modules.iam.repo import TenantRepo
from app.modules.iam.schemas import (
    AdminCreateUserRequest,
    AdminUserUpdateRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
    UserListResponse,
    UserMetricsResponse,
    UserResponse,
    UserUpdateRequest,
)
from app.modules.iam.services import AuthService, UserService
from app.shared.auth import CurrentUser, SuperAdminUser, SuperUser

router = APIRouter(tags=["IAM"])


@router.post("/auth/register", response_model=TokenResponse)
async def register(
    data: RegisterRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    tenant_repo: Annotated[TenantRepo, Depends(get_tenant_repo)],
):
    tenant = await tenant_repo.get_by_slug(data.tenant_slug)
    if not tenant:
        raise NotFoundError("Tenant not found")
    _, access_token, refresh_token = await auth_service.register(data, tenant)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    data: LoginRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
    tenant_repo: Annotated[TenantRepo, Depends(get_tenant_repo)],
):
    tenant = await tenant_repo.get_by_slug(data.tenant_slug)
    if not tenant:
        raise NotFoundError("Tenant not found")
    _, access_token, refresh_token = await auth_service.login(data.email, data.password, tenant)
    return TokenResponse(access_token=access_token, refresh_token=refresh_token)


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    data: RefreshRequest,
    auth_service: Annotated[AuthService, Depends(get_auth_service)],
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
    user_service: Annotated[UserService, Depends(get_user_service)],
):
    update_data = data.model_dump(exclude_unset=True)
    # Handle dietary_preferences and allergens via metadata_
    meta_updates = {}
    if "dietary_preferences" in update_data:
        meta_updates["dietary_preferences"] = update_data.pop("dietary_preferences")
    if "allergens" in update_data:
        meta_updates["allergens"] = update_data.pop("allergens")
    if meta_updates:
        current_meta = current_user.metadata_ or {}
        current_meta.update(meta_updates)
        update_data["metadata_"] = current_meta
    user = await user_service.update_profile(current_user.id, **update_data)
    return user


@router.get("/users/me/metrics", response_model=UserMetricsResponse)
async def get_my_metrics(
    current_user: CurrentUser,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    from app.modules.order_management.models import Order, OrderItem

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    # This month's total spend
    month_total_result = await db.execute(
        select(func.coalesce(func.sum(Order.total), Decimal("0.00"))).where(
            Order.user_id == current_user.id,
            Order.tenant_id == current_user.tenant_id,
            Order.placed_at >= month_start,
        )
    )
    this_month_total = month_total_result.scalar_one() or Decimal("0.00")

    # Total savings (sum of discount_amount across all orders)
    savings_result = await db.execute(
        select(func.coalesce(func.sum(Order.discount_amount), Decimal("0.00"))).where(
            Order.user_id == current_user.id,
            Order.tenant_id == current_user.tenant_id,
        )
    )
    total_savings = savings_result.scalar_one() or Decimal("0.00")

    # Favorite meal: most frequent product_name across all order items
    fav_result = await db.execute(
        select(OrderItem.product_name, func.count(OrderItem.id).label("cnt"))
        .join(Order, Order.id == OrderItem.order_id)
        .where(
            Order.user_id == current_user.id,
            Order.tenant_id == current_user.tenant_id,
            OrderItem.product_name != "",
        )
        .group_by(OrderItem.product_name)
        .order_by(func.count(OrderItem.id).desc())
        .limit(1)
    )
    row = fav_result.first()
    favorite_meal = row[0] if row else ""

    return UserMetricsResponse(
        this_month_total=Decimal(str(this_month_total)),
        total_savings=Decimal(str(total_savings)),
        favorite_meal=favorite_meal,
    )


# ── Admin Endpoints (admin or superadmin) ─────────────────────────────


@router.get("/users", response_model=UserListResponse)
async def list_users(
    current_user: SuperUser,
    user_service: Annotated[UserService, Depends(get_user_service)],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    is_active: bool | None = None,
    role: str | None = None,
):
    offset = (page - 1) * per_page
    users, total = await user_service.list_users(current_user.tenant_id, offset, per_page, is_active, role)
    return UserListResponse(total=total, page=page, per_page=per_page, items=users)


@router.post("/users", response_model=UserResponse, status_code=201)
async def create_user(
    data: AdminCreateUserRequest,
    current_user: SuperAdminUser,
    user_service: Annotated[UserService, Depends(get_user_service)],
):
    return await user_service.create_user(
        tenant_id=current_user.tenant_id,
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        password=data.password,
        role=data.role,
        phone=data.phone,
    )


@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: UUID,
    current_user: SuperUser,
    user_service: Annotated[UserService, Depends(get_user_service)],
):
    return await user_service.get_by_id(user_id)


@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: AdminUserUpdateRequest,
    current_user: SuperUser,
    user_service: Annotated[UserService, Depends(get_user_service)],
):
    return await user_service.update_profile(user_id, **data.model_dump(exclude_unset=True))


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: UUID,
    current_user: SuperAdminUser,
    user_service: Annotated[UserService, Depends(get_user_service)],
):
    await user_service.delete_user(user_id)
    return {"message": "User permanently deleted"}
