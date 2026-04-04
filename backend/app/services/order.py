"""Cart and order management services."""

from __future__ import annotations

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.cache import RedisCache
from app.core.events import get_event_bus
from app.core.exceptions import BadRequestException, NotFoundException
from app.repo.db import (
    Cart,
    CartItem,
    Order,
    OrderItem,
    OrderItemCustomization,
    OrderStatus,
    OrderType,
)
from app.repo.order import (
    CartItemRepository,
    CartRepository,
    OrderItemRepository,
    OrderRepository,
    OrderStatusHistoryRepository,
)
from app.repo.payment import PromoCodeRepository
from app.schemas.base import PaginatedResponse
from app.schemas.order import (
    CartItemAdd,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
    CheckoutRequest,
    CustomizationInput,
    OrderCancelRequest,
    OrderItemResponse,
    OrderResponse,
    OrderStatusUpdate,
)


# ---------------------------------------------------------------------------
# Valid status transitions
# ---------------------------------------------------------------------------

_VALID_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.pending: {OrderStatus.confirmed, OrderStatus.cancelled},
    OrderStatus.confirmed: {OrderStatus.processing, OrderStatus.cancelled},
    OrderStatus.processing: {OrderStatus.ready, OrderStatus.cancelled},
    OrderStatus.ready: {OrderStatus.out_for_delivery, OrderStatus.picked_up},
    OrderStatus.out_for_delivery: {OrderStatus.delivered},
    OrderStatus.delivered: {OrderStatus.refunded},
    OrderStatus.picked_up: {OrderStatus.refunded},
    OrderStatus.cancelled: {OrderStatus.refunded},
    OrderStatus.refunded: set(),
}


# ---------------------------------------------------------------------------
# CartService
# ---------------------------------------------------------------------------


