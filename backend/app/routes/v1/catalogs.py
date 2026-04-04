"""Catalog API routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_cache
from app.core.permissions import PermissionChecker, get_current_user
from app.repo.session import get_app_db
from app.schemas.product import (
    CatalogCreate,
    CatalogItemCreate,
    CatalogItemResponse,
    CatalogResponse,
    CatalogScheduleCreate,
)
from app.services.product import CatalogService

router = APIRouter(prefix="/catalogs", tags=["catalogs"])


def _catalog_service(
    session: AsyncSession = Depends(get_app_db),
) -> CatalogService:
    return CatalogService(session, cache=get_cache())


@router.post(
    "/",
    response_model=CatalogResponse,
    status_code=201,
)
async def create_catalog(
    data: CatalogCreate,
    user: dict[str, Any] = Depends(PermissionChecker(["catalogs:create"])),
    service: CatalogService = Depends(_catalog_service),
) -> Any:
    """Create a new catalog."""
    tenant_id = user["tenant_id"]
    return await service.create_catalog(tenant_id, data)


@router.get(
    "/active",
    response_model=CatalogResponse,
)
async def get_active_catalog(
    user: dict[str, Any] = Depends(get_current_user),
    service: CatalogService = Depends(_catalog_service),
) -> Any:
    """Get the currently active catalog."""
    tenant_id = user["tenant_id"]
    return await service.get_active_catalog(tenant_id)


@router.get(
    "/{catalog_id}",
    response_model=CatalogResponse,
)
async def get_catalog(
    catalog_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
    service: CatalogService = Depends(_catalog_service),
) -> Any:
    """Get catalog detail."""
    tenant_id = user["tenant_id"]
    from app.core.exceptions import NotFoundException

    catalog = await service.catalog_repo.get_by_id(catalog_id, tenant_id=tenant_id)
    if catalog is None:
        raise NotFoundException("Catalog", str(catalog_id))
    return catalog


@router.post(
    "/{catalog_id}/publish",
    response_model=CatalogResponse,
)
async def publish_catalog(
    catalog_id: UUID,
    user: dict[str, Any] = Depends(PermissionChecker(["catalogs:publish"])),
    service: CatalogService = Depends(_catalog_service),
) -> Any:
    """Publish a catalog, making it available to subscribers."""
    tenant_id = user["tenant_id"]
    return await service.publish_catalog(catalog_id, tenant_id)


@router.post(
    "/{catalog_id}/items",
    response_model=list[CatalogItemResponse],
    status_code=201,
)
async def add_catalog_items(
    catalog_id: UUID,
    items: list[CatalogItemCreate],
    user: dict[str, Any] = Depends(PermissionChecker(["catalogs:update"])),
    service: CatalogService = Depends(_catalog_service),
) -> Any:
    """Add items to a catalog."""
    return await service.add_catalog_items(catalog_id, items)


@router.get(
    "/{catalog_id}/items",
    response_model=list[CatalogItemResponse],
)
async def list_catalog_items(
    catalog_id: UUID,
    user: dict[str, Any] = Depends(get_current_user),
    service: CatalogService = Depends(_catalog_service),
) -> Any:
    """List items in a catalog."""
    return await service.item_repo.get_by_catalog(catalog_id)


@router.post(
    "/{catalog_id}/schedule",
    status_code=201,
)
async def schedule_catalog(
    catalog_id: UUID,
    schedule: CatalogScheduleCreate,
    user: dict[str, Any] = Depends(PermissionChecker(["catalogs:update"])),
    service: CatalogService = Depends(_catalog_service),
) -> Any:
    """Schedule a catalog for a time window."""
    return await service.schedule_catalog(catalog_id, schedule)
