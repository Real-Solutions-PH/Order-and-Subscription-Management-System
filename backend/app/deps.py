"""Shared FastAPI dependencies for dependency injection."""

from uuid import UUID

from fastapi import Depends, Header

from app.core.exceptions import UnauthorizedException
from app.core.permissions import get_current_user  # noqa: F401 -- re-exported
from app.repo.session import get_app_db, get_iam_db


async def get_tenant_id(
    current_user: dict = Depends(get_current_user),
) -> UUID:
    """Extract tenant_id from the authenticated user's JWT payload.

    The JWT payload stores tenant_id as a string, so we convert to UUID here.
    """
    try:
        return UUID(current_user["tenant_id"])
    except (KeyError, ValueError) as exc:
        raise UnauthorizedException("Missing or invalid tenant_id in token") from exc


async def get_tenant_id_from_header(
    x_tenant_id: str = Header(..., alias="X-Tenant-ID"),
) -> UUID:
    """Extract tenant_id from the X-Tenant-ID header (for unauthenticated routes like login/register)."""
    try:
        return UUID(x_tenant_id)
    except ValueError as e:
        raise UnauthorizedException("Invalid X-Tenant-ID header") from e


def get_db() -> get_app_db:
    """Alias for the app database dependency."""
    return get_app_db


def get_iam() -> get_iam_db:
    """Alias for the IAM database dependency."""
    return get_iam_db
