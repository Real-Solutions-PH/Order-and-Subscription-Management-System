"""User schemas for CRUD and list operations."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.base import BaseSchema, PaginatedResponse


class UserCreate(BaseSchema):
    """Schema for creating a new user (admin use)."""

    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str | None = None


class UserUpdate(BaseSchema):
    """Schema for updating user profile fields."""

    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    avatar_url: str | None = None


class UserResponse(BaseSchema):
    """Public user representation."""

    id: UUID
    email: str
    first_name: str
    last_name: str
    phone: str | None = None
    avatar_url: str | None = None
    status: str
    email_verified_at: datetime | None = None
    last_login_at: datetime | None = None
    created_at: datetime
    updated_at: datetime


class UserListResponse(PaginatedResponse[UserResponse]):
    """Paginated list of users."""

    pass
