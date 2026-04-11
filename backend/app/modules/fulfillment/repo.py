"""Fulfillment & Logistics repository layer (SQLAlchemy 2.0 async)."""

import uuid
from datetime import date

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.fulfillment.models import (
    Address,
    DeliverySlot,
    DeliveryZone,
    FulfillmentOrder,
    FulfillmentStatus,
)
from app.modules.order_management.models import OrderItem


class AddressRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_user(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> list[Address]:
        stmt = (
            select(Address)
            .where(Address.user_id == user_id, Address.tenant_id == tenant_id)
            .order_by(Address.is_default.desc(), Address.created_at.desc())
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, address_id: uuid.UUID) -> Address | None:
        stmt = select(Address).where(Address.id == address_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, address: Address) -> Address:
        self.db.add(address)
        await self.db.flush()
        return address

    async def update(self, address_id: uuid.UUID, **kwargs) -> None:
        stmt = update(Address).where(Address.id == address_id).values(**kwargs)
        await self.db.execute(stmt)
        await self.db.flush()

    async def delete(self, address_id: uuid.UUID) -> None:
        stmt = delete(Address).where(Address.id == address_id)
        await self.db.execute(stmt)
        await self.db.flush()


class DeliveryZoneRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def list_by_tenant(self, tenant_id: uuid.UUID) -> list[DeliveryZone]:
        stmt = (
            select(DeliveryZone)
            .options(selectinload(DeliveryZone.slots))
            .where(DeliveryZone.tenant_id == tenant_id, DeliveryZone.is_active.is_(True))
            .order_by(DeliveryZone.name)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all())

    async def get_by_id(self, zone_id: uuid.UUID) -> DeliveryZone | None:
        stmt = select(DeliveryZone).options(selectinload(DeliveryZone.slots)).where(DeliveryZone.id == zone_id)
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, zone: DeliveryZone) -> DeliveryZone:
        self.db.add(zone)
        await self.db.flush()
        return zone

    async def lookup_by_postal_code(self, postal_code: str, tenant_id: uuid.UUID) -> DeliveryZone | None:
        """Search boundaries JSONB for a matching postal code.

        Expected boundaries format: {"postal_codes": ["1000", "1001", ...]}
        Uses the Postgres @> containment operator.
        """
        from sqlalchemy.dialects.postgresql import JSONB as JSONB_TYPE

        target = {"postal_codes": [postal_code]}
        stmt = (
            select(DeliveryZone)
            .options(selectinload(DeliveryZone.slots))
            .where(
                DeliveryZone.tenant_id == tenant_id,
                DeliveryZone.is_active.is_(True),
                DeliveryZone.boundaries.op("@>")(func.cast(target, JSONB_TYPE)),
            )
            .limit(1)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()


class FulfillmentRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, fulfillment: FulfillmentOrder) -> FulfillmentOrder:
        self.db.add(fulfillment)
        await self.db.flush()
        return fulfillment

    async def get_by_id(self, fulfillment_id: uuid.UUID) -> FulfillmentOrder | None:
        stmt = (
            select(FulfillmentOrder)
            .options(
                selectinload(FulfillmentOrder.address),
                selectinload(FulfillmentOrder.slot),
            )
            .where(FulfillmentOrder.id == fulfillment_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_order_id(self, order_id: uuid.UUID) -> FulfillmentOrder | None:
        stmt = (
            select(FulfillmentOrder)
            .options(
                selectinload(FulfillmentOrder.address),
                selectinload(FulfillmentOrder.slot),
            )
            .where(FulfillmentOrder.order_id == order_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update(self, fulfillment_id: uuid.UUID, **kwargs) -> None:
        stmt = update(FulfillmentOrder).where(FulfillmentOrder.id == fulfillment_id).values(**kwargs)
        await self.db.execute(stmt)
        await self.db.flush()

    async def list_slots_by_zone_and_date(self, zone_id: uuid.UUID, target_date: date) -> list[dict]:
        """Return slots for a zone on a given date with availability info.

        Matches slots by day_of_week and counts existing fulfillment orders
        booked against each slot on that date.
        """
        day_of_week = target_date.weekday()  # 0=Mon

        slots_stmt = select(DeliverySlot).where(
            DeliverySlot.zone_id == zone_id,
            DeliverySlot.day_of_week == day_of_week,
            DeliverySlot.is_active.is_(True),
        )
        slots_result = await self.db.execute(slots_stmt)
        slots = list(slots_result.scalars().all())

        availability: list[dict] = []
        for slot in slots:
            count_stmt = (
                select(func.count())
                .select_from(FulfillmentOrder)
                .where(
                    FulfillmentOrder.delivery_slot_id == slot.id,
                    FulfillmentOrder.scheduled_date == target_date,
                    FulfillmentOrder.status != FulfillmentStatus.FAILED,
                )
            )
            count_result = await self.db.execute(count_stmt)
            booked = count_result.scalar_one()

            availability.append(
                {
                    "id": slot.id,
                    "zone_id": slot.zone_id,
                    "day_of_week": slot.day_of_week,
                    "start_time": slot.start_time,
                    "end_time": slot.end_time,
                    "capacity": slot.capacity,
                    "booked": booked,
                    "available": max(0, slot.capacity - booked),
                }
            )

        return availability

    async def get_production_report(self, tenant_id: uuid.UUID, target_date: date) -> dict:
        """Aggregate order items for all fulfillment orders on a given date.

        Joins fulfillment_orders -> orders -> order_items to build a
        production summary.
        """
        # Count total orders for the date
        order_count_stmt = select(func.count(func.distinct(FulfillmentOrder.order_id))).where(
            FulfillmentOrder.tenant_id == tenant_id,
            FulfillmentOrder.scheduled_date == target_date,
            FulfillmentOrder.status != FulfillmentStatus.FAILED,
        )
        order_count_result = await self.db.execute(order_count_stmt)
        total_orders = order_count_result.scalar_one()

        # Aggregate items: join fulfillment_orders -> order_items via order_id
        items_stmt = (
            select(
                OrderItem.product_name,
                OrderItem.variant_name,
                func.sum(OrderItem.quantity).label("total_quantity"),
            )
            .join(
                FulfillmentOrder,
                FulfillmentOrder.order_id == OrderItem.order_id,
            )
            .where(
                FulfillmentOrder.tenant_id == tenant_id,
                FulfillmentOrder.scheduled_date == target_date,
                FulfillmentOrder.status != FulfillmentStatus.FAILED,
            )
            .group_by(OrderItem.product_name, OrderItem.variant_name)
            .order_by(func.sum(OrderItem.quantity).desc())
        )
        items_result = await self.db.execute(items_stmt)
        rows = items_result.all()

        items = []
        total_meals = 0
        for row in rows:
            qty = int(row.total_quantity)
            total_meals += qty
            items.append(
                {
                    "product_name": row.product_name,
                    "variant_name": row.variant_name,
                    "total_quantity": qty,
                }
            )

        return {
            "date": target_date,
            "total_orders": total_orders,
            "total_meals": total_meals,
            "items": items,
        }