class CartService:
    """Service layer for shopping cart operations."""

    def __init__(self, session: AsyncSession, cache: RedisCache | None = None) -> None:
        self.session = session
        self.cache = cache
        self.cart_repo = CartRepository(session)
        self.item_repo = CartItemRepository(session)
        self.promo_repo = PromoCodeRepository(session)

    # -- helpers -------------------------------------------------------------

    def _build_cart_response(self, cart: Cart) -> CartResponse:
        """Serialize a Cart ORM instance into a CartResponse schema."""
        items: list[CartItemResponse] = []
        subtotal = Decimal("0")
        for ci in cart.items:
            customization_adj = sum((c.price_adjustment for c in ci.customizations), Decimal("0"))
            item_subtotal = (ci.unit_price + customization_adj) * ci.quantity
            subtotal += item_subtotal
            items.append(
                CartItemResponse(
                    id=ci.id,
                    product_variant_id=ci.product_variant_id,
                    quantity=ci.quantity,
                    unit_price=ci.unit_price,
                    customizations=[
                        CustomizationInput(
                            key=c.key,
                            value=c.value,
                            price_adjustment=c.price_adjustment,
                        )
                        for c in ci.customizations
                    ],
                    subtotal=item_subtotal,
                )
            )

        promo_code_str: str | None = None
        if cart.promo_code is not None:
            promo_code_str = cart.promo_code.code  # type: ignore[union-attr]

        return CartResponse(
            id=cart.id,
            items=items,
            subtotal=subtotal,
            item_count=sum(i.quantity for i in cart.items),
            promo_code=promo_code_str,
        )

    async def _reload_cart(self, cart: Cart) -> Cart:
        """Re-fetch the cart with relationships loaded."""
        reloaded = await self.cart_repo.get_by_id(cart.id)
        if reloaded is None:
            raise NotFoundException("Cart", str(cart.id))
        # Eager-load items/customizations via the user lookup (which has selectinload)
        cart_full = await self.cart_repo.get_by_user(
            reloaded.user_id,
            reloaded.tenant_id,  # type: ignore[arg-type]
        )
        if cart_full is None:
            # Fallback for session-based carts
            cart_full = await self.cart_repo.get_by_session(reloaded.session_id, reloaded.tenant_id)
        return cart_full or reloaded

    # -- public API ----------------------------------------------------------

    async def get_cart(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        session_id: str | None = None,
    ) -> CartResponse:
        """Return the current cart for the user, creating one if absent."""
        cart = await self.cart_repo.get_or_create(user_id, tenant_id, session_id)
        cart = await self._reload_cart(cart)
        return self._build_cart_response(cart)

    async def add_item(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        data: CartItemAdd,
    ) -> CartResponse:
        """Add a product variant to the cart (or increment quantity)."""
        cart = await self.cart_repo.get_or_create(user_id, tenant_id)

        # Check if variant already in cart
        existing = await self.item_repo.get_by_variant(cart.id, data.product_variant_id)

        if existing is not None:
            existing.quantity += data.quantity
            await self.session.flush()
        else:
            # TODO: look up actual unit_price from ProductVariant table
            unit_price = Decimal("0")
            item = await self.item_repo.create(
                {
                    "cart_id": cart.id,
                    "product_variant_id": data.product_variant_id,
                    "quantity": data.quantity,
                    "unit_price": unit_price,
                }
            )
            # Add customizations
            if data.customizations:
                from app.repo.db import CartItemCustomization

                for cust in data.customizations:
                    cic = CartItemCustomization(
                        cart_item_id=item.id,
                        key=cust.key,
                        value=cust.value,
                        price_adjustment=cust.price_adjustment,
                    )
                    self.session.add(cic)
                await self.session.flush()

        cart = await self._reload_cart(cart)
        return self._build_cart_response(cart)

    async def update_item(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        item_id: UUID | str,
        data: CartItemUpdate,
    ) -> CartResponse:
        """Update the quantity of a cart item."""
        cart = await self.cart_repo.get_or_create(user_id, tenant_id)
        item = await self.item_repo.get_by_id(item_id)
        if item is None or item.cart_id != cart.id:
            raise NotFoundException("CartItem", str(item_id))

        item.quantity = data.quantity
        await self.session.flush()
        cart = await self._reload_cart(cart)
        return self._build_cart_response(cart)

    async def remove_item(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        item_id: UUID | str,
    ) -> CartResponse:
        """Remove an item from the cart."""
        cart = await self.cart_repo.get_or_create(user_id, tenant_id)
        item = await self.item_repo.get_by_id(item_id)
        if item is None or item.cart_id != cart.id:
            raise NotFoundException("CartItem", str(item_id))

        await self.item_repo.delete(item_id)
        cart = await self._reload_cart(cart)
        return self._build_cart_response(cart)

    async def clear_cart(self, user_id: UUID | str, tenant_id: UUID | str) -> None:
        """Remove all items from the user's cart."""
        cart = await self.cart_repo.get_by_user(user_id, tenant_id)
        if cart is not None:
            await self.item_repo.clear_cart(cart.id)

    async def apply_promo(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        code: str,
    ) -> CartResponse:
        """Apply a promo code to the user's cart."""
        cart = await self.cart_repo.get_or_create(user_id, tenant_id)

        promo = await self.promo_repo.get_by_code(code, tenant_id)
        if promo is None:
            raise BadRequestException("Invalid promo code")

        now = datetime.now(timezone.utc)
        if now < promo.starts_at or now > promo.expires_at:
            raise BadRequestException("Promo code is not currently active")

        can_use = await self.promo_repo.validate_usage(promo.id, user_id)
        if not can_use:
            raise BadRequestException("Promo code usage limit reached")

        cart.promo_code_id = promo.id
        await self.session.flush()
        cart = await self._reload_cart(cart)
        return self._build_cart_response(cart)


# ---------------------------------------------------------------------------
# OrderService
# ---------------------------------------------------------------------------


