"""Service layer for the Product Catalog module."""

import re
from uuid import UUID

from sqlalchemy import select

from app.exceptions import ConflictError, ForbiddenError, NotFoundError
from app.modules.product_catalog.models import (
    Catalog,
    CatalogItem,
    CatalogSchedule,
    Ingredient,
    Product,
    ProductImage,
    ProductIngredient,
    ProductStatus,
    ProductVariant,
)
from app.modules.product_catalog.repo import (
    CatalogRepo,
    IngredientRepo,
    ProductIngredientRepo,
    ProductRepo,
)
from app.modules.product_catalog.schemas import (
    CatalogCreate,
    CatalogItemAdd,
    CatalogScheduleCreate,
    ProductCreate,
    ProductImageCreate,
    ProductIngredientAdd,
    ProductIngredientUpdate,
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
    def __init__(
        self,
        product_repo: ProductRepo,
        product_ingredient_repo: ProductIngredientRepo,
        ingredient_repo: IngredientRepo,
    ):
        self.product_repo = product_repo
        self.product_ingredient_repo = product_ingredient_repo
        self.ingredient_repo = ingredient_repo

    async def list_products(
        self,
        tenant_id: UUID,
        offset: int = 0,
        limit: int = 20,
        status: ProductStatus | None = None,
        search: str | None = None,
        category_id: UUID | None = None,
        sort_by: str = "created_at",
        sort_dir: str = "desc",
        tag: str | None = None,
    ) -> tuple[list[Product], int]:
        return await self.product_repo.list_by_tenant(
            tenant_id, offset, limit, status, search, category_id, sort_by, sort_dir, tag
        )

    async def get_product(self, product_id: UUID) -> Product:
        product = await self.product_repo.get_by_id(product_id)
        if not product:
            raise NotFoundError("Product not found")
        return product

    async def _get_product_for_tenant(self, product_id: UUID, tenant_id: UUID) -> Product:
        """Fetch product and verify it belongs to the given tenant. Raises 403 on mismatch."""
        product = await self.get_product(product_id)
        if product.tenant_id != tenant_id:
            raise ForbiddenError("Not authorized to modify this product")
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

    async def update_product(self, product_id: UUID, tenant_id: UUID, data: ProductUpdate) -> Product:
        await self._get_product_for_tenant(product_id, tenant_id)
        update_data = data.model_dump(exclude_unset=True)

        # Re-slug if name changed
        if "name" in update_data and update_data["name"] is not None:
            update_data["slug"] = _slugify(update_data["name"])

        product = await self.product_repo.update(product_id, **update_data)
        if not product:
            raise NotFoundError("Product not found")
        return product

    async def delete_product(self, product_id: UUID, tenant_id: UUID) -> None:
        """Soft-delete: sets status to 'archived'. Use force_delete_product for hard delete."""
        await self._get_product_for_tenant(product_id, tenant_id)
        await self.product_repo.soft_delete(product_id)

    async def force_delete_product(self, product_id: UUID, tenant_id: UUID) -> None:
        """Hard-delete after verifying no active order/cart references."""
        product = await self._get_product_for_tenant(product_id, tenant_id)

        # Check for references in order items or cart items (bare UUID refs — no FK cascade)
        from app.modules.order_management.models import CartItem, OrderItem

        variant_ids = [v.id for v in product.variants]
        if variant_ids:
            db = self.product_repo.db
            cart_ref = await db.execute(
                select(CartItem.id).where(CartItem.product_variant_id.in_(variant_ids)).limit(1)
            )
            if cart_ref.scalar_one_or_none():
                raise ConflictError("Cannot delete: product variants are referenced by active cart items")
            order_ref = await db.execute(
                select(OrderItem.id).where(OrderItem.product_variant_id.in_(variant_ids)).limit(1)
            )
            if order_ref.scalar_one_or_none():
                raise ConflictError("Cannot delete: product variants are referenced by existing orders")

        await self.product_repo.hard_delete(product_id)

    async def activate_product(self, product_id: UUID, tenant_id: UUID) -> Product:
        await self._get_product_for_tenant(product_id, tenant_id)
        product = await self.product_repo.update(product_id, status=ProductStatus.active)
        if not product:
            raise NotFoundError("Product not found")
        return product

    async def deactivate_product(self, product_id: UUID, tenant_id: UUID) -> Product:
        await self._get_product_for_tenant(product_id, tenant_id)
        product = await self.product_repo.update(product_id, status=ProductStatus.inactive)
        if not product:
            raise NotFoundError("Product not found")
        return product

    async def add_variant(self, product_id: UUID, tenant_id: UUID, data: ProductVariantCreate) -> ProductVariant:
        await self._get_product_for_tenant(product_id, tenant_id)
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

    async def add_image(self, product_id: UUID, tenant_id: UUID, data: ProductImageCreate) -> ProductImage:
        await self._get_product_for_tenant(product_id, tenant_id)
        image = ProductImage(
            product_id=product_id,
            url=data.url,
            alt_text=data.alt_text,
            sort_order=data.sort_order,
            is_primary=data.is_primary,
        )
        return await self.product_repo.add_image(image)

    async def add_recipe_ingredient(
        self,
        product_id: UUID,
        tenant_id: UUID,
        data: ProductIngredientAdd,
    ) -> ProductIngredient:
        await self._get_product_for_tenant(product_id, tenant_id)

        # Normalize name: strip whitespace and lowercase for consistent dedup
        normalized_name = data.name.strip().lower()

        # Find or create the ingredient by name within the tenant
        ingredient = await self.ingredient_repo.get_by_name_and_tenant(normalized_name, tenant_id)
        if not ingredient:
            ingredient = await self.ingredient_repo.create(
                Ingredient(
                    tenant_id=tenant_id,
                    name=normalized_name,
                    default_unit=data.default_unit,
                )
            )
        else:
            # Update default_unit if provided and ingredient doesn't have one yet
            if data.default_unit and not ingredient.default_unit:
                await self.ingredient_repo.update(ingredient.id, default_unit=data.default_unit)

        # Check for duplicate ingredient in this product's recipe
        existing = await self.product_ingredient_repo.get_by_product_and_ingredient(product_id, ingredient.id)
        if existing:
            raise ConflictError(f"Ingredient '{normalized_name}' is already in this recipe")

        item = ProductIngredient(
            product_id=product_id,
            ingredient_id=ingredient.id,
            quantity=data.quantity,
            unit=data.unit,
            notes=data.notes,
        )
        return await self.product_ingredient_repo.add(item)

    async def update_recipe_ingredient(
        self, item_id: UUID, product_id: UUID, tenant_id: UUID, data: ProductIngredientUpdate
    ) -> ProductIngredient:
        item = await self.product_ingredient_repo.get_by_id(item_id)
        if not item:
            raise NotFoundError("Recipe ingredient not found")
        if item.product_id != product_id:
            raise ForbiddenError("Recipe ingredient does not belong to this product")
        await self._get_product_for_tenant(product_id, tenant_id)

        update_data = data.model_dump(exclude_unset=True)
        item = await self.product_ingredient_repo.update(item_id, **update_data)
        if not item:
            raise NotFoundError("Recipe ingredient not found")
        return item

    async def remove_recipe_ingredient(self, item_id: UUID, product_id: UUID, tenant_id: UUID) -> None:
        item = await self.product_ingredient_repo.get_by_id(item_id)
        if not item:
            raise NotFoundError("Recipe ingredient not found")
        if item.product_id != product_id:
            raise ForbiddenError("Recipe ingredient does not belong to this product")
        await self._get_product_for_tenant(product_id, tenant_id)
        await self.product_ingredient_repo.delete(item_id)

    async def list_recipe_ingredients(self, product_id: UUID) -> list[ProductIngredient]:
        await self.get_product(product_id)
        return await self.product_ingredient_repo.get_by_product(product_id)


class IngredientService:
    def __init__(self, ingredient_repo: IngredientRepo):
        self.ingredient_repo = ingredient_repo

    async def list_ingredients(
        self,
        tenant_id: UUID,
        offset: int = 0,
        limit: int = 50,
        search: str | None = None,
        sort_by: str = "name",
        sort_dir: str = "asc",
    ) -> tuple[list[Ingredient], int]:
        return await self.ingredient_repo.list_by_tenant(tenant_id, offset, limit, search, sort_by, sort_dir)

    async def get_ingredient(self, ingredient_id: UUID) -> Ingredient:
        ingredient = await self.ingredient_repo.get_by_id(ingredient_id)
        if not ingredient:
            raise NotFoundError("Ingredient not found")
        return ingredient


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

    async def list_catalog_items(self, catalog_id: UUID) -> list[CatalogItem]:
        await self.get_catalog(catalog_id)
        return await self.catalog_repo.list_items(catalog_id)
