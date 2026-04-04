"""Services for the Product Catalog module."""

from __future__ import annotations

import json
from typing import Any, Sequence
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import RedisCache, get_cache
from app.core.events import get_event_bus
from app.core.exceptions import BadRequestException, NotFoundException
from app.repo.db import (
    CatalogStatus,
    Product,
    ProductAttributeValue,
    ProductImage,
    ProductStatus,
    ProductVariant,
)
from app.repo.product import (
    CatalogItemRepository,
    CatalogRepository,
    ProductAttributeRepository,
    ProductCategoryRepository,
    ProductRepository,
    ProductVariantRepository,
)
from app.schemas.base import PaginatedResponse
from app.schemas.product import (
    AttributeValueSet,
    CatalogCreate,
    CatalogItemCreate,
    CatalogScheduleCreate,
    ImageCreate,
    ProductCreate,
    ProductResponse,
    ProductUpdate,
    VariantCreate,
)
from app.utils.slug import generate_slug


class ProductService:
    """Domain logic for products, variants, images, and attributes."""

    def __init__(
        self,
        session: AsyncSession,
        cache: RedisCache | None = None,
    ) -> None:
        self.session = session
        self.cache = cache
        self.product_repo = ProductRepository(session)
        self.variant_repo = ProductVariantRepository(session)
        self.category_repo = ProductCategoryRepository(session)
        self.attribute_repo = ProductAttributeRepository(session)

    # ------------------------------------------------------------------
    # Products
    # ------------------------------------------------------------------

    async def create_product(self, tenant_id: UUID | str, data: ProductCreate) -> Product:
        slug = generate_slug(data.name)
        product = await self.product_repo.create(
            {
                "tenant_id": tenant_id,
                "name": data.name,
                "slug": slug,
                "description": data.description,
                "short_description": data.short_description,
                "sku": data.sku,
                "is_subscribable": data.is_subscribable,
                "is_standalone": data.is_standalone,
                "metadata_": data.metadata,
            }
        )

        # Create a default variant
        await self.variant_repo.create(
            {
                "product_id": product.id,
                "name": "Default",
                "sku": data.sku or f"{slug}-default",
                "price": 0,
                "is_default": True,
            }
        )

        # Associate categories
        if data.category_ids:
            for cat_id in data.category_ids:
                cat = await self.category_repo.get_by_id(cat_id, tenant_id=tenant_id)
                if cat:
                    product.categories.append(cat)
            await self.session.flush()

        return await self.product_repo.get_with_details(product.id)  # type: ignore[return-value]

    async def update_product(
        self,
        product_id: UUID | str,
        tenant_id: UUID | str,
        data: ProductUpdate,
    ) -> Product:
        product = await self.product_repo.get_by_id(product_id, tenant_id=tenant_id)
        if product is None:
            raise NotFoundException("Product", str(product_id))

        update_data: dict[str, Any] = data.model_dump(exclude_unset=True)

        # Handle slug regeneration if name changes
        if "name" in update_data:
            update_data["slug"] = generate_slug(update_data["name"])

        # Handle metadata field mapping
        if "metadata" in update_data:
            update_data["metadata_"] = update_data.pop("metadata")

        # Handle category reassignment
        category_ids = update_data.pop("category_ids", None)

        updated = await self.product_repo.update(product_id, update_data, tenant_id=tenant_id)

        if category_ids is not None and updated is not None:
            updated.categories.clear()
            for cat_id in category_ids:
                cat = await self.category_repo.get_by_id(cat_id, tenant_id=tenant_id)
                if cat:
                    updated.categories.append(cat)
            await self.session.flush()

        # Invalidate cache
        if self.cache:
            await self.cache.delete(f"product:{product_id}")

        return await self.product_repo.get_with_details(product_id)  # type: ignore[return-value]

    async def get_product(self, product_id: UUID | str, tenant_id: UUID | str) -> Product:
        # Try cache first
        if self.cache:
            cached = await self.cache.get(f"product:{product_id}")
            if cached is not None:
                return cached  # type: ignore[return-value]

        product = await self.product_repo.get_with_details(product_id)
        if product is None or product.tenant_id != tenant_id:
            raise NotFoundException("Product", str(product_id))

        # Populate cache
        if self.cache:
            await self.cache.set(
                f"product:{product_id}",
                json.loads(ProductResponse.model_validate(product).model_dump_json()),
                ttl=300,
            )

        return product

    async def list_products(
        self,
        tenant_id: UUID | str,
        skip: int = 0,
        limit: int = 20,
        filters: dict[str, Any] | None = None,
    ) -> PaginatedResponse[ProductResponse]:
        items, total = await self.product_repo.search(
            tenant_id=tenant_id,
            filters=filters,
            skip=skip,
            limit=limit,
        )
        page = (skip // limit) + 1 if limit > 0 else 1
        return PaginatedResponse[ProductResponse].build(
            items=[ProductResponse.model_validate(p) for p in items],
            total=total,
            page=page,
            page_size=limit,
        )

    async def search_products(
        self,
        tenant_id: UUID | str,
        query: str,
        attribute_filters: dict[str, str] | None = None,
    ) -> Sequence[Product]:
        filters: dict[str, Any] = {}
        if attribute_filters:
            filters["attributes"] = attribute_filters
        items, _ = await self.product_repo.search(
            tenant_id=tenant_id,
            query=query,
            filters=filters,
        )
        return items

    async def delete_product(self, product_id: UUID | str, tenant_id: UUID | str) -> Product:
        """Soft-delete a product by setting its status to archived."""
        product = await self.product_repo.get_by_id(product_id, tenant_id=tenant_id)
        if product is None:
            raise NotFoundException("Product", str(product_id))

        updated = await self.product_repo.update(
            product_id,
            {"status": ProductStatus.archived},
            tenant_id=tenant_id,
        )

        if self.cache:
            await self.cache.delete(f"product:{product_id}")

        return updated  # type: ignore[return-value]

    # ------------------------------------------------------------------
    # Variants
    # ------------------------------------------------------------------

    async def add_variant(self, product_id: UUID | str, data: VariantCreate) -> ProductVariant:
        variant = await self.variant_repo.create(
            {
                "product_id": product_id,
                "name": data.name,
                "sku": data.sku or generate_slug(data.name),
                "price": data.price,
                "compare_at_price": data.compare_at_price,
                "cost_price": data.cost_price,
                "weight": data.weight,
                "is_default": data.is_default,
                "metadata_": data.metadata,
            }
        )
        return variant

    # ------------------------------------------------------------------
    # Images
    # ------------------------------------------------------------------

    async def add_image(self, product_id: UUID | str, data: ImageCreate) -> ProductImage:
        image = ProductImage(
            product_id=product_id,
            url=data.url,
            alt_text=data.alt_text,
            sort_order=data.sort_order or 0,
            is_primary=data.is_primary,
        )
        self.session.add(image)
        await self.session.flush()
        await self.session.refresh(image)
        return image

    # ------------------------------------------------------------------
    # Attributes
    # ------------------------------------------------------------------

    async def set_attributes(
        self,
        product_id: UUID | str,
        attributes: list[AttributeValueSet],
    ) -> None:
        """Replace all attribute values for a product."""
        from sqlalchemy import delete

        await self.session.execute(delete(ProductAttributeValue).where(ProductAttributeValue.product_id == product_id))

        for attr in attributes:
            av = ProductAttributeValue(
                product_id=product_id,
                attribute_id=attr.attribute_id,
                value=attr.value,
            )
            self.session.add(av)

        await self.session.flush()


class CatalogService:
    """Domain logic for catalogs, catalog items, and schedules."""

    def __init__(
        self,
        session: AsyncSession,
        cache: RedisCache | None = None,
    ) -> None:
        self.session = session
        self.cache = cache
        self.catalog_repo = CatalogRepository(session)
        self.item_repo = CatalogItemRepository(session)

    async def create_catalog(self, tenant_id: UUID | str, data: CatalogCreate):
        slug = generate_slug(data.name)
        return await self.catalog_repo.create(
            {
                "tenant_id": tenant_id,
                "name": data.name,
                "slug": slug,
                "description": data.description,
            }
        )

    async def publish_catalog(self, catalog_id: UUID | str, tenant_id: UUID | str):
        from datetime import datetime, timezone

        catalog = await self.catalog_repo.get_by_id(catalog_id, tenant_id=tenant_id)
        if catalog is None:
            raise NotFoundException("Catalog", str(catalog_id))

        if catalog.status == CatalogStatus.published:
            raise BadRequestException("Catalog is already published")

        updated = await self.catalog_repo.update(
            catalog_id,
            {
                "status": CatalogStatus.published,
                "published_at": datetime.now(timezone.utc),
            },
            tenant_id=tenant_id,
        )

        # Invalidate active catalog cache
        if self.cache:
            await self.cache.delete(f"catalog:active:{tenant_id}")

        # Emit event
        event_bus = get_event_bus()
        await event_bus.publish(
            "catalog.published",
            {"catalog_id": str(catalog_id), "tenant_id": str(tenant_id)},
        )

        return updated

    async def get_active_catalog(self, tenant_id: UUID | str):
        # Try cache first
        if self.cache:
            cached = await self.cache.get(f"catalog:active:{tenant_id}")
            if cached is not None:
                return cached

        catalog = await self.catalog_repo.get_active(tenant_id)
        if catalog is None:
            raise NotFoundException("Active catalog")

        if self.cache:
            from app.schemas.product import CatalogResponse

            await self.cache.set(
                f"catalog:active:{tenant_id}",
                json.loads(CatalogResponse.model_validate(catalog).model_dump_json()),
                ttl=300,
            )

        return catalog

    async def add_catalog_items(
        self,
        catalog_id: UUID | str,
        items: list[CatalogItemCreate],
    ):
        created = []
        for item in items:
            ci = await self.item_repo.create(
                {
                    "catalog_id": catalog_id,
                    "product_variant_id": item.product_variant_id,
                    "sort_order": item.sort_order or 0,
                    "is_featured": item.is_featured,
                    "availability_limit": item.availability_limit,
                }
            )
            created.append(ci)
        return created

    async def schedule_catalog(
        self,
        catalog_id: UUID | str,
        schedule: CatalogScheduleCreate,
    ):
        from app.repo.db import CatalogSchedule

        cs = CatalogSchedule(
            catalog_id=catalog_id,
            starts_at=schedule.starts_at,
            ends_at=schedule.ends_at,
            recurrence_rule=schedule.recurrence_rule,
        )
        self.session.add(cs)
        await self.session.flush()
        await self.session.refresh(cs)
        return cs
