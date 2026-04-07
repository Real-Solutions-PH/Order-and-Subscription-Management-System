"""Fulfillment & Logistics business logic."""

import uuid
from datetime import date, datetime, timezone

from app.exceptions import BadRequestError, NotFoundError
from app.modules.fulfillment.models import (
    Address,
    DeliverySlot,
    DeliveryZone,
    FulfillmentOrder,
    FulfillmentStatus,
    FulfillmentType,
)
from app.modules.fulfillment.repo import AddressRepo, DeliveryZoneRepo, FulfillmentRepo


# Valid status transitions
_STATUS_TRANSITIONS: dict[FulfillmentStatus, set[FulfillmentStatus]] = {
    FulfillmentStatus.CREATED: {FulfillmentStatus.IN_PRODUCTION, FulfillmentStatus.FAILED},
    FulfillmentStatus.IN_PRODUCTION: {FulfillmentStatus.PACKED, FulfillmentStatus.FAILED},
    FulfillmentStatus.PACKED: {FulfillmentStatus.SHIPPED, FulfillmentStatus.PICKED_UP, FulfillmentStatus.FAILED},
    FulfillmentStatus.SHIPPED: {FulfillmentStatus.OUT_FOR_DELIVERY, FulfillmentStatus.FAILED},
    FulfillmentStatus.OUT_FOR_DELIVERY: {FulfillmentStatus.DELIVERED, FulfillmentStatus.FAILED},
    FulfillmentStatus.DELIVERED: set(),
    FulfillmentStatus.PICKED_UP: set(),
    FulfillmentStatus.FAILED: {FulfillmentStatus.CREATED},  # allow retry
}


class AddressService:
    def __init__(self, address_repo: AddressRepo) -> None:
        self.address_repo = address_repo

    async def list_addresses(
        self, user_id: uuid.UUID, tenant_id: uuid.UUID
    ) -> list[Address]:
        return await self.address_repo.list_by_user(user_id, tenant_id)

    async def create_address(
        self, tenant_id: uuid.UUID, user_id: uuid.UUID, data: dict
    ) -> Address:
        address = Address(tenant_id=tenant_id, user_id=user_id, **data)
        return await self.address_repo.create(address)

    async def update_address(
        self, address_id: uuid.UUID, data: dict
    ) -> Address:
        address = await self.address_repo.get_by_id(address_id)
        if address is None:
            raise NotFoundError("Address not found")
        # Filter out None values so only provided fields are updated
        update_data = {k: v for k, v in data.items() if v is not None}
        if update_data:
            await self.address_repo.update(address_id, **update_data)
        return await self.address_repo.get_by_id(address_id)  # type: ignore[return-value]

    async def delete_address(self, address_id: uuid.UUID) -> None:
        address = await self.address_repo.get_by_id(address_id)
        if address is None:
            raise NotFoundError("Address not found")
        await self.address_repo.delete(address_id)


class DeliveryZoneService:
    def __init__(self, zone_repo: DeliveryZoneRepo) -> None:
        self.zone_repo = zone_repo

    async def list_zones(self, tenant_id: uuid.UUID) -> list[DeliveryZone]:
        return await self.zone_repo.list_by_tenant(tenant_id)

    async def create_zone(
        self, tenant_id: uuid.UUID, data: dict
    ) -> DeliveryZone:
        slots_data = data.pop("slots", None)
        zone = DeliveryZone(tenant_id=tenant_id, **data)
        if slots_data:
            for s in slots_data:
                slot = DeliverySlot(**s)
                zone.slots.append(slot)
        return await self.zone_repo.create(zone)

    async def lookup_zone(
        self, postal_code: str, tenant_id: uuid.UUID
    ) -> DeliveryZone | None:
        return await self.zone_repo.lookup_by_postal_code(postal_code, tenant_id)


class FulfillmentService:
    def __init__(self, fulfillment_repo: FulfillmentRepo) -> None:
        self.fulfillment_repo = fulfillment_repo

    async def create_fulfillment(
        self, tenant_id: uuid.UUID, data: dict
    ) -> FulfillmentOrder:
        fulfillment = FulfillmentOrder(
            tenant_id=tenant_id,
            order_id=data["order_id"],
            address_id=data.get("address_id"),
            delivery_slot_id=data.get("delivery_slot_id"),
            fulfillment_type=FulfillmentType(data["fulfillment_type"]),
            status=FulfillmentStatus.CREATED,
            scheduled_date=data["scheduled_date"],
            tracking_number=data.get("tracking_number"),
            driver_notes=data.get("driver_notes"),
            metadata_=data.get("metadata_"),
        )
        fulfillment = await self.fulfillment_repo.create(fulfillment)
        return await self.fulfillment_repo.get_by_id(fulfillment.id)  # type: ignore[return-value]

    async def get_fulfillment(self, fulfillment_id: uuid.UUID) -> FulfillmentOrder:
        fulfillment = await self.fulfillment_repo.get_by_id(fulfillment_id)
        if fulfillment is None:
            raise NotFoundError("Fulfillment order not found")
        return fulfillment

    async def update_status(
        self,
        fulfillment_id: uuid.UUID,
        new_status: str,
        tracking_number: str | None = None,
        driver_notes: str | None = None,
    ) -> FulfillmentOrder:
        fulfillment = await self.fulfillment_repo.get_by_id(fulfillment_id)
        if fulfillment is None:
            raise NotFoundError("Fulfillment order not found")

        try:
            target = FulfillmentStatus(new_status)
        except ValueError:
            raise BadRequestError(f"Invalid status: {new_status}")

        allowed = _STATUS_TRANSITIONS.get(fulfillment.status, set())
        if target not in allowed:
            raise BadRequestError(
                f"Cannot transition from '{fulfillment.status.value}' to '{target.value}'"
            )

        update_fields: dict = {"status": target}
        now = datetime.now(timezone.utc)
        if target == FulfillmentStatus.SHIPPED:
            update_fields["shipped_at"] = now
        elif target in (FulfillmentStatus.DELIVERED, FulfillmentStatus.PICKED_UP):
            update_fields["delivered_at"] = now
        if tracking_number is not None:
            update_fields["tracking_number"] = tracking_number
        if driver_notes is not None:
            update_fields["driver_notes"] = driver_notes

        await self.fulfillment_repo.update(fulfillment_id, **update_fields)
        return await self.fulfillment_repo.get_by_id(fulfillment_id)  # type: ignore[return-value]

    async def get_available_slots(
        self, zone_id: uuid.UUID, target_date: date
    ) -> list[dict]:
        return await self.fulfillment_repo.list_slots_by_zone_and_date(zone_id, target_date)

    async def get_production_report(
        self, tenant_id: uuid.UUID, target_date: date
    ) -> dict:
        return await self.fulfillment_repo.get_production_report(tenant_id, target_date)
