"""User service for profile management and permission retrieval."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.repo.db import User
from app.repo.iam import UserRepository, UserRoleRepository
from app.schemas.user import UserUpdate


class UserService:
    """Business logic for user operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.user_repo = UserRepository(session)
        self.user_role_repo = UserRoleRepository(session)

    async def get_user(self, user_id: UUID | str, tenant_id: UUID | str) -> User:
        """Retrieve a single user by ID, scoped to tenant."""
        user = await self.user_repo.get_by_id(user_id, tenant_id=tenant_id)
        if user is None:
            raise NotFoundException("User", str(user_id))
        return user

    async def list_users(self, tenant_id: UUID | str, skip: int = 0, limit: int = 100) -> tuple[list[User], int]:
        """Return a paginated list of users and total count."""
        users = await self.user_repo.get_all(skip=skip, limit=limit, tenant_id=tenant_id)
        total = await self.user_repo.count(tenant_id=tenant_id)
        return list(users), total

    async def update_user(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        data: UserUpdate,
    ) -> User:
        """Update a user's profile fields."""
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return await self.get_user(user_id, tenant_id)

        user = await self.user_repo.update(user_id, update_data, tenant_id=tenant_id)
        if user is None:
            raise NotFoundException("User", str(user_id))
        return user

    async def deactivate_user(self, user_id: UUID | str, tenant_id: UUID | str) -> User:
        """Deactivate a user by setting status to inactive."""
        user = await self.user_repo.update(user_id, {"status": "inactive"}, tenant_id=tenant_id)
        if user is None:
            raise NotFoundException("User", str(user_id))
        return user

    async def get_user_permissions(self, user_id: UUID | str) -> list[str]:
        """Fetch all permission strings for a user through their roles."""
        user_roles = await self.user_role_repo.get_user_roles(user_id)
        permissions: list[str] = []
        for ur in user_roles:
            for rp in ur.role.role_permissions:
                perm_str = f"{rp.permission.resource}:{rp.permission.action}"
                if perm_str not in permissions:
                    permissions.append(perm_str)
        return permissions
