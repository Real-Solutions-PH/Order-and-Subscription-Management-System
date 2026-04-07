"""Product Catalog API routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_cache
from app.core.permissions import PermissionChecker, get_current_user
from app.repo.session import get_app_db
from app.schemas.product import (
    AttributeValueSet,
    ImageCreate,
    ImageResponse,
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
    VariantCreate,
    VariantResponse,
)
from app.services.product import ProductService

router = APIRouter(prefix="/products", tags=["products"])


def _product_service(
    session: AsyncSession = Depends(get_app_db),
) -> ProductService:
    return ProductService(session, cache=get_cache())


# ------------------------------------------------------------------
# Products
# ------------------------------------------------------------------


@router.post(
    "/",
    response_model=ProductResponse,
    status_code=201,
)
async def create_product(
    data: ProductCreate,
    user: dict[str, Any] = Depends(PermissionChecker(["products:create"])),
    service: ProductService = Depends(_product_service),
) -> Any:
    """Create a new product."""
    tenant_id = user["tenant_id"]
    product = await service.create_product(tenant_id, data)
    return product


@router.get(
    "/",
    response_model=ProductListResponse,
)
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
    is_subscribable: bool | None = Query(None),
    is_standalone: bool | None = Query(None),
    category_id: UUID | None = Query(None),
    q: str | None = Query(None, description="Search query"),
    user: dict[str, Any] = Depends(get_current_user),
    service: ProductService = Depends(_product_service),
) -> Any:
    """List products with optional filters."""
    tenant_id = user["tenant_id"]
    filters: dict[str, Any] = {}
    if status is not None:
        filters["status"] = status
    if is_subscribable is not None:
        filters["is_subscribable"] = is_subscribable
    if is_standalone is not None:
        filters["is_standalone"] = is_standalone
    if category_id is not None:
        filters["category_id"] = category_id

    if q:
        items = await service.search_products(tenant_id, q)
        from app.schemas.base import PaginatedResponse
        from app.schemas.product import ProductResponse

        return PaginatedResponse[ProductResponse].build(
            items=[ProductResponse.model_validate(p) for p in items],
            total=len(items),
            page=1,
            page_size=len(items) or 1,
        )

    return await service.list_products(tenant_id, skip=skip, limit=limit, filters=filters)


@router.get(
    "/{product_id}",
    response_model=ProductResponse,
)
async def get_product(
    product_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
    service: ProductService = Depends(_product_service),
) -> Any:
    """Get product detail."""
    tenant_id = user["tenant_id"]
    return await service.get_product(product_id, tenant_id)


@router.patch(
    "/{product_id}",
    response_model=ProductResponse,
)
async def update_product(
    product_id: UUID,
    data: ProductUpdate,
    user: dict[str, Any] = Depends(PermissionChecker(["products:update"])),
    service: ProductService = Depends(_product_service),
) -> Any:
    """Update an existing product."""
    tenant_id = user["tenant_id"]
    return await service.update_product(product_id, tenant_id, data)


@router.delete(
    "/{product_id}",
    response_model=ProductResponse,
)
async def delete_product(
    product_id: UUID,
    user: dict[str, Any] = Depends(PermissionChecker(["products:delete"])),
    service: ProductService = Depends(_product_service),
) -> Any:
    """Archive a product (soft-delete)."""
    tenant_id = user["tenant_id"]
    return await service.delete_product(product_id, tenant_id)


# ------------------------------------------------------------------
# Variants
# ------------------------------------------------------------------


@router.post(
    "/{product_id}/variants",
    response_model=VariantResponse,
    status_code=201,
)
async def add_variant(
    product_id: UUID,
    data: VariantCreate,
    user: dict[str, Any] = Depends(PermissionChecker(["products:update"])),
    service: ProductService = Depends(_product_service),
) -> Any:
    """Add a variant to a product."""
    return await service.add_variant(product_id, data)


# ------------------------------------------------------------------
# Images
# ------------------------------------------------------------------


@router.post(
    "/{product_id}/images",
    response_model=ImageResponse,
    status_code=201,
)
async def add_image(
    product_id: UUID,
    data: ImageCreate,
    user: dict[str, Any] = Depends(PermissionChecker(["products:update"])),
    service: ProductService = Depends(_product_service),
) -> Any:
    """Add an image to a product."""
    return await service.add_image(product_id, data)


# ------------------------------------------------------------------
# Attributes
# ------------------------------------------------------------------


@router.post(
    "/{product_id}/attributes",
    status_code=204,
)
async def set_attributes(
    product_id: UUID,
    attributes: list[AttributeValueSet],
    user: dict[str, Any] = Depends(PermissionChecker(["products:update"])),
    service: ProductService = Depends(_product_service),
) -> None:
    """Set attribute values for a product (replaces existing)."""
    await service.set_attributes(product_id, attributes)
