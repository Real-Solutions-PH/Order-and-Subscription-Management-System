"""Fulfillment & Logistics services."""

from __future__ import annotations

from datetime import UTC, date, datetime
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import get_event_bus
from app.core.exceptions import NotFoundException
from app.repo.db import (
    Address,
    DeliverySlot,
    DeliveryZone,
    FulfillmentOrder,
    FulfillmentStatus,
    Order,
    OrderItem,
)
from app.repo.fulfillment import (
    AddressRepository,
    DeliverySlotRepository,
    DeliveryZoneRepository,
    FulfillmentOrderRepository,
)
from app.schemas.fulfillment import (
    AddressCreate,
    AddressUpdate,
    DeliverySlotCreate,
    DeliveryZoneCreate,
    FulfillmentStatusUpdate,
    ProductionItem,
    ProductionReportResponse,
)


class FulfillmentService:
    """Business logic for fulfillment order lifecycle."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = FulfillmentOrderRepository(session)

    async def create_fulfillment(
        self,
        tenant_id: UUID | str,
        order_id: UUID | str,
        data: dict,
    ) -> FulfillmentOrder:
        """Create a fulfillment record when an order is confirmed."""
        data["tenant_id"] = tenant_id
        data["order_id"] = order_id
        data["status"] = FulfillmentStatus.created
        fulfillment = await self.repo.create(data)

        event_bus = get_event_bus()
        await event_bus.publish(
            "fulfillment.created",
            {
                "tenant_id": str(tenant_id),
                "fulfillment_id": str(fulfillment.id),
                "order_id": str(order_id),
            },
        )
        return fulfillment

    async def update_status(
        self,
        fulfillment_id: UUID | str,
        tenant_id: UUID | str,
        data: FulfillmentStatusUpdate,
    ) -> FulfillmentOrder:
        """Transition the fulfillment status and emit an event."""
        fulfillment = await self.repo.get_by_id(fulfillment_id, tenant_id=tenant_id)
        if fulfillment is None:
            raise NotFoundException("FulfillmentOrder", str(fulfillment_id))

        old_status = fulfillment.status
        update_data: dict = {"status": data.status}

        # Set timestamp fields based on the new status
        now = datetime.now(UTC)
        if data.status == FulfillmentStatus.shipped:
            update_data["shipped_at"] = now
        elif data.status in (
            FulfillmentStatus.delivered,
            FulfillmentStatus.picked_up,
        ):
            update_data["delivered_at"] = now

        if data.notes:
            update_data["driver_notes"] = data.notes

        updated = await self.repo.update(fulfillment_id, update_data, tenant_id=tenant_id)
        if updated is None:
            raise NotFoundException("FulfillmentOrder", str(fulfillment_id))

        event_bus = get_event_bus()
        await event_bus.publish(
            "fulfillment.status_changed",
            {
                "tenant_id": str(tenant_id),
                "fulfillment_id": str(fulfillment_id),
                "old_status": old_status.value,
                "new_status": data.status.value,
            },
        )
        return updated

    async def get_fulfillment(self, order_id: UUID | str, tenant_id: UUID | str) -> FulfillmentOrder:
        """Get the fulfillment record for an order."""
        fulfillment = await self.repo.get_by_order(order_id)
        if fulfillment is None:
            raise NotFoundException("FulfillmentOrder", str(order_id))
        return fulfillment

    async def get_production_report(self, tenant_id: UUID | str, report_date: date) -> ProductionReportResponse:
        """Aggregate all orders for a date into item quantities."""
        # Get fulfillment orders for the date
        fulfillments = await self.repo.get_by_date(tenant_id, report_date)
        order_ids = [f.order_id for f in fulfillments]

        items: list[ProductionItem] = []
        total_orders = len(order_ids)

        if order_ids:
            # Aggregate order items by product
            stmt = (
                select(
                    OrderItem.product_name,
                    OrderItem.variant_name,
                    func.sum(OrderItem.quantity).label("total_qty"),
                )
                .join(Order, Order.id == OrderItem.order_id)
                .where(OrderItem.order_id.in_(order_ids))
                .group_by(OrderItem.product_name, OrderItem.variant_name)
                .order_by(OrderItem.product_name, OrderItem.variant_name)
            )
            result = await self.session.execute(stmt)
            for row in result.all():
                items.append(
                    ProductionItem(
                        product_name=row.product_name,
                        variant_name=row.variant_name,
                        quantity=int(row.total_qty),
                    )
                )

        return ProductionReportResponse(
            date=report_date,
            items=items,
            total_orders=total_orders,
        )


class AddressService:
    """Business logic for user addresses."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = AddressRepository(session)

    async def create_address(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        data: AddressCreate,
    ) -> Address:
        """Create a new address for a user."""
        address_data = data.model_dump()
        address_data["user_id"] = user_id
        address_data["tenant_id"] = tenant_id
        return await self.repo.create(address_data)

    async def list_addresses(self, user_id: UUID | str, tenant_id: UUID | str) -> list[Address]:
        """List all addresses for a user."""
        return await self.repo.get_by_user(user_id, tenant_id=tenant_id)

    async def update_address(
        self,
        address_id: UUID | str,
        user_id: UUID | str,
        tenant_id: UUID | str,
        data: AddressUpdate,
    ) -> Address:
        """Update an existing address."""
        address = await self.repo.get_by_id(address_id, tenant_id=tenant_id)
        if address is None or address.user_id != (
            user_id if isinstance(user_id, type(address.user_id)) else str(user_id)
        ):
            raise NotFoundException("Address", str(address_id))

        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            return address

        updated = await self.repo.update(address_id, update_data, tenant_id=tenant_id)
        if updated is None:
            raise NotFoundException("Address", str(address_id))
        return updated

    async def delete_address(
        self,
        address_id: UUID | str,
        user_id: UUID | str,
        tenant_id: UUID | str,
    ) -> None:
        """Delete an address."""
        address = await self.repo.get_by_id(address_id, tenant_id=tenant_id)
        if address is None:
            raise NotFoundException("Address", str(address_id))

        deleted = await self.repo.delete(address_id, tenant_id=tenant_id)
        if not deleted:
            raise NotFoundException("Address", str(address_id))


