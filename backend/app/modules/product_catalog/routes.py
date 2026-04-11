"""API routes for the Product Catalog module."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_catalog_service, get_product_service
from app.modules.product_catalog.models import ProductStatus
from app.modules.product_catalog.schemas import (
    CatalogCreate,
    CatalogItemAdd,
    CatalogItemResponse,
    CatalogResponse,
    CatalogScheduleCreate,
    CatalogScheduleResponse,
    ProductCreate,
    ProductImageCreate,
    ProductImageResponse,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
    ProductVariantCreate,
    ProductVariantResponse,
)
from app.modules.product_catalog.services import CatalogService, ProductService
from app.shared.auth import OptionalUser, SuperUser

router = APIRouter(tags=["Product Catalog"])


# ── Product Endpoints ───────────────────────────────────────────────────


@router.post("/products", response_model=ProductResponse, status_code=201)
async def create_product(
    data: ProductCreate,
    current_user: SuperUser,
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
    # Authenticated users use their tenant; public requires tenant_id param
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
    current_user: SuperUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.update_product(product_id, data)


@router.delete("/products/{product_id}", response_model=ProductResponse)
async def delete_product(
    product_id: UUID,
    current_user: SuperUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.delete_product(product_id)


@router.post(
    "/products/{product_id}/variants",
    response_model=ProductVariantResponse,
    status_code=201,
)
async def add_variant(
    product_id: UUID,
    data: ProductVariantCreate,
    current_user: SuperUser,
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
    current_user: SuperUser,
    product_service: Annotated[ProductService, Depends(get_product_service)],
):
    return await product_service.add_image(product_id, data)


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
