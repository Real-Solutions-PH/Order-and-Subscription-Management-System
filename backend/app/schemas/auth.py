"""Authentication schemas for login, registration, and token handling."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import EmailStr, Field

from app.schemas.base import BaseSchema


class LoginRequest(BaseSchema):
    """Credentials for email/password authentication."""

    email: EmailStr
    password: str = Field(min_length=8)


class RegisterRequest(BaseSchema):
    """New user registration payload."""

    email: EmailStr
    password: str = Field(min_length=8)
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(min_length=1, max_length=100)
    phone: str | None = None


class TokenResponse(BaseSchema):
    """JWT token pair returned after successful authentication."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseSchema):
    """Payload for refreshing an access token."""

    refresh_token: str


class TokenPayload(BaseSchema):
    """Decoded JWT token payload."""

    user_id: UUID
    tenant_id: UUID
    roles: list[str] = []
    permissions: list[str] = []
    exp: datetime
