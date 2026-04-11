from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, model_validator

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
    role: str
    is_superuser: bool
    email_verified_at: datetime | None
    last_login_at: datetime | None
    created_at: datetime
    updated_at: datetime
    dietary_preferences: list[str] = []
    allergens: list[str] = []

    @model_validator(mode="before")
    @classmethod
    def extract_metadata_fields(cls, data):
        if hasattr(data, "metadata_"):
            meta = data.metadata_ or {}
            data.__dict__["dietary_preferences"] = meta.get("dietary_preferences", [])
            data.__dict__["allergens"] = meta.get("allergens", [])
        elif isinstance(data, dict):
            meta = data.get("metadata_") or {}
            data.setdefault("dietary_preferences", meta.get("dietary_preferences", []))
            data.setdefault("allergens", meta.get("allergens", []))
        return data


class UserUpdateRequest(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None
    dietary_preferences: list[str] | None = None
    allergens: list[str] | None = None


class AdminUserUpdateRequest(UserUpdateRequest):
    is_active: bool | None = None
    role: str | None = None
    email: EmailStr | None = None


class AdminCreateUserRequest(BaseModel):
    email: EmailStr
    first_name: str
    last_name: str
    phone: str | None = None
    password: str
    role: str = "admin"


class UserListResponse(BaseSchema):
    total: int
    page: int
    per_page: int
    items: list[UserResponse]


class UserMetricsResponse(BaseSchema):
    this_month_total: Decimal
    total_savings: Decimal
    favorite_meal: str
