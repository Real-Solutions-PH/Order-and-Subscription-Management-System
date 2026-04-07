"""Order Management repository layer (SQLAlchemy 2.0 async)."""

import uuid

from sqlalchemy import delete, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.order_management.models import (
    Cart,
    CartItem,
    CartItemCustomization,
    Order,
    OrderItem,
    OrderItemCustomization,
    OrderStatus,
    OrderStatusHistory,
)


class CartRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_by_user(self, user_id: uuid.UUID, tenant_id: uuid.UUID) -> Cart | None:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items).selectinload(CartItem.customizations))
            .where(Cart.user_id == user_id, Cart.tenant_id == tenant_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_session(self, session_id: str, tenant_id: uuid.UUID) -> Cart | None:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items).selectinload(CartItem.customizations))
            .where(Cart.session_id == session_id, Cart.tenant_id == tenant_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_id(self, cart_id: uuid.UUID) -> Cart | None:
        stmt = (
            select(Cart)
            .options(selectinload(Cart.items).selectinload(CartItem.customizations))
            .where(Cart.id == cart_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def create(self, cart: Cart) -> Cart:
        self.db.add(cart)
        await self.db.flush()
        return cart

    async def add_item(self, item: CartItem) -> CartItem:
        self.db.add(item)
        await self.db.flush()
        return item

    async def get_item_by_id(self, item_id: uuid.UUID) -> CartItem | None:
        stmt = (
            select(CartItem)
            .options(selectinload(CartItem.customizations))
            .where(CartItem.id == item_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def update_item(self, item_id: uuid.UUID, **kwargs) -> None:
        stmt = update(CartItem).where(CartItem.id == item_id).values(**kwargs)
        await self.db.execute(stmt)
        await self.db.flush()

    async def remove_item(self, item_id: uuid.UUID) -> None:
        stmt = delete(CartItem).where(CartItem.id == item_id)
        await self.db.execute(stmt)
        await self.db.flush()

    async def clear(self, cart_id: uuid.UUID) -> None:
        stmt = delete(CartItem).where(CartItem.cart_id == cart_id)
        await self.db.execute(stmt)
        await self.db.flush()

    async def add_customization(self, customization: CartItemCustomization) -> CartItemCustomization:
        self.db.add(customization)
        await self.db.flush()
        return customization

    async def delete_customizations_for_item(self, cart_item_id: uuid.UUID) -> None:
        stmt = delete(CartItemCustomization).where(
            CartItemCustomization.cart_item_id == cart_item_id
        )
        await self.db.execute(stmt)
        await self.db.flush()

    async def delete_cart(self, cart_id: uuid.UUID) -> None:
        stmt = delete(Cart).where(Cart.id == cart_id)
        await self.db.execute(stmt)
        await self.db.flush()


class OrderRepo:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def create(self, order: Order) -> Order:
        self.db.add(order)
        await self.db.flush()
        return order

    async def get_by_id(self, order_id: uuid.UUID) -> Order | None:
        stmt = (
            select(Order)
            .options(
                selectinload(Order.items).selectinload(OrderItem.customizations),
                selectinload(Order.status_history),
            )
            .where(Order.id == order_id)
        )
        result = await self.db.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_tenant(
        self,
        tenant_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
        status: OrderStatus | None = None,
    ) -> tuple[list[Order], int]:
        base = select(Order).where(Order.tenant_id == tenant_id)
        if status is not None:
            base = base.where(Order.status == status)

        count_stmt = select(func.count()).select_from(base.subquery())
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = (
            base.options(
                selectinload(Order.items).selectinload(OrderItem.customizations),
                selectinload(Order.status_history),
            )
            .order_by(Order.placed_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def list_by_user(
        self,
        user_id: uuid.UUID,
        tenant_id: uuid.UUID,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Order], int]:
        base = select(Order).where(Order.user_id == user_id, Order.tenant_id == tenant_id)

        count_stmt = select(func.count()).select_from(base.subquery())
        count_result = await self.db.execute(count_stmt)
        total = count_result.scalar_one()

        stmt = (
            base.options(
                selectinload(Order.items).selectinload(OrderItem.customizations),
                selectinload(Order.status_history),
            )
            .order_by(Order.placed_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.db.execute(stmt)
        return list(result.scalars().all()), total

    async def update(self, order_id: uuid.UUID, **kwargs) -> None:
        stmt = update(Order).where(Order.id == order_id).values(**kwargs)
        await self.db.execute(stmt)
        await self.db.flush()

    async def add_item(self, item: OrderItem) -> OrderItem:
        self.db.add(item)
        await self.db.flush()
        return item

    async def add_status_history(self, history: OrderStatusHistory) -> OrderStatusHistory:
        self.db.add(history)
        await self.db.flush()
        return history

    async def get_next_order_number(self, tenant_id: uuid.UUID) -> str:
        stmt = (
            select(func.count())
            .select_from(Order)
            .where(Order.tenant_id == tenant_id)
        )
        result = await self.db.execute(stmt)
        count = result.scalar_one()
        return f"ORD-{count + 1:05d}"