class OrderService:
    """Service layer for order lifecycle management."""

    def __init__(self, session: AsyncSession, cache: RedisCache | None = None) -> None:
        self.session = session
        self.cache = cache
        self.order_repo = OrderRepository(session)
        self.order_item_repo = OrderItemRepository(session)
        self.status_history_repo = OrderStatusHistoryRepository(session)
        self.cart_repo = CartRepository(session)
        self.cart_item_repo = CartItemRepository(session)
        self.promo_repo = PromoCodeRepository(session)

    # -- helpers -------------------------------------------------------------

    def _build_order_response(self, order: Order) -> OrderResponse:
        """Serialize an Order ORM instance into an OrderResponse schema."""
        items = [
            OrderItemResponse(
                id=oi.id,
                product_variant_id=oi.product_variant_id,
                product_name=oi.product_name,
                variant_name=oi.variant_name,
                quantity=oi.quantity,
                unit_price=oi.unit_price,
                total_price=oi.total_price,
                customizations=[
                    CustomizationInput(
                        key=c.key,
                        value=c.value,
                        price_adjustment=c.price_adjustment,
                    )
                    for c in (oi.customizations if oi.customizations else [])
                ],
            )
            for oi in (order.items if order.items else [])
        ]
        return OrderResponse(
            id=order.id,
            order_number=order.order_number,
            status=order.status,
            order_type=order.order_type,
            items=items,
            subtotal=order.subtotal,
            discount_amount=order.discount_amount,
            tax_amount=order.tax_amount,
            delivery_fee=order.delivery_fee,
            total=order.total,
            currency=order.currency,
            notes=order.notes,
            placed_at=order.placed_at,
            confirmed_at=order.confirmed_at,
            delivered_at=order.delivered_at,
            created_at=order.created_at,
        )

    # -- public API ----------------------------------------------------------

    async def checkout(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        data: CheckoutRequest,
    ) -> OrderResponse:
        """Convert the user's cart into a new order."""
        cart = await self.cart_repo.get_by_user(user_id, tenant_id)
        if cart is None or not cart.items:
            raise BadRequestException("Cart is empty")

        # Calculate totals
        subtotal = Decimal("0")
        for ci in cart.items:
            customization_adj = sum((c.price_adjustment for c in ci.customizations), Decimal("0"))
            subtotal += (ci.unit_price + customization_adj) * ci.quantity

        # Discount
        discount_amount = Decimal("0")
        promo_code_id = cart.promo_code_id
        if data.promo_code:
            promo = await self.promo_repo.get_by_code(data.promo_code, tenant_id)
            if promo is not None:
                promo_code_id = promo.id
                if promo.discount_type.value == "percentage":
                    discount_amount = subtotal * promo.discount_value / Decimal("100")
                else:
                    discount_amount = promo.discount_value
                if promo.max_discount_amount is not None:
                    discount_amount = min(discount_amount, promo.max_discount_amount)

        # TODO: calculate tax and delivery_fee from tenant config / delivery zone
        tax_amount = Decimal("0")
        delivery_fee = Decimal("0")

        total = subtotal + tax_amount + delivery_fee - discount_amount
        if total < 0:
            total = Decimal("0")

        order_number = await self.order_repo.generate_order_number(tenant_id)
        now = datetime.now(timezone.utc)

        order = await self.order_repo.create(
            {
                "tenant_id": tenant_id,
                "user_id": user_id,
                "order_number": order_number,
                "status": OrderStatus.pending,
                "order_type": OrderType.one_time,
                "subtotal": subtotal,
                "discount_amount": discount_amount,
                "tax_amount": tax_amount,
                "delivery_fee": delivery_fee,
                "total": total,
                "currency": "PHP",
                "delivery_address_id": data.delivery_address_id,
                "delivery_slot_id": data.delivery_slot_id,
                "promo_code_id": promo_code_id,
                "notes": data.notes,
                "placed_at": now,
            }
        )

        # Create order items from cart items
        for ci in cart.items:
            # TODO: look up product_name / variant_name from ProductVariant
            product_name = "Product"
            variant_name = "Default"

            customization_adj = sum((c.price_adjustment for c in ci.customizations), Decimal("0"))
            item_total = (ci.unit_price + customization_adj) * ci.quantity

            oi = await self.order_item_repo.create(
                {
                    "order_id": order.id,
                    "product_variant_id": ci.product_variant_id,
                    "product_name": product_name,
                    "variant_name": variant_name,
                    "quantity": ci.quantity,
                    "unit_price": ci.unit_price,
                    "total_price": item_total,
                }
            )

            # Copy customizations
            for cust in ci.customizations:
                oic = OrderItemCustomization(
                    order_item_id=oi.id,
                    key=cust.key,
                    value=cust.value,
                    price_adjustment=cust.price_adjustment,
                )
                self.session.add(oic)

        await self.session.flush()

        # Record initial status
        await self.status_history_repo.create_entry(
            order_id=order.id,
            from_status=None,
            to_status=OrderStatus.pending,
            changed_by=user_id,
        )

        # Clear the cart
        await self.cart_item_repo.clear_cart(cart.id)

        # Emit event
        event_bus = get_event_bus()
        await event_bus.publish(
            "order.placed",
            {"order_id": str(order.id), "tenant_id": str(tenant_id)},
        )

        # Reload with relationships
        order_full = await self.order_repo.get_by_id(order.id, tenant_id)
        if order_full is None:
            raise NotFoundException("Order", str(order.id))
        return self._build_order_response(order_full)

    async def get_order(self, order_id: UUID | str, tenant_id: UUID | str) -> OrderResponse:
        """Retrieve a single order by ID."""
        from sqlalchemy import select
        from sqlalchemy.orm import selectinload

        stmt = (
            select(Order)
            .where(Order.id == order_id, Order.tenant_id == tenant_id)
            .options(selectinload(Order.items).selectinload(OrderItem.customizations))
        )
        result = await self.session.execute(stmt)
        order = result.scalar_one_or_none()
        if order is None:
            raise NotFoundException("Order", str(order_id))
        return self._build_order_response(order)

    async def list_orders(
        self,
        tenant_id: UUID | str,
        user_id: UUID | str | None = None,
        status: OrderStatus | None = None,
        skip: int = 0,
        limit: int = 20,
    ) -> PaginatedResponse[OrderResponse]:
        """Return a paginated list of orders with optional filters."""
        if user_id is not None:
            orders = await self.order_repo.get_by_user(user_id, tenant_id, skip, limit)
            total = await self.order_repo.count_by_user(user_id, tenant_id)
        elif status is not None:
            orders = await self.order_repo.get_by_status(tenant_id, status, skip, limit)
            total = await self.order_repo.count_by_status(tenant_id, status)
        else:
            orders = list(await self.order_repo.get_all(skip=skip, limit=limit, tenant_id=tenant_id))
            total = await self.order_repo.count(tenant_id=tenant_id)

        page = (skip // limit) + 1 if limit > 0 else 1
        items = [self._build_order_response(o) for o in orders]
        return PaginatedResponse[OrderResponse].build(
            items=items,
            total=total,
            page=page,
            page_size=limit,
        )

    async def update_status(
        self,
        order_id: UUID | str,
        tenant_id: UUID | str,
        data: OrderStatusUpdate,
        changed_by: UUID | str,
    ) -> OrderResponse:
        """Transition an order to a new status (with validation)."""
        order = await self.order_repo.get_by_id(order_id, tenant_id)
        if order is None:
            raise NotFoundException("Order", str(order_id))

        allowed = _VALID_TRANSITIONS.get(order.status, set())
        if data.status not in allowed:
            raise BadRequestException(f"Cannot transition from '{order.status.value}' to '{data.status.value}'")

        from_status = order.status
        order.status = data.status

        # Set timestamp fields based on new status
        now = datetime.now(timezone.utc)
        if data.status == OrderStatus.confirmed:
            order.confirmed_at = now
        elif data.status in (OrderStatus.delivered, OrderStatus.picked_up):
            order.delivered_at = now

        await self.session.flush()

        await self.status_history_repo.create_entry(
            order_id=order.id,
            from_status=from_status,
            to_status=data.status,
            changed_by=changed_by,
            notes=data.notes,
        )

        # Emit status event
        event_bus = get_event_bus()
        await event_bus.publish(
            f"order.{data.status.value}",
            {
                "order_id": str(order.id),
                "tenant_id": str(tenant_id),
                "from_status": from_status.value,
                "to_status": data.status.value,
            },
        )

        return await self.get_order(order_id, tenant_id)

    async def cancel_order(
        self,
        order_id: UUID | str,
        tenant_id: UUID | str,
        user_id: UUID | str,
        data: OrderCancelRequest,
    ) -> OrderResponse:
        """Cancel an order (only allowed from pending or confirmed)."""
        order = await self.order_repo.get_by_id(order_id, tenant_id)
        if order is None:
            raise NotFoundException("Order", str(order_id))

        if order.status not in (OrderStatus.pending, OrderStatus.confirmed):
            raise BadRequestException(f"Cannot cancel an order with status '{order.status.value}'")

        from_status = order.status
        order.status = OrderStatus.cancelled
        order.cancelled_at = datetime.now(timezone.utc)
        order.cancellation_reason = data.reason
        await self.session.flush()

        await self.status_history_repo.create_entry(
            order_id=order.id,
            from_status=from_status,
            to_status=OrderStatus.cancelled,
            changed_by=user_id,
            notes=data.reason,
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "order.cancelled",
            {
                "order_id": str(order.id),
                "tenant_id": str(tenant_id),
                "reason": data.reason,
            },
        )

        return await self.get_order(order_id, tenant_id)
