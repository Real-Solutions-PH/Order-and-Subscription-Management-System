"""JWT authentication utilities and FastAPI dependencies — simplified like fastapi/full-stack-fastapi-template."""

from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import UUID

import jwt
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import get_db
from app.exceptions import ForbiddenError, UnauthorizedError

settings = get_settings()
security = HTTPBearer(auto_error=False)


# ── Token helpers ────────────────────────────────────────────────────

def create_access_token(subject: str | UUID, expires_delta: timedelta | None = None) -> str:
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=settings.access_token_expire_minutes))
    payload = {"sub": str(subject), "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: str | UUID) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    payload = {"sub": str(subject), "exp": expire, "type": "refresh"}
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret_key, algorithms=[settings.jwt_algorithm])
    except jwt.ExpiredSignatureError:
        raise UnauthorizedError("Token has expired")
    except jwt.InvalidTokenError:
        raise UnauthorizedError("Invalid token")


# ── Dependencies ─────────────────────────────────────────────────────

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Decode JWT, load User from DB, return the actual User model instance."""
    if credentials is None:
        raise UnauthorizedError()
    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise UnauthorizedError("Invalid token type")

    from app.modules.iam.models import User

    user_id = payload.get("sub")
    if not user_id:
        raise UnauthorizedError("Invalid token payload")

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise UnauthorizedError("User not found")
    if not user.is_active:
        raise ForbiddenError("Inactive user")
    return user


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """Return User if valid token provided, None otherwise."""
    if credentials is None:
        return None
    try:
        return await get_current_user(credentials, db)
    except (UnauthorizedError, ForbiddenError):
        return None


def get_current_active_superuser(current_user=Depends(get_current_user)):
    """Dependency that requires the current user to be a superuser."""
    if not current_user.is_superuser:
        raise ForbiddenError("Not enough privileges")
    return current_user


# Type aliases for use in route signatures
CurrentUser = Annotated[object, Depends(get_current_user)]  # actual User model
OptionalUser = Annotated[object | None, Depends(get_optional_user)]
SuperUser = Annotated[object, Depends(get_current_active_superuser)]
