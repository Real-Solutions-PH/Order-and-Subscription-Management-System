"""Fulfillment & Logistics routes."""

from __future__ import annotations

from datetime import date
from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionChecker, get_current_user
from app.repo.session import get_app_db
from app.schemas.base import MessageResponse
from app.schemas.fulfillment import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
    DeliverySlotCreate,
    DeliverySlotResponse,
    DeliveryZoneCreate,
    DeliveryZoneResponse,
    FulfillmentResponse,
    FulfillmentStatusUpdate,
    ProductionReportResponse,
)
from app.services.fulfillment import (
    AddressService,
    DeliveryZoneService,
    FulfillmentService,
)

router = APIRouter(prefix="", tags=["fulfillment"])


# ---------------------------------------------------------------------------
# Delivery Zones
# ---------------------------------------------------------------------------


@router.get("/delivery-zones", response_model=list[DeliveryZoneResponse])
async def list_delivery_zones(
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """List all active delivery zones for the tenant."""
    service = DeliveryZoneService(session)
    return await service.list_zones(current_user["tenant_id"])


@router.post(
    "/delivery-zones",
    response_model=DeliveryZoneResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_delivery_zone(
    data: DeliveryZoneCreate,
    current_user: dict[str, Any] = Depends(
        PermissionChecker(["fulfillment:write"])
    ),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Create a new delivery zone (admin)."""
    service = DeliveryZoneService(session)
    return await service.create_zone(current_user["tenant_id"], data)


@router.get("/delivery-zones/lookup", response_model=DeliveryZoneResponse | None)
async def lookup_delivery_zone(
    postal_code: str = Query(..., description="Postal code to look up"),
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Look up the delivery zone for a postal code."""
    service = DeliveryZoneService(session)
    return await service.lookup_zone(current_user["tenant_id"], postal_code)


# ---------------------------------------------------------------------------
# Delivery Slots
# ---------------------------------------------------------------------------


@router.get("/delivery-slots", response_model=list[DeliverySlotResponse])
async def get_available_slots(
    zone_id: UUID = Query(..., description="Delivery zone ID"),
    target_date: date = Query(..., alias="date", description="Target delivery date"),
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Get available delivery slots for a zone and date."""
    service = DeliveryZoneService(session)
    return await service.get_available_slots(zone_id, target_date)


# ---------------------------------------------------------------------------
# Fulfillment Orders
# ---------------------------------------------------------------------------


@router.get("/fulfillment/{fulfillment_id}", response_model=FulfillmentResponse)
async def get_fulfillment(
    fulfillment_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Get fulfillment status for an order."""
    service = FulfillmentService(session)
    return await service.get_fulfillment(fulfillment_id, current_user["tenant_id"])


@router.patch(
    "/fulfillment/{fulfillment_id}/status",
    response_model=FulfillmentResponse,
)
async def update_fulfillment_status(
    fulfillment_id: UUID,
    data: FulfillmentStatusUpdate,
    current_user: dict[str, Any] = Depends(
        PermissionChecker(["fulfillment:write"])
    ),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Update the fulfillment status (admin)."""
    service = FulfillmentService(session)
    return await service.update_status(
        fulfillment_id, current_user["tenant_id"], data
    )


# ---------------------------------------------------------------------------
# Production Reports
# ---------------------------------------------------------------------------


@router.get(
    "/production-reports/{report_date}",
    response_model=ProductionReportResponse,
)
async def get_production_report(
    report_date: date,
    current_user: dict[str, Any] = Depends(
        PermissionChecker(["fulfillment:read"])
    ),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Get production report for a specific date (admin)."""
    service = FulfillmentService(session)
    return await service.get_production_report(
        current_user["tenant_id"], report_date
    )


# ---------------------------------------------------------------------------
# Packing Slip (stub)
# ---------------------------------------------------------------------------


@router.get("/fulfillment/{fulfillment_id}/packing-slip")
async def get_packing_slip(
    fulfillment_id: UUID,
    current_user: dict[str, Any] = Depends(
        PermissionChecker(["fulfillment:read"])
    ),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Get packing slip for a fulfillment order.

    TODO: Implement PDF packing slip generation.
    """
    from fastapi.responses import JSONResponse

    return JSONResponse(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        content={"detail": "Packing slip generation not yet implemented"},
    )


# ---------------------------------------------------------------------------
# Addresses
# ---------------------------------------------------------------------------


@router.post(
    "/addresses",
    response_model=AddressResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_address(
    data: AddressCreate,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Create a new delivery address for the current user."""
    service = AddressService(session)
    return await service.create_address(
        current_user["sub"], current_user["tenant_id"], data
    )


@router.get("/addresses", response_model=list[AddressResponse])
async def list_addresses(
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """List all addresses for the current user."""
    service = AddressService(session)
    return await service.list_addresses(
        current_user["sub"], current_user["tenant_id"]
    )


@router.patch("/addresses/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: UUID,
    data: AddressUpdate,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Update an existing address."""
    service = AddressService(session)
    return await service.update_address(
        address_id, current_user["sub"], current_user["tenant_id"], data
    )


@router.delete(
    "/addresses/{address_id}",
    response_model=MessageResponse,
)
async def delete_address(
    address_id: UUID,
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Delete an address."""
    service = AddressService(session)
    await service.delete_address(
        address_id, current_user["sub"], current_user["tenant_id"]
    )
    return MessageResponse(message="Address deleted")
