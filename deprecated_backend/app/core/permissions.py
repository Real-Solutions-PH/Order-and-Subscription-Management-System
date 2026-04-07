"""RBAC permission and role checking via FastAPI dependency injection."""

from __future__ import annotations

from typing import Any

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError

from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.core.security import decode_token

_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer_scheme),
) -> dict[str, Any]:
    """Extract and validate the current user from the Authorization header.

    Returns the decoded JWT payload as a dict with keys such as
    ``sub``, ``tenant_id``, ``roles``, ``permissions``, and ``token_type``.

    Raises:
        UnauthorizedException: If the token is missing, expired, or invalid.
    """
    if credentials is None:
        raise UnauthorizedException("Missing authentication token")

    try:
        payload = decode_token(credentials.credentials)
    except JWTError as err:
        raise UnauthorizedException("Invalid or expired token") from err

    if payload.get("token_type") != "access":
        raise UnauthorizedException("Invalid token type")

    return payload


class PermissionChecker:
    """FastAPI dependency that verifies the current user holds every required permission.

    Usage::

        @router.get("/orders")
        async def list_orders(
            user: dict = Depends(PermissionChecker(["orders:read"])),
        ):
            ...
    """

    def __init__(self, required_permissions: list[str]) -> None:
        self.required_permissions = required_permissions

    async def __call__(
        self,
        user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        user_permissions: list[str] = user.get("permissions", [])

        missing = [p for p in self.required_permissions if p not in user_permissions]
        if missing:
            raise ForbiddenException(f"Missing required permissions: {', '.join(missing)}")

        return user


def require_role(role_name: str):
    """Return a FastAPI dependency that ensures the user has the specified role.

    Usage::

        @router.delete("/admin/reset")
        async def admin_reset(
            user: dict = Depends(require_role("admin")),
        ):
            ...
    """

    async def _dependency(
        user: dict[str, Any] = Depends(get_current_user),
    ) -> dict[str, Any]:
        roles: list[str] = user.get("roles", [])
        if role_name not in roles:
            raise ForbiddenException(f"Role '{role_name}' is required")
        return user

    return _dependency
