"""Repository layer for the Product Catalog module — DB access only."""

from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.product_catalog.models import (
    Catalog,
    CatalogItem,
    CatalogSchedule,
    CatalogStatus,
    Ingredient,
    Product,
    ProductImage,
    ProductIngredient,
    ProductStatus,
    ProductVariant,
)


class ProductRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_tenant(
        self,
        tenant_id: UUID,
        offset: int = 0,
        limit: int = 20,
        status: ProductStatus | None = None,
        search: str | None = None,
        category_id: UUID | None = None,
    ) -> tuple[list[Product], int]:
        query = select(Product).where(Product.tenant_id == tenant_id)
        count_query = select(func.count()).select_from(Product).where(Product.tenant_id == tenant_id)

        if status:
            query = query.where(Product.status == status)
            count_query = count_query.where(Product.status == status)

        if search:
            pattern = f"%{search}%"
            query = query.where(Product.name.ilike(pattern))
            count_query = count_query.where(Product.name.ilike(pattern))

        query = (
            query.options(
                selectinload(Product.variants),
                selectinload(Product.images),
                selectinload(Product.product_ingredients).selectinload(
                    ProductIngredient.ingredient
                ),
            )
            .offset(offset)
            .limit(limit)
            .order_by(Product.created_at.desc())
        )

        result = await self.db.execute(query)
        count_result = await self.db.execute(count_query)
        return list(result.scalars().all()), count_result.scalar_one()

    async def get_by_id(self, product_id: UUID) -> Product | None:
        result = await self.db.execute(
            select(Product)
            .options(
                selectinload(Product.variants),
                selectinload(Product.images),
                selectinload(Product.attribute_values),
                selectinload(Product.product_ingredients).selectinload(
                    ProductIngredient.ingredient
                ),
            )
            .where(Product.id == product_id)
        )
        return result.scalar_one_or_none()

    async def create(self, product: Product) -> Product:
        self.db.add(product)
        await self.db.flush()
        return product

    async def update(self, product_id: UUID, **kwargs) -> Product | None:
        await self.db.execute(
            update(Product).where(Product.id == product_id).values(**kwargs)
        )
        return await self.get_by_id(product_id)

    async def soft_delete(self, product_id: UUID) -> Product | None:
        return await self.update(product_id, status=ProductStatus.archived)

    async def hard_delete(self, product_id: UUID) -> None:
        await self.db.execute(delete(Product).where(Product.id == product_id))

    async def add_variant(self, variant: ProductVariant) -> ProductVariant:
        self.db.add(variant)
        await self.db.flush()
        return variant

    async def add_image(self, image: ProductImage) -> ProductImage:
        self.db.add(image)
        await self.db.flush()
        return image


class ProductIngredientRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_by_product(self, product_id: UUID) -> list[ProductIngredient]:
        result = await self.db.execute(
            select(ProductIngredient)
            .options(selectinload(ProductIngredient.ingredient))
            .where(ProductIngredient.product_id == product_id)
        )
        return list(result.scalars().all())

    async def get_by_id(self, item_id: UUID) -> ProductIngredient | None:
        result = await self.db.execute(
            select(ProductIngredient)
            .options(selectinload(ProductIngredient.ingredient))
            .where(ProductIngredient.id == item_id)
        )
        return result.scalar_one_or_none()

    async def get_by_product_and_ingredient(
        self, product_id: UUID, ingredient_id: UUID
    ) -> ProductIngredient | None:
        result = await self.db.execute(
            select(ProductIngredient).where(
                ProductIngredient.product_id == product_id,
                ProductIngredient.ingredient_id == ingredient_id,
            )
        )
        return result.scalar_one_or_none()

    async def add(self, item: ProductIngredient) -> ProductIngredient:
        self.db.add(item)
        await self.db.flush()
        return await self.get_by_id(item.id)  # type: ignore[return-value]

    async def update(self, item_id: UUID, **kwargs) -> ProductIngredient | None:
        await self.db.execute(
            update(ProductIngredient)
            .where(ProductIngredient.id == item_id)
            .values(**kwargs)
        )
        return await self.get_by_id(item_id)

    async def delete(self, item_id: UUID) -> None:
        await self.db.execute(
            delete(ProductIngredient).where(ProductIngredient.id == item_id)
        )


class IngredientRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_tenant(
        self,
        tenant_id: UUID,
        offset: int = 0,
        limit: int = 50,
        search: str | None = None,
        sort_by: str = "name",
        sort_dir: str = "asc",
    ) -> tuple[list[Ingredient], int]:
        query = select(Ingredient).where(Ingredient.tenant_id == tenant_id)
        count_query = (
            select(func.count()).select_from(Ingredient).where(Ingredient.tenant_id == tenant_id)
        )

        if search:
            pattern = f"%{search}%"
            query = query.where(Ingredient.name.ilike(pattern))
            count_query = count_query.where(Ingredient.name.ilike(pattern))

        query = query.options(
            selectinload(Ingredient.product_ingredients).selectinload(
                ProductIngredient.product
            )
        )

        # Sorting
        if sort_by == "name":
            col = Ingredient.name
            query = query.order_by(col.asc() if sort_dir == "asc" else col.desc())
        else:
            # usage_count sort is handled post-query
            query = query.order_by(Ingredient.name.asc())

        query = query.offset(offset).limit(limit)

        result = await self.db.execute(query)
        count_result = await self.db.execute(count_query)
        items = list(result.scalars().all())

        if sort_by == "usage_count":
            reverse = sort_dir == "desc"
            items = sorted(
                items, key=lambda i: len(i.product_ingredients), reverse=reverse
            )

        return items, count_result.scalar_one()

    async def get_by_id(self, ingredient_id: UUID) -> Ingredient | None:
        result = await self.db.execute(
            select(Ingredient)
            .options(
                selectinload(Ingredient.product_ingredients).selectinload(
                    ProductIngredient.product
                )
            )
            .where(Ingredient.id == ingredient_id)
        )
        return result.scalar_one_or_none()

    async def get_by_name_and_tenant(self, name: str, tenant_id: UUID) -> Ingredient | None:
        result = await self.db.execute(
            select(Ingredient).where(
                Ingredient.name == name, Ingredient.tenant_id == tenant_id
            )
        )
        return result.scalar_one_or_none()

    async def create(self, ingredient: Ingredient) -> Ingredient:
        self.db.add(ingredient)
        await self.db.flush()
        return ingredient

    async def update(self, ingredient_id: UUID, **kwargs) -> Ingredient | None:
        await self.db.execute(
            update(Ingredient).where(Ingredient.id == ingredient_id).values(**kwargs)
        )
        return await self.get_by_id(ingredient_id)

    async def delete(self, ingredient_id: UUID) -> None:
        await self.db.execute(delete(Ingredient).where(Ingredient.id == ingredient_id))


class CatalogRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_active(self, tenant_id: UUID) -> Catalog | None:
        """Find catalog with published status and an active schedule (now between starts_at and ends_at)."""
        now = datetime.now(timezone.utc)
        result = await self.db.execute(
            select(Catalog)
            .join(CatalogSchedule, CatalogSchedule.catalog_id == Catalog.id)
            .options(
                selectinload(Catalog.items).selectinload(CatalogItem.product_variant),
                selectinload(Catalog.schedules),
            )
            .where(
                Catalog.tenant_id == tenant_id,
                Catalog.status == CatalogStatus.published,
                CatalogSchedule.starts_at <= now,
                CatalogSchedule.ends_at >= now,
            )
            .order_by(Catalog.published_at.desc())
            .limit(1)
        )
        return result.scalar_one_or_none()

    async def get_by_id(self, catalog_id: UUID) -> Catalog | None:
        result = await self.db.execute(
            select(Catalog)
            .options(
                selectinload(Catalog.items).selectinload(CatalogItem.product_variant),
                selectinload(Catalog.schedules),
            )
            .where(Catalog.id == catalog_id)
        )
        return result.scalar_one_or_none()

    async def create(self, catalog: Catalog) -> Catalog:
        self.db.add(catalog)
        await self.db.flush()
        return catalog

    async def add_item(self, item: CatalogItem) -> CatalogItem:
        self.db.add(item)
        await self.db.flush()
        return item

    async def add_schedule(self, schedule: CatalogSchedule) -> CatalogSchedule:
        self.db.add(schedule)
        await self.db.flush()
        return schedule

    async def publish(self, catalog_id: UUID) -> Catalog | None:
        now = datetime.now(timezone.utc)
        await self.db.execute(
            update(Catalog)
            .where(Catalog.id == catalog_id)
            .values(status=CatalogStatus.published, published_at=now)
        )
        return await self.get_by_id(catalog_id)

    async def list_items(self, catalog_id: UUID) -> list[CatalogItem]:
        result = await self.db.execute(
            select(CatalogItem)
            .options(selectinload(CatalogItem.product_variant))
            .where(CatalogItem.catalog_id == catalog_id)
            .order_by(CatalogItem.sort_order)
        )
        return list(result.scalars().all())
