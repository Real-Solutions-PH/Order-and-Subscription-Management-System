from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, EmailStr

from app.shared.schemas import BaseSchema

# ── Auth ─────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    first_name: str
    last_name: str
    phone: str | None = None
    tenant_slug: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    tenant_slug: str


class RefreshRequest(BaseModel):
    refresh_token: str


class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


# ── Users ────────────────────────────────────────────────────────────

class UserResponse(BaseSchema):
    id: UUID
    tenant_id: UUID
    email: str
    phone: str | None
    first_name: str
    last_name: str
    avatar_url: str | None
    is_active: bool
    is_superuser: bool
    email_verified_at: datetime | None
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime


class UserUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None


class AdminUserUpdateRequest(UserUpdateRequest):
    is_active: bool | None = None
    is_superuser: bool | None = None
    email: EmailStr | None = None


class UserListResponse(BaseSchema):
    total: int
    page: int
    per_page: int
    items: list[UserResponse]
