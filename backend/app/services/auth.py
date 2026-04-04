"""Authentication service handling registration, login, token refresh, and logout."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import RedisCache
from app.core.exceptions import ConflictException, UnauthorizedException
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.repo.db import User
from app.repo.iam import RoleRepository, UserRepository, UserRoleRepository
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse


class AuthService:
    """Handles user authentication workflows."""

    def __init__(self, session: AsyncSession, cache: RedisCache | None = None) -> None:
        self.session = session
        self.cache = cache
        self.user_repo = UserRepository(session)
        self.role_repo = RoleRepository(session)
        self.user_role_repo = UserRoleRepository(session)

    async def register(self, tenant_id: str, data: RegisterRequest) -> User:
        """Register a new user within a tenant.

        Hashes the password, checks for duplicate emails, creates the user,
        and assigns the default 'customer' role.
        """
        existing = await self.user_repo.get_by_email(data.email, tenant_id)
        if existing is not None:
            raise ConflictException("A user with this email already exists")

        user = await self.user_repo.create(
            {
                "tenant_id": tenant_id,
                "email": data.email,
                "password_hash": hash_password(data.password),
                "first_name": data.first_name,
                "last_name": data.last_name,
                "phone": data.phone,
            }
        )

        # Assign default customer role
        customer_role = await self.role_repo.get_by_name("customer", tenant_id)
        if customer_role is not None:
            await self.user_role_repo.assign_role(user.id, customer_role.id)

        return user

    async def login(self, tenant_id: str, data: LoginRequest) -> TokenResponse:
        """Authenticate a user and return a JWT token pair."""
        user = await self.user_repo.get_by_email(data.email, tenant_id)
        if user is None or not verify_password(data.password, user.password_hash):
            raise UnauthorizedException("Invalid email or password")

        if user.status.value != "active":
            raise UnauthorizedException("Account is not active")

        # Gather roles and permissions
        user_with_roles = await self.user_repo.get_with_roles(user.id)
        roles: list[str] = []
        permissions: list[str] = []
        if user_with_roles is not None:
            for ur in user_with_roles.user_roles:
                roles.append(ur.role.name)
                for rp in ur.role.role_permissions:
                    perm_str = f"{rp.permission.resource}:{rp.permission.action}"
                    if perm_str not in permissions:
                        permissions.append(perm_str)

        access_token = create_access_token(
            user_id=str(user.id),
            tenant_id=str(user.tenant_id),
            roles=roles,
            permissions=permissions,
        )
        refresh_token = create_refresh_token(
            user_id=str(user.id),
            tenant_id=str(user.tenant_id),
        )

        # Update last login timestamp
        user.last_login_at = datetime.now(timezone.utc)
        await self.session.flush()

        return TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
        )

    async def refresh_token(self, data: str) -> TokenResponse:
        """Validate a refresh token and issue a new token pair."""
        try:
            payload = decode_token(data)
        except Exception:
            raise UnauthorizedException("Invalid or expired refresh token")

        if payload.get("token_type") != "refresh":
            raise UnauthorizedException("Invalid token type")

        # Check if token is blacklisted
        if self.cache is not None:
            blacklisted = await self.cache.get(f"blacklist:{data}")
            if blacklisted:
                raise UnauthorizedException("Token has been revoked")

        user_id = payload["sub"]
        tenant_id = payload["tenant_id"]

        # Fetch fresh roles and permissions
        user_with_roles = await self.user_repo.get_with_roles(user_id)
        if user_with_roles is None:
            raise UnauthorizedException("User not found")

        roles: list[str] = []
        permissions: list[str] = []
        for ur in user_with_roles.user_roles:
            roles.append(ur.role.name)
            for rp in ur.role.role_permissions:
                perm_str = f"{rp.permission.resource}:{rp.permission.action}"
                if perm_str not in permissions:
                    permissions.append(perm_str)

        access_token = create_access_token(
            user_id=user_id,
            tenant_id=tenant_id,
            roles=roles,
            permissions=permissions,
        )
        new_refresh_token = create_refresh_token(
            user_id=user_id,
            tenant_id=tenant_id,
        )

        return TokenResponse(
            access_token=access_token,
            refresh_token=new_refresh_token,
        )

    async def logout(self, token: str) -> None:
        """Blacklist a refresh token in Redis."""
        if self.cache is not None:
            # Blacklist for 7 days (refresh token lifetime)
            await self.cache.set(f"blacklist:{token}", True, ttl=7 * 24 * 3600)
