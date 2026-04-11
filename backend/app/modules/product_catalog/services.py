"""Service layer for the Product Catalog module."""

import re
from uuid import UUID

from app.exceptions import NotFoundError
from app.modules.product_catalog.models import (
    Catalog,
    CatalogItem,
    CatalogSchedule,
    Product,
    ProductImage,
    ProductStatus,
    ProductVariant,
)
from app.modules.product_catalog.repo import CatalogRepo, ProductRepo
from app.modules.product_catalog.schemas import (
    CatalogCreate,
    CatalogItemAdd,
    CatalogScheduleCreate,
    ProductCreate,
    ProductImageCreate,
    ProductUpdate,
    ProductVariantCreate,
)


def _slugify(text: str) -> str:
    """Generate a URL-friendly slug from text."""
    slug = text.lower().strip()
    slug = re.sub(r"[^\w\s-]", "", slug)
    slug = re.sub(r"[\s_]+", "-", slug)
    slug = re.sub(r"-+", "-", slug)
    return slug.strip("-")


class ProductService:
    def __init__(self, product_repo: ProductRepo):
        self.product_repo = product_repo

    async def list_products(
        self,
        tenant_id: UUID,
        offset: int = 0,
        limit: int = 20,
        status: ProductStatus | None = None,
        search: str | None = None,
        category_id: UUID | None = None,
    ) -> tuple[list[Product], int]:
        return await self.product_repo.list_by_tenant(tenant_id, offset, limit, status, search, category_id)

    async def get_product(self, product_id: UUID) -> Product:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise NotFoundError("Product not found")
        return product

    async def create_product(self, tenant_id: UUID, data: ProductCreate) -> Product:
        product = Product(
            tenant_id=tenant_id,
            name=data.name,
            slug=_slugify(data.name),
            description=data.description,
            short_description=data.short_description,
            sku=data.sku,
            status=data.status,
            is_subscribable=data.is_subscribable,
            is_standalone=data.is_standalone,
            metadata_=data.metadata_,
        )
        return await self.product_repo.create(product)

    async def update_product(self, product_id: UUID, data: ProductUpdate) -> Product:
        update_data = data.model_dump(exclude_unset=True)

        # Re-slug if name changed
        if "name" in update_data and update_data["name"] is not None:
            update_data["slug"] = _slugify(update_data["name"])

        product = await self.product_repo.update(product_id, **update_data)
        if not product:
            raise NotFoundError("Product not found")
        return product

    async def delete_product(self, product_id: UUID) -> Product:
        product = await self.product_repo.soft_delete(product_id)
        if not product:
            raise NotFoundError("Product not found")
        return product

    async def add_variant(self, product_id: UUID, data: ProductVariantCreate) -> ProductVariant:
        # Ensure product exists
        await self.get_product(product_id)
        variant = ProductVariant(
            product_id=product_id,
            name=data.name,
            sku=data.sku,
            price=data.price,
            compare_at_price=data.compare_at_price,
            cost_price=data.cost_price,
            weight=data.weight,
            is_default=data.is_default,
            is_active=data.is_active,
            stock_quantity=data.stock_quantity,
            metadata_=data.metadata_,
        )
        return await self.product_repo.add_variant(variant)

    async def add_image(self, product_id: UUID, data: ProductImageCreate) -> ProductImage:
        # Ensure product exists
        await self.get_product(product_id)
        image = ProductImage(
            product_id=product_id,
            url=data.url,
            alt_text=data.alt_text,
            sort_order=data.sort_order,
            is_primary=data.is_primary,
        )
        return await self.product_repo.add_image(image)


class CatalogService:
    def __init__(self, catalog_repo: CatalogRepo):
        self.catalog_repo = catalog_repo

    async def get_active_catalog(self, tenant_id: UUID) -> Catalog:
        catalog = await self.catalog_repo.get_active(tenant_id)
        if not catalog:
            raise NotFoundError("No active catalog found")
        return catalog

    async def get_catalog(self, catalog_id: UUID) -> Catalog:
        catalog = await self.catalog_repo.get_by_id(catalog_id)
        if not catalog:
            raise NotFoundError("Catalog not found")
        return catalog

    async def create_catalog(self, tenant_id: UUID, data: CatalogCreate) -> Catalog:
        catalog = Catalog(
            tenant_id=tenant_id,
            name=data.name,
            slug=_slugify(data.name),
            description=data.description,
            status=data.status,
        )
        return await self.catalog_repo.create(catalog)

    async def add_catalog_item(self, catalog_id: UUID, data: CatalogItemAdd) -> CatalogItem:
        # Ensure catalog exists
        await self.get_catalog(catalog_id)
        item = CatalogItem(
            catalog_id=catalog_id,
            product_variant_id=data.product_variant_id,
            sort_order=data.sort_order,
            is_featured=data.is_featured,
            availability_limit=data.availability_limit,
        )
        return await self.catalog_repo.add_item(item)

    async def publish_catalog(self, catalog_id: UUID) -> Catalog:
        # Ensure catalog exists
        await self.get_catalog(catalog_id)
        catalog = await self.catalog_repo.publish(catalog_id)
        if not catalog:
            raise NotFoundError("Catalog not found")
        return catalog

    async def schedule_catalog(self, catalog_id: UUID, data: CatalogScheduleCreate) -> CatalogSchedule:
        # Ensure catalog exists
        await self.get_catalog(catalog_id)
        schedule = CatalogSchedule(
            catalog_id=catalog_id,
            starts_at=data.starts_at,
            ends_at=data.ends_at,
            recurrence_rule=data.recurrence_rule,
        )
        return await self.catalog_repo.add_schedule(schedule)
