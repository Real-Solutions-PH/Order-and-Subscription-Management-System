"""IAM repository classes for users, roles, permissions, and user-role assignments."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.repo.base import BaseRepository
from app.repo.db import Permission, Role, RolePermission, User, UserRole


class UserRepository(BaseRepository[User]):
    """Repository for user CRUD and lookup operations."""

    model = User

    async def get_by_email(
        self, email: str, tenant_id: UUID | str
    ) -> User | None:
        """Find a user by email within a tenant."""
        stmt = (
            select(User)
            .where(User.email == email, User.tenant_id == tenant_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_with_roles(self, user_id: UUID | str) -> User | None:
        """Fetch a user with eagerly-loaded roles and their permissions."""
        stmt = (
            select(User)
            .where(User.id == user_id)
            .options(
                selectinload(User.user_roles)
                .selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class RoleRepository(BaseRepository[Role]):
    """Repository for role CRUD and lookup operations."""

    model = Role

    async def get_by_name(
        self, name: str, tenant_id: UUID | str
    ) -> Role | None:
        """Find a role by name within a tenant."""
        stmt = (
            select(Role)
            .where(Role.name == name, Role.tenant_id == tenant_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_with_permissions(self, role_id: UUID | str) -> Role | None:
        """Fetch a role with eagerly-loaded permissions."""
        stmt = (
            select(Role)
            .where(Role.id == role_id)
            .options(
                selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class PermissionRepository(BaseRepository[Permission]):
    """Repository for permission CRUD and lookup operations."""

    model = Permission

    async def get_by_resource_action(
        self, resource: str, action: str
    ) -> Permission | None:
        """Find a permission by its resource and action combination."""
        stmt = select(Permission).where(
            Permission.resource == resource, Permission.action == action
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class UserRoleRepository:
    """Repository for managing user-role assignments."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def assign_role(
        self, user_id: UUID | str, role_id: UUID | str
    ) -> UserRole:
        """Assign a role to a user. Returns the created UserRole."""
        user_role = UserRole(user_id=user_id, role_id=role_id)
        self.session.add(user_role)
        await self.session.flush()
        await self.session.refresh(user_role)
        return user_role

    async def remove_role(
        self, user_id: UUID | str, role_id: UUID | str
    ) -> bool:
        """Remove a role from a user. Returns True if a record was deleted."""
        stmt = delete(UserRole).where(
            UserRole.user_id == user_id, UserRole.role_id == role_id
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount > 0

    async def get_user_roles(self, user_id: UUID | str) -> list[UserRole]:
        """Get all role assignments for a user, with role data loaded."""
        stmt = (
            select(UserRole)
            .where(UserRole.user_id == user_id)
            .options(
                selectinload(UserRole.role)
                .selectinload(Role.role_permissions)
                .selectinload(RolePermission.permission)
            )
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
