"""API routes for the Product Catalog module."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response

from app.dependencies import (
    get_catalog_service,
    get_ingredient_repo,
    get_ingredient_service,
    get_product_service,
)
from app.modules.product_catalog.models import ProductStatus
from app.modules.product_catalog.schemas import (
    CatalogCreate,
    CatalogItemAdd,
    CatalogItemResponse,
    CatalogResponse,
    CatalogScheduleCreate,
    CatalogScheduleResponse,
    IngredientListResponse,
    IngredientWithUsageResponse,
    ProductCreate,
    ProductImageCreate,
    ProductImageResponse,
    ProductIngredientAdd,
    ProductIngredientResponse,
    ProductIngredientUpdate,
    ProductListResponse,
    ProductResponse,
    ProductSummaryForIngredient,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
)
from app.modules.product_catalog.services import CatalogService, IngredientService, ProductService
from app.shared.auth import OptionalUser, SuperAdminUser, SuperUser

router = APIRouter(tags=["Product Catalog"])


# ── Product Endpoints ───────────────────────────────────────────────────


@router.post("/products", response_model=ProductResponse, status_code=201)
async def create_product(
    data: ProductCreate,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    product = await product_service.create_product(current_user.tenant_id, data)
    return product


@router.get("/products", response_model=ProductListResponse)
async def list_products(
    product_service: Annotated[ProductService, Depends(get_product_service)],
    current_user: OptionalUser = None,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: ProductStatus | None = None,
    search: str | None = None,
    category_id: UUID | None = None,
    tenant_id: UUID | None = None,
):
    resolved_tenant_id = current_user.tenant_id if current_user else tenant_id
    if not resolved_tenant_id:
        return ProductListResponse(total=0, page=page, per_page=per_page, items=[])

    offset = (page - 1) * per_page
    products, total = await product_service.list_products(
        resolved_tenant_id, offset, per_page, status, search, category_id
    )
    return ProductListResponse(total=total, page=page, per_page=per_page, items=products)


@router.get("/products/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: UUID,
    product_service: Annotated[ProductService, Depends(get_product_service)],
    current_user: OptionalUser = None,
):
    return await product_service.get_product(product_id)


@router.patch("/products/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.update_product(product_id, data)


@router.delete("/products/{product_id}", status_code=204)
async def delete_product(
    product_id: UUID,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    await product_service.delete_product(product_id)
    return Response(status_code=204)


@router.post("/products/{product_id}/activate", response_model=ProductResponse)
async def activate_product(
    product_id: UUID,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.activate_product(product_id)


@router.post("/products/{product_id}/deactivate", response_model=ProductResponse)
async def deactivate_product(
    product_id: UUID,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.deactivate_product(product_id)


@router.post(
    "/products/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=201,
)
async def add_variant(
    product_id: UUID,
    data: ProductVariantCreate,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.add_variant(product_id, data)


@router.post(
    "/products/{product_id}/images",
    response_model=ProductImageResponse,
    status_code=201,
)
async def add_image(
    product_id: UUID,
    data: ProductImageCreate,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.add_image(product_id, data)


# ── Recipe / Ingredient Endpoints ──────────────────────────────────────


@router.get(
    "/products/{product_id}/ingredients",
    response_model=list[ProductIngredientResponse],
)
async def list_recipe_ingredients(
    product_id: UUID,
    current_user: SuperUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.list_recipe_ingredients(product_id)


@router.post(
    "/products/{product_id}/ingredients",
    response_model=ProductIngredientResponse,
    status_code=201,
)
async def add_recipe_ingredient(
    product_id: UUID,
    data: ProductIngredientAdd,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
    ingredient_repo: Annotated[object, Depends(get_ingredient_repo)],
):
    return await product_service.add_recipe_ingredient(product_id, current_user.tenant_id, data, ingredient_repo)


@router.patch(
    "/products/{product_id}/ingredients/{item_id}",
    response_model=ProductIngredientResponse,
)
async def update_recipe_ingredient(
    product_id: UUID,
    item_id: UUID,
    data: ProductIngredientUpdate,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.update_recipe_ingredient(item_id, data)


@router.delete("/products/{product_id}/ingredients/{item_id}", status_code=204)
async def remove_recipe_ingredient(
    product_id: UUID,
    item_id: UUID,
    current_user: SuperAdminUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    await product_service.remove_recipe_ingredient(item_id)
    return Response(status_code=204)


# ── Ingredient Inventory Endpoints ─────────────────────────────────────


@router.get("/ingredients", response_model=IngredientListResponse)
async def list_ingredients(
    current_user: SuperUser,
    ingredient_service: Annotated[IngredientService, Depends(get_ingredient_service)],
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    search: str | None = None,
    sort_by: str = Query("name", pattern="^(name|usage_count)$"),
    sort_dir: str = Query("asc", pattern="^(asc|desc)$"),
):
    offset = (page - 1) * per_page
    items, total = await ingredient_service.list_ingredients(
        current_user.tenant_id, offset, per_page, search, sort_by, sort_dir
    )
    result_items = []
    for ing in items:
        used_in = [
            ProductSummaryForIngredient.model_validate(pi.product)
            for pi in ing.product_ingredients
            if pi.product is not None
        ]
        result_items.append(
            IngredientWithUsageResponse(
                id=ing.id,
                tenant_id=ing.tenant_id,
                name=ing.name,
                default_unit=ing.default_unit,
                description=ing.description,
                created_at=ing.created_at,
                updated_at=ing.updated_at,
                used_in_products=used_in,
            )
        )

    return IngredientListResponse(total=total, page=page, per_page=per_page, items=result_items)


@router.get("/ingredients/{ingredient_id}", response_model=IngredientWithUsageResponse)
async def get_ingredient(
    ingredient_id: UUID,
    current_user: SuperUser,
    ingredient_service: Annotated[IngredientService, Depends(get_ingredient_service)],
):
    ing = await ingredient_service.get_ingredient(ingredient_id)
    used_in = [
        ProductSummaryForIngredient.model_validate(pi.product)
        for pi in ing.product_ingredients
        if pi.product is not None
    ]
    return IngredientWithUsageResponse(
        id=ing.id,
        tenant_id=ing.tenant_id,
        name=ing.name,
        default_unit=ing.default_unit,
        description=ing.description,
        created_at=ing.created_at,
        updated_at=ing.updated_at,
        used_in_products=used_in,
    )


# ── Catalog Endpoints ──────────────────────────────────────────────────


@router.post("/catalogs", response_model=CatalogResponse, status_code=201)
async def create_catalog(
    data: CatalogCreate,
    current_user: SuperUser,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
):
    return await catalog_service.create_catalog(current_user.tenant_id, data)


@router.get("/catalogs/active", response_model=CatalogResponse)
async def get_active_catalog(
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
    current_user: OptionalUser = None,
    tenant_id: UUID | None = None,
):
    resolved_tenant_id = current_user.tenant_id if current_user else tenant_id
    if not resolved_tenant_id:
        from app.exceptions import BadRequestError

        raise BadRequestError("tenant_id is required")
    return await catalog_service.get_active_catalog(resolved_tenant_id)


@router.get("/catalogs/{catalog_id}", response_model=CatalogResponse)
async def get_catalog(
    catalog_id: UUID,
    current_user: SuperUser,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
):
    return await catalog_service.get_catalog(catalog_id)


@router.get("/catalogs/{catalog_id}/items", response_model=list[CatalogItemResponse])
async def list_catalog_items(
    catalog_id: UUID,
    current_user: SuperUser,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
):
    catalog = await catalog_service.get_catalog(catalog_id)
    return catalog.items


@router.post(
    "/catalogs/{catalog_id}/items",
    response_model=CatalogItemResponse,
    status_code=201,
)
async def add_catalog_item(
    catalog_id: UUID,
    data: CatalogItemAdd,
    current_user: SuperUser,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
):
    return await catalog_service.add_catalog_item(catalog_id, data)


@router.post("/catalogs/{catalog_id}/publish", response_model=CatalogResponse)
async def publish_catalog(
    catalog_id: UUID,
    current_user: SuperUser,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
):
    return await catalog_service.publish_catalog(catalog_id)


@router.post(
    "/catalogs/{catalog_id}/schedule",
    response_model=CatalogScheduleResponse,
    status_code=201,
)
async def schedule_catalog(
    catalog_id: UUID,
    data: CatalogScheduleCreate,
    current_user: SuperUser,
    catalog_service: Annotated[CatalogService, Depends(get_catalog_service)],
):
    return await catalog_service.schedule_catalog(catalog_id, data)
