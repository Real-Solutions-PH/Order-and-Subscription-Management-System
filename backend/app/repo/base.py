"""Generic base repository with async CRUD and tenant filtering."""

from __future__ import annotations

from typing import Any, Generic, Sequence, TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repo.db import Base

T = TypeVar("T", bound=Base)


class BaseRepository(Generic[T]):
    """Async repository providing common CRUD operations for a SQLAlchemy model.

    Sub-classes should set ``model`` to the concrete ORM class::

        class OrderRepository(BaseRepository[Order]):
            model = Order
    """

    model: type[T]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _apply_tenant_filter(self, stmt: Any, tenant_id: UUID | str | None) -> Any:
        """Restrict the query to the given tenant when applicable."""
        if tenant_id is not None and hasattr(self.model, "tenant_id"):
            stmt = stmt.where(self.model.tenant_id == tenant_id)  # type: ignore[attr-defined]
        return stmt

    # ------------------------------------------------------------------
    # Read
    # ------------------------------------------------------------------

    async def get_by_id(
        self,
        record_id: UUID | str,
        tenant_id: UUID | str | None = None,
    ) -> T | None:
        """Fetch a single record by primary key, optionally scoped to a tenant."""
        stmt = select(self.model).where(self.model.id == record_id)  # type: ignore[attr-defined]
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        skip: int = 0,
        limit: int = 100,
        tenant_id: UUID | str | None = None,
    ) -> Sequence[T]:
        """Return a paginated list of records, optionally scoped to a tenant."""
        stmt = select(self.model).offset(skip).limit(limit)
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def count(self, tenant_id: UUID | str | None = None) -> int:
        """Return the total number of records, optionally scoped to a tenant."""
        stmt = select(func.count()).select_from(self.model)
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    # ------------------------------------------------------------------
    # Write
    # ------------------------------------------------------------------

    async def create(self, data: dict[str, Any]) -> T:
        """Insert a new record from a dictionary of column values."""
        instance = self.model(**data)
        self.session.add(instance)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def update(
        self,
        record_id: UUID | str,
        data: dict[str, Any],
        tenant_id: UUID | str | None = None,
    ) -> T | None:
        """Update an existing record.  Returns the updated instance or None."""
        instance = await self.get_by_id(record_id, tenant_id=tenant_id)
        if instance is None:
            return None
        for key, value in data.items():
            setattr(instance, key, value)
        await self.session.flush()
        await self.session.refresh(instance)
        return instance

    async def delete(
        self,
        record_id: UUID | str,
        tenant_id: UUID | str | None = None,
    ) -> bool:
        """Delete a record.

        If the model has an ``is_active`` column the record is soft-deleted
        (set to ``False``).  Otherwise a hard delete is performed.

        Returns True if a record was found and removed/deactivated.
        """
        instance = await self.get_by_id(record_id, tenant_id=tenant_id)
        if instance is None:
            return False

        if hasattr(instance, "is_active"):
            instance.is_active = False  # type: ignore[attr-defined]
            await self.session.flush()
        else:
            await self.session.delete(instance)
            await self.session.flush()

        return True