class DeliveryZoneService:
    """Business logic for delivery zones and slots."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.zone_repo = DeliveryZoneRepository(session)
        self.slot_repo = DeliverySlotRepository(session)

    async def create_zone(self, tenant_id: UUID | str, data: DeliveryZoneCreate) -> DeliveryZone:
        """Create a new delivery zone."""
        zone_data = data.model_dump()
        zone_data["tenant_id"] = tenant_id
        return await self.zone_repo.create(zone_data)

    async def list_zones(self, tenant_id: UUID | str) -> list[DeliveryZone]:
        """List all active delivery zones for a tenant."""
        return await self.zone_repo.get_active(tenant_id)

    async def lookup_zone(self, tenant_id: UUID | str, postal_code: str) -> DeliveryZone | None:
        """Look up a delivery zone by postal code."""
        return await self.zone_repo.lookup_by_postal_code(postal_code, tenant_id)

    async def add_slot(
        self,
        zone_id: UUID | str,
        tenant_id: UUID | str,
        data: DeliverySlotCreate,
    ) -> DeliverySlot:
        """Add a delivery time slot to a zone."""
        zone = await self.zone_repo.get_by_id(zone_id, tenant_id=tenant_id)
        if zone is None:
            raise NotFoundException("DeliveryZone", str(zone_id))

        slot_data = data.model_dump()
        slot_data["zone_id"] = zone_id
        return await self.slot_repo.create(slot_data)

    async def get_available_slots(self, zone_id: UUID | str, target_date: date) -> list[DeliverySlot]:
        """Get available delivery slots for a zone and date."""
        return await self.slot_repo.get_available(zone_id, target_date)
