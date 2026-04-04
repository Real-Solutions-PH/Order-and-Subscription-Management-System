"""Fulfillment & Logistics repositories."""

from __future__ import annotations

from datetime import date
from typing import Sequence
from uuid import UUID

from sqlalchemy import select

from app.repo.base import BaseRepository
from app.repo.db import (
    Address,
    DeliverySlot,
    DeliveryZone,
    FulfillmentOrder,
    FulfillmentStatus,
)


class AddressRepository(BaseRepository[Address]):
    """Repository for customer addresses."""

    model = Address

    async def get_by_user(
        self, user_id: UUID | str, tenant_id: UUID | str | None = None
    ) -> list[Address]:
        """Return all addresses belonging to a user."""
        stmt = select(Address).where(Address.user_id == user_id)
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_default(
        self, user_id: UUID | str, tenant_id: UUID | str | None = None
    ) -> Address | None:
        """Return the user's default address."""
        stmt = select(Address).where(
            Address.user_id == user_id,
            Address.is_default.is_(True),
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class DeliveryZoneRepository(BaseRepository[DeliveryZone]):
    """Repository for delivery zones."""

    model = DeliveryZone

    async def get_active(
        self, tenant_id: UUID | str | None = None
    ) -> list[DeliveryZone]:
        """Return all active delivery zones."""
        stmt = select(DeliveryZone).where(DeliveryZone.is_active.is_(True))
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def lookup_by_postal_code(
        self, postal_code: str, tenant_id: UUID | str | None = None
    ) -> DeliveryZone | None:
        """Find a delivery zone whose boundaries contain the postal code.

        Boundaries are stored as JSON with a ``postal_codes`` key containing a
        list of covered postal code strings.
        """
        zones = await self.get_active(tenant_id)
        for zone in zones:
            if zone.boundaries and postal_code in zone.boundaries.get(
                "postal_codes", []
            ):
                return zone
        return None


class DeliverySlotRepository(BaseRepository[DeliverySlot]):
    """Repository for delivery time slots."""

    model = DeliverySlot

    async def get_by_zone(self, zone_id: UUID | str) -> list[DeliverySlot]:
        """Return all slots for a zone."""
        stmt = select(DeliverySlot).where(DeliverySlot.zone_id == zone_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_available(
        self, zone_id: UUID | str, target_date: date
    ) -> list[DeliverySlot]:
        """Return active slots for a zone that match the day-of-week of *target_date*.

        Capacity checking is done at the service layer.
        """
        day_of_week = target_date.weekday()
        stmt = select(DeliverySlot).where(
            DeliverySlot.zone_id == zone_id,
            DeliverySlot.day_of_week == day_of_week,
            DeliverySlot.is_active.is_(True),
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class FulfillmentOrderRepository(BaseRepository[FulfillmentOrder]):
    """Repository for fulfillment orders."""

    model = FulfillmentOrder

    async def get_by_order(self, order_id: UUID | str) -> FulfillmentOrder | None:
        """Get the fulfillment record for an order."""
        stmt = select(FulfillmentOrder).where(
            FulfillmentOrder.order_id == order_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_date(
        self, tenant_id: UUID | str, target_date: date
    ) -> list[FulfillmentOrder]:
        """Get all fulfillment orders scheduled for a given date."""
        stmt = select(FulfillmentOrder).where(
            FulfillmentOrder.scheduled_date == target_date
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_status(
        self, tenant_id: UUID | str, status: FulfillmentStatus
    ) -> Sequence[FulfillmentOrder]:
        """Get all fulfillment orders with a specific status."""
        stmt = select(FulfillmentOrder).where(
            FulfillmentOrder.status == status
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return result.scalars().all()
