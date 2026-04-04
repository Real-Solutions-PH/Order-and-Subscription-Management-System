"""Generic base service wrapping common CRUD operations."""

from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import RedisCache
from app.repo.base import BaseRepository

RepoT = TypeVar("RepoT", bound=BaseRepository)  # type: ignore[type-arg]


class BaseService(Generic[RepoT]):
    """Thin service layer that delegates persistence to a repository.

    Sub-classes should set ``repository_class`` to the concrete repo::

        class OrderService(BaseService[OrderRepository]):
            repository_class = OrderRepository
    """

    repository_class: type[RepoT]

    def __init__(
        self,
        session: AsyncSession,
        cache: RedisCache | None = None,
    ) -> None:
        self.session = session
        self.cache = cache
        self.repo: RepoT = self.repository_class(session)

    async def get(
        self,
        record_id: UUID | str,
        tenant_id: UUID | str | None = None,
    ) -> Any | None:
        """Retrieve a single record by ID."""
        return await self.repo.get_by_id(record_id, tenant_id=tenant_id)

    async def list(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: UUID | str | None = None,
    ) -> Sequence[Any]:
        """Return a paginated list of records."""
        return await self.repo.get_all(skip=skip, limit=limit, tenant_id=tenant_id)

    async def create(self, data: dict[str, Any]) -> Any:
        """Create a new record."""
        return await self.repo.create(data)

    async def update(
        self,
        record_id: UUID | str,
        data: dict[str, Any],
        tenant_id: UUID | str | None = None,
    ) -> Any | None:
        """Update an existing record."""
        return await self.repo.update(record_id, data, tenant_id=tenant_id)

    async def delete(
        self,
        record_id: UUID | str,
        tenant_id: UUID | str | None = None,
    ) -> bool:
        """Delete (or soft-delete) a record."""
        return await self.repo.delete(record_id, tenant_id=tenant_id)
