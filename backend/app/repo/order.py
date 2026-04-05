"""Order management repository classes."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.repo.base import BaseRepository
from app.repo.db import (
    Cart,
    CartItem,
    CartItemCustomization,
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
)


class CartRepository(BaseRepository[Cart]):
    """Repository for shopping cart operations."""

    model = Cart

    async def get_by_user(self, user_id: UUID | str, tenant_id: UUID | str) -> Cart | None:
        """Get the active cart for a user."""
        stmt = (
            select(Cart)
            .where(Cart.user_id == user_id, Cart.tenant_id == tenant_id)
            .options(selectinload(Cart.items).selectinload(CartItem.customizations))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_session(self, session_id: str, tenant_id: UUID | str) -> Cart | None:
        """Get the active cart for an anonymous session."""
        stmt = (
            select(Cart)
            .where(Cart.session_id == session_id, Cart.tenant_id == tenant_id)
            .options(selectinload(Cart.items).selectinload(CartItem.customizations))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_or_create(
        self,
        user_id: UUID | str | None,
        tenant_id: UUID | str,
        session_id: str | None = None,
    ) -> Cart:
        """Return the existing cart or create a new one."""
        cart: Cart | None = None
        if user_id:
            cart = await self.get_by_user(user_id, tenant_id)
        elif session_id:
            cart = await self.get_by_session(session_id, tenant_id)

        if cart is not None:
            return cart

        return await self.create(
            {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "session_id": session_id or "",
                "expires_at": datetime.now(UTC) + timedelta(days=7),
            }
        )


class CartItemRepository(BaseRepository[CartItem]):
    """Repository for cart item operations."""

    model = CartItem

    async def get_by_cart(self, cart_id: UUID | str) -> list[CartItem]:
        """Get all items in a cart with customizations loaded."""
        stmt = select(CartItem).where(CartItem.cart_id == cart_id).options(selectinload(CartItem.customizations))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_variant(self, cart_id: UUID | str, variant_id: UUID | str) -> CartItem | None:
        """Find an existing cart item for a specific product variant."""
        stmt = select(CartItem).where(
            CartItem.cart_id == cart_id,
            CartItem.product_variant_id == variant_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def clear_cart(self, cart_id: UUID | str) -> None:
        """Remove all items from a cart."""
        # Delete customizations first (child rows)
        items_stmt = select(CartItem.id).where(CartItem.cart_id == cart_id)
        item_ids = (await self.session.execute(items_stmt)).scalars().all()
        if item_ids:
            await self.session.execute(
                delete(CartItemCustomization).where(CartItemCustomization.cart_item_id.in_(item_ids))
            )
        await self.session.execute(delete(CartItem).where(CartItem.cart_id == cart_id))
        await self.session.flush()


class OrderRepository(BaseRepository[Order]):
    """Repository for order CRUD and lookup operations."""

    model = Order

    async def get_by_number(self, order_number: str, tenant_id: UUID | str) -> Order | None:
        """Find an order by its human-readable order number."""
        stmt = (
            select(Order)
            .where(
                Order.order_number == order_number,
                Order.tenant_id == tenant_id,
            )
            .options(selectinload(Order.items).selectinload(OrderItem.customizations))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Order]:
        """Return paginated orders for a specific user."""
        stmt = (
            select(Order)
            .where(Order.user_id == user_id, Order.tenant_id == tenant_id)
            .options(selectinload(Order.items).selectinload(OrderItem.customizations))
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_user(self, user_id: UUID | str, tenant_id: UUID | str) -> int:
        """Count orders for a user."""
        stmt = select(func.count()).select_from(Order).where(Order.user_id == user_id, Order.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_by_status(
        self,
        tenant_id: UUID | str,
        status: OrderStatus,
        skip: int = 0,
        limit: int = 20,
    ) -> list[Order]:
        """Return paginated orders filtered by status."""
        stmt = (
            select(Order)
            .where(Order.tenant_id == tenant_id, Order.status == status)
            .options(selectinload(Order.items).selectinload(OrderItem.customizations))
            .order_by(Order.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_status(self, tenant_id: UUID | str, status: OrderStatus) -> int:
        """Count orders for a tenant with a given status."""
        stmt = select(func.count()).select_from(Order).where(Order.tenant_id == tenant_id, Order.status == status)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def generate_order_number(self, tenant_id: UUID | str) -> str:
        """Generate the next sequential order number for a tenant.

        Format: ``PF-XXXXXX`` where X is a zero-padded sequential number.
        """
        stmt = select(func.count()).select_from(Order).where(Order.tenant_id == tenant_id)
        result = await self.session.execute(stmt)
        count = result.scalar_one()
        return f"PF-{count + 1:06d}"


class OrderItemRepository(BaseRepository[OrderItem]):
    """Repository for order item operations."""

    model = OrderItem

    async def get_by_order(self, order_id: UUID | str) -> list[OrderItem]:
        """Get all items for an order with customizations loaded."""
        stmt = select(OrderItem).where(OrderItem.order_id == order_id).options(selectinload(OrderItem.customizations))
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class OrderStatusHistoryRepository:
    """Repository for tracking order status transitions."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create_entry(
        self,
        order_id: UUID | str,
        from_status: OrderStatus | None,
        to_status: OrderStatus,
        changed_by: UUID | str,
        notes: str | None = None,
    ) -> OrderStatusHistory:
        """Record a status change in the history table."""
        entry = OrderStatusHistory(
            order_id=order_id,
            from_status=from_status,
            to_status=to_status,
            changed_by=changed_by,
            notes=notes,
        )
        self.session.add(entry)
        await self.session.flush()
        await self.session.refresh(entry)
        return entry
