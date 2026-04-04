"""Repositories for the Product Catalog module."""

from __future__ import annotations

from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.repo.base import BaseRepository
from app.repo.db import (
    Catalog,
    CatalogItem,
    CatalogSchedule,
    CatalogStatus,
    Product,
    ProductAttribute,
    ProductAttributeValue,
    ProductCategory,
    ProductStatus,
    ProductVariant,
)


class ProductRepository(BaseRepository[Product]):
    model = Product

    async def get_by_slug(
        self, slug: str, tenant_id: UUID | str
    ) -> Product | None:
        stmt = (
            select(self.model)
            .where(self.model.slug == slug)
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_with_details(self, product_id: UUID | str) -> Product | None:
        stmt = (
            select(self.model)
            .where(self.model.id == product_id)
            .options(
                selectinload(self.model.variants),
                selectinload(self.model.images),
                selectinload(self.model.categories),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search(
        self,
        tenant_id: UUID | str,
        query: str | None = None,
        filters: dict[str, Any] | None = None,
        skip: int = 0,
        limit: int = 100,
    ) -> tuple[Sequence[Product], int]:
        """Search products with optional text query and attribute filters.

        Returns a tuple of (items, total_count).
        """
        from sqlalchemy import func

        stmt = (
            select(self.model)
            .options(
                selectinload(self.model.variants),
                selectinload(self.model.images),
            )
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)

        # Exclude archived by default unless explicitly filtered
        if filters and "status" in filters:
            stmt = stmt.where(self.model.status == filters["status"])
        else:
            stmt = stmt.where(self.model.status != ProductStatus.archived)

        if query:
            pattern = f"%{query}%"
            stmt = stmt.where(
                self.model.name.ilike(pattern)
                | self.model.description.ilike(pattern)
            )

        if filters:
            if "is_subscribable" in filters:
                stmt = stmt.where(
                    self.model.is_subscribable == filters["is_subscribable"]
                )
            if "is_standalone" in filters:
                stmt = stmt.where(
                    self.model.is_standalone == filters["is_standalone"]
                )
            if "category_id" in filters:
                stmt = stmt.where(
                    self.model.categories.any(
                        ProductCategory.id == filters["category_id"]
                    )
                )

        # Attribute filtering
        if filters and "attributes" in filters:
            for attr_id, attr_value in filters["attributes"].items():
                stmt = stmt.where(
                    self.model.attribute_values.any(
                        (ProductAttributeValue.attribute_id == attr_id)
                        & (ProductAttributeValue.value == attr_value)
                    )
                )

        # Count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total = (await self.session.execute(count_stmt)).scalar_one()

        # Paginate
        stmt = stmt.offset(skip).limit(limit)
        result = await self.session.execute(stmt)
        return result.scalars().all(), total


class ProductVariantRepository(BaseRepository[ProductVariant]):
    model = ProductVariant

    async def get_by_product(
        self, product_id: UUID | str
    ) -> Sequence[ProductVariant]:
        stmt = select(self.model).where(self.model.product_id == product_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_by_sku(
        self, sku: str, tenant_id: UUID | str
    ) -> ProductVariant | None:
        stmt = (
            select(self.model)
            .join(Product, self.model.product_id == Product.id)
            .where(self.model.sku == sku)
            .where(Product.tenant_id == tenant_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class ProductCategoryRepository(BaseRepository[ProductCategory]):
    model = ProductCategory

    async def get_by_slug(
        self, slug: str, tenant_id: UUID | str
    ) -> ProductCategory | None:
        stmt = (
            select(self.model)
            .where(self.model.slug == slug)
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_tree(
        self, tenant_id: UUID | str
    ) -> Sequence[ProductCategory]:
        """Return all categories for a tenant (hierarchical via parent_id)."""
        stmt = (
            select(self.model)
            .options(selectinload(self.model.children))
            .where(self.model.parent_id.is_(None))
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        stmt = stmt.order_by(self.model.sort_order)
        result = await self.session.execute(stmt)
        return result.scalars().all()


class ProductAttributeRepository(BaseRepository[ProductAttribute]):
    model = ProductAttribute

    async def get_filterable(
        self, tenant_id: UUID | str
    ) -> Sequence[ProductAttribute]:
        stmt = (
            select(self.model)
            .where(self.model.is_filterable.is_(True))
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()


class CatalogRepository(BaseRepository[Catalog]):
    model = Catalog

    async def get_by_slug(
        self, slug: str, tenant_id: UUID | str
    ) -> Catalog | None:
        stmt = (
            select(self.model)
            .where(self.model.slug == slug)
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active(self, tenant_id: UUID | str) -> Catalog | None:
        """Return the currently active catalog based on schedule.

        Falls back to the most recently published catalog if no schedule matches.
        """
        from sqlalchemy import func as sa_func

        now = sa_func.now()

        # Try schedule-based lookup first
        stmt = (
            select(self.model)
            .join(CatalogSchedule, CatalogSchedule.catalog_id == self.model.id)
            .where(
                self.model.status == CatalogStatus.published,
                CatalogSchedule.starts_at <= now,
                CatalogSchedule.ends_at >= now,
            )
            .options(selectinload(self.model.items))
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        catalog = result.scalar_one_or_none()

        if catalog is not None:
            return catalog

        # Fallback: most recently published
        stmt = (
            select(self.model)
            .where(self.model.status == CatalogStatus.published)
            .options(selectinload(self.model.items))
            .order_by(self.model.published_at.desc())
            .limit(1)
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class CatalogItemRepository(BaseRepository[CatalogItem]):
    model = CatalogItem

    async def get_by_catalog(
        self, catalog_id: UUID | str
    ) -> Sequence[CatalogItem]:
        stmt = (
            select(self.model)
            .where(self.model.catalog_id == catalog_id)
            .order_by(self.model.sort_order)
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()
