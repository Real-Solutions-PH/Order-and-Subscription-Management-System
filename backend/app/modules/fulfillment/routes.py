"""Fulfillment & Logistics API routes."""

from datetime import date
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import (
    get_address_service,
    get_delivery_zone_service,
    get_fulfillment_service,
)
from app.modules.fulfillment.schemas import (
    AddressCreate,
    AddressResponse,
    AddressUpdate,
    DeliverySlotAvailability,
    DeliveryZoneCreate,
    DeliveryZoneResponse,
    FulfillmentResponse,
    FulfillmentStatusUpdate,
    ProductionReportResponse,
)
from app.modules.fulfillment.services import (
    AddressService,
    DeliveryZoneService,
    FulfillmentService,
)
from app.shared.auth import CurrentUser, SuperUser

router = APIRouter(tags=["Fulfillment"])


# ── Address Endpoints ──────────────────────────────────────────────────

@router.post("/addresses", response_model=AddressResponse, status_code=201)
async def create_address(
    body: AddressCreate,
    user: CurrentUser,
    address_service: Annotated[AddressService, Depends(get_address_service)],
):
    """Create a new delivery address for the current user."""
    return await address_service.create_address(
        tenant_id=user.tenant_id,
        user_id=user.id,
        data=body.model_dump(),
    )


@router.get("/addresses", response_model=list[AddressResponse])
async def list_addresses(
    user: CurrentUser,
    address_service: Annotated[AddressService, Depends(get_address_service)],
):
    """List all addresses for the current user."""
    return await address_service.list_addresses(
        user_id=user.id,
        tenant_id=user.tenant_id,
    )


@router.patch("/addresses/{address_id}", response_model=AddressResponse)
async def update_address(
    address_id: UUID,
    body: AddressUpdate,
    user: CurrentUser,
    address_service: Annotated[AddressService, Depends(get_address_service)],
):
    """Update an existing address."""
    return await address_service.update_address(
        address_id=address_id,
        data=body.model_dump(exclude_unset=True),
    )


@router.delete("/addresses/{address_id}", status_code=204)
async def delete_address(
    address_id: UUID,
    user: CurrentUser,
    address_service: Annotated[AddressService, Depends(get_address_service)],
):
    """Delete an address."""
    await address_service.delete_address(address_id)


# ── Delivery Zone Endpoints ────────────────────────────────────────────

@router.get("/delivery-zones", response_model=list[DeliveryZoneResponse])
async def list_delivery_zones(
    user: CurrentUser,
    zone_service: Annotated[DeliveryZoneService, Depends(get_delivery_zone_service)],
):
    """List all active delivery zones for the tenant."""
    return await zone_service.list_zones(tenant_id=user.tenant_id)


@router.post(
    "/delivery-zones",
    response_model=DeliveryZoneResponse,
    status_code=201,
)
async def create_delivery_zone(
    body: DeliveryZoneCreate,
    current_user: SuperUser,
    zone_service: Annotated[DeliveryZoneService, Depends(get_delivery_zone_service)],
):
    """Create a delivery zone (admin/manager only)."""
    return await zone_service.create_zone(
        tenant_id=current_user.tenant_id,
        data=body.model_dump(),
    )


@router.get("/delivery-zones/lookup", response_model=DeliveryZoneResponse | None)
async def lookup_delivery_zone(
    user: CurrentUser,
    zone_service: Annotated[DeliveryZoneService, Depends(get_delivery_zone_service)],
    postal_code: str = Query(..., min_length=1, max_length=20),
):
    """Look up the delivery zone for a postal code."""
    return await zone_service.lookup_zone(
        postal_code=postal_code,
        tenant_id=user.tenant_id,
    )


# ── Delivery Slot Endpoints ────────────────────────────────────────────

@router.get("/delivery-slots", response_model=list[DeliverySlotAvailability])
async def list_delivery_slots(
    user: CurrentUser,
    fulfillment_service: Annotated[FulfillmentService, Depends(get_fulfillment_service)],
    zone_id: UUID = Query(...),
    target_date: date = Query(..., alias="date"),
):
    """Get available delivery slots for a zone on a specific date."""
    return await fulfillment_service.get_available_slots(
        zone_id=zone_id, target_date=target_date
    )


# ── Fulfillment Order Endpoints ────────────────────────────────────────

@router.get("/fulfillment/{fulfillment_id}", response_model=FulfillmentResponse)
async def get_fulfillment(
    fulfillment_id: UUID,
    user: CurrentUser,
    fulfillment_service: Annotated[FulfillmentService, Depends(get_fulfillment_service)],
):
    """Get a fulfillment order by ID."""
    return await fulfillment_service.get_fulfillment(fulfillment_id)


@router.patch(
    "/fulfillment/{fulfillment_id}/status",
    response_model=FulfillmentResponse,
)
async def update_fulfillment_status(
    fulfillment_id: UUID,
    body: FulfillmentStatusUpdate,
    current_user: SuperUser,
    fulfillment_service: Annotated[FulfillmentService, Depends(get_fulfillment_service)],
):
    """Update fulfillment order status (admin/manager only)."""
    return await fulfillment_service.update_status(
        fulfillment_id=fulfillment_id,
        new_status=body.status,
        tracking_number=body.tracking_number,
        driver_notes=body.driver_notes,
    )


# ── Production Report Endpoints ────────────────────────────────────────

@router.get(
    "/production-reports/{report_date}",
    response_model=ProductionReportResponse,
)
async def get_production_report(
    report_date: date,
    current_user: SuperUser,
    fulfillment_service: Annotated[FulfillmentService, Depends(get_fulfillment_service)],
):
    """Get the production report for a specific date (admin/manager only)."""
    return await fulfillment_service.get_production_report(
        tenant_id=current_user.tenant_id,
        target_date=report_date,
    )
