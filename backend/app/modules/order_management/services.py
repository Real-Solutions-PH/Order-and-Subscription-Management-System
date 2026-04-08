"""Order Management business logic."""

import uuid
from datetime import datetime, timezone
from decimal import Decimal

from app.exceptions import BadRequestError, NotFoundError
from app.modules.order_management.models import (
    Cart,
    CartItem,
    CartItemCustomization,
    Order,
    OrderItem,
    OrderItemCustomization,
    OrderStatus,
    OrderStatusHistory,
    OrderType,
)
from app.modules.order_management.repo import CartRepo, OrderRepo

# Valid status transitions: from_status -> set of allowed to_statuses
_STATUS_TRANSITIONS: dict[OrderStatus, set[OrderStatus]] = {
    OrderStatus.PENDING: {OrderStatus.CONFIRMED, OrderStatus.CANCELLED},
    OrderStatus.CONFIRMED: {OrderStatus.PROCESSING, OrderStatus.CANCELLED},
    OrderStatus.PROCESSING: {OrderStatus.READY, OrderStatus.CANCELLED},
    OrderStatus.READY: {OrderStatus.OUT_FOR_DELIVERY, OrderStatus.PICKED_UP, OrderStatus.CANCELLED},
    OrderStatus.OUT_FOR_DELIVERY: {OrderStatus.DELIVERED, OrderStatus.CANCELLED},
    OrderStatus.DELIVERED: {OrderStatus.REFUNDED},
    OrderStatus.PICKED_UP: {OrderStatus.REFUNDED},
    OrderStatus.CANCELLED: {OrderStatus.REFUNDED},
    OrderStatus.REFUNDED: set(),
}


class CartService:
    def __init__(self, cart_repo: CartRepo) -> None:
        self.cart_repo = cart_repo

    async def get_cart(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        session_id: str | None = None,
    ) -> Cart | None:
        if user_id:
            return await self.cart_repo.get_by_user(user_id, tenant_id)
        if session_id:
            return await self.cart_repo.get_by_session(session_id, tenant_id)
        return None

    async def get_or_create_cart(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        session_id: str | None = None,
    ) -> Cart:
        cart = await self.get_cart(tenant_id, user_id, session_id)
        if cart is None:
            cart = Cart(tenant_id=tenant_id, user_id=user_id, session_id=session_id)
            cart = await self.cart_repo.create(cart)
        return cart

    async def add_item(
        self,
        tenant_id: uuid.UUID,
        product_variant_id: uuid.UUID,
        quantity: int,
        unit_price: Decimal,
        customizations: list[dict] | None = None,
        user_id: uuid.UUID | None = None,
        session_id: str | None = None,
    ) -> CartItem:
        cart = await self.get_or_create_cart(tenant_id, user_id, session_id)
        item = CartItem(
            cart_id=cart.id,
            product_variant_id=product_variant_id,
            quantity=quantity,
            unit_price=unit_price,
        )
        item = await self.cart_repo.add_item(item)

        if customizations:
            for c in customizations:
                cust = CartItemCustomization(
                    cart_item_id=item.id,
                    key=c["key"],
                    value=c["value"],
                    price_adjustment=c.get("price_adjustment", Decimal("0.00")),
                )
                await self.cart_repo.add_customization(cust)

        return item

    async def update_item(
        self,
        item_id: uuid.UUID,
        quantity: int | None = None,
        customizations: list[dict] | None = None,
    ) -> CartItem:
        item = await self.cart_repo.get_item_by_id(item_id)
        if item is None:
            raise NotFoundError("Cart item not found")

        if quantity is not None:
            await self.cart_repo.update_item(item_id, quantity=quantity)

        if customizations is not None:
            await self.cart_repo.delete_customizations_for_item(item_id)
            for c in customizations:
                cust = CartItemCustomization(
                    cart_item_id=item_id,
                    key=c["key"],
                    value=c["value"],
                    price_adjustment=c.get("price_adjustment", Decimal("0.00")),
                )
                await self.cart_repo.add_customization(cust)

        return await self.cart_repo.get_item_by_id(item_id)  # type: ignore[return-value]

    async def remove_item(self, item_id: uuid.UUID) -> None:
        item = await self.cart_repo.get_item_by_id(item_id)
        if item is None:
            raise NotFoundError("Cart item not found")
        await self.cart_repo.remove_item(item_id)

    async def clear_cart(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        session_id: str | None = None,
    ) -> None:
        cart = await self.get_cart(tenant_id, user_id, session_id)
        if cart is None:
            raise NotFoundError("Cart not found")
        await self.cart_repo.clear(cart.id)

    async def apply_promo(
        self,
        tenant_id: uuid.UUID,
        promo_code: str,
        user_id: uuid.UUID | None = None,
        session_id: str | None = None,
    ) -> Cart:
        """Apply a promo code to the cart.

        NOTE: Full promo validation should be delegated to the payment_processing
        module. This is a placeholder that stores the intent on the cart.
        """
        cart = await self.get_cart(tenant_id, user_id, session_id)
        if cart is None:
            raise NotFoundError("Cart not found")
        # TODO: Validate promo code via payment_processing.PromoCodeService
        # For now, store the code string in metadata for downstream processing.
        current_meta = cart.metadata_ or {}
        current_meta["promo_code"] = promo_code
        await self.cart_repo.db.execute(
            Cart.__table__.update()
            .where(Cart.id == cart.id)
            .values(metadata=current_meta)
        )
        await self.cart_repo.db.flush()
        return await self.cart_repo.get_by_id(cart.id)  # type: ignore[return-value]


class OrderService:
    def __init__(self, order_repo: OrderRepo, cart_repo: CartRepo) -> None:
        self.order_repo = order_repo
        self.cart_repo = cart_repo

    async def checkout(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID,
        delivery_address_id: uuid.UUID | None,
        delivery_slot_id: uuid.UUID | None,
        payment_method: str,
        notes: str | None = None,
    ) -> Order:
        """Orchestrates checkout: cart -> order."""
        cart = await self.cart_repo.get_by_user(user_id, tenant_id)
        if cart is None or not cart.items:
            raise BadRequestError("Cart is empty")

        # Calculate totals
        subtotal = Decimal("0.00")
        for item in cart.items:
            item_total = item.unit_price * item.quantity
            for cust in item.customizations:
                item_total += cust.price_adjustment * item.quantity
            subtotal += item_total

        # TODO: Calculate discount from promo, tax, and delivery fee via external services
        discount_amount = Decimal("0.00")
        tax_amount = Decimal("0.00")
        delivery_fee = Decimal("0.00")
        total = subtotal - discount_amount + tax_amount + delivery_fee

        order_number = await self.order_repo.get_next_order_number(tenant_id)

        order = Order(
            tenant_id=tenant_id,
            user_id=user_id,
            order_number=order_number,
            status=OrderStatus.PENDING,
            order_type=OrderType.ONE_TIME,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            delivery_fee=delivery_fee,
            total=total,
            currency="PHP",
            delivery_address_id=delivery_address_id,
            delivery_slot_id=delivery_slot_id,
            promo_code_id=cart.promo_code_id,
            notes=notes,
            placed_at=datetime.now(timezone.utc),
            metadata_={"payment_method": payment_method},
        )
        order = await self.order_repo.create(order)

        # Create order items from cart items
        for cart_item in cart.items:
            item_total = cart_item.unit_price * cart_item.quantity
            for cust in cart_item.customizations:
                item_total += cust.price_adjustment * cart_item.quantity

            order_item = OrderItem(
                order_id=order.id,
                product_variant_id=cart_item.product_variant_id,
                product_name="",  # TODO: resolve from product catalog
                variant_name="",  # TODO: resolve from product catalog
                quantity=cart_item.quantity,
                unit_price=cart_item.unit_price,
                total_price=item_total,
            )
            order_item = await self.order_repo.add_item(order_item)

            for cust in cart_item.customizations:
                order_cust = OrderItemCustomization(
                    order_item_id=order_item.id,
                    key=cust.key,
                    value=cust.value,
                    price_adjustment=cust.price_adjustment,
                )
                self.order_repo.db.add(order_cust)
            await self.order_repo.db.flush()

        # Add initial status history
        history = OrderStatusHistory(
            order_id=order.id,
            from_status=None,
            to_status=OrderStatus.PENDING.value,
            changed_by=user_id,
            notes="Order placed",
        )
        await self.order_repo.add_status_history(history)

        # Clear the cart
        await self.cart_repo.clear(cart.id)

        # Return fully loaded order
        return await self.order_repo.get_by_id(order.id)  # type: ignore[return-value]

    async def get_order(self, order_id: uuid.UUID) -> Order:
        order = await self.order_repo.get_by_id(order_id)
        if order is None:
            raise NotFoundError("Order not found")
        return order

    async def list_orders(
        self,
        tenant_id: uuid.UUID,
        user_id: uuid.UUID | None = None,
        page: int = 1,
        per_page: int = 20,
        status: str | None = None,
    ) -> tuple[list[Order], int]:
        offset = (page - 1) * per_page
        if user_id:
            return await self.order_repo.list_by_user(user_id, tenant_id, offset, per_page)
        status_enum = OrderStatus(status) if status else None
        return await self.order_repo.list_by_tenant(tenant_id, offset, per_page, status_enum)

    async def update_status(
        self,
        order_id: uuid.UUID,
        new_status: str,
        changed_by: uuid.UUID,
        notes: str | None = None,
    ) -> Order:
        order = await self.order_repo.get_by_id(order_id)
        if order is None:
            raise NotFoundError("Order not found")

        try:
            target = OrderStatus(new_status)
        except ValueError:
            raise BadRequestError(f"Invalid status: {new_status}")

        allowed = _STATUS_TRANSITIONS.get(order.status, set())
        if target not in allowed:
            raise BadRequestError(
                f"Cannot transition from '{order.status.value}' to '{target.value}'"
            )

        update_fields: dict = {"status": target}
        now = datetime.now(timezone.utc)
        if target == OrderStatus.CONFIRMED:
            update_fields["confirmed_at"] = now
        elif target in (OrderStatus.DELIVERED, OrderStatus.PICKED_UP):
            update_fields["delivered_at"] = now
        elif target == OrderStatus.CANCELLED:
            update_fields["cancelled_at"] = now

        await self.order_repo.update(order_id, **update_fields)

        history = OrderStatusHistory(
            order_id=order_id,
            from_status=order.status.value,
            to_status=target.value,
            changed_by=changed_by,
            notes=notes,
        )
        await self.order_repo.add_status_history(history)

        return await self.order_repo.get_by_id(order_id)  # type: ignore[return-value]

    async def cancel_order(
        self,
        order_id: uuid.UUID,
        user_id: uuid.UUID,
        reason: str | None = None,
    ) -> Order:
        order = await self.order_repo.get_by_id(order_id)
        if order is None:
            raise NotFoundError("Order not found")

        allowed = _STATUS_TRANSITIONS.get(order.status, set())
        if OrderStatus.CANCELLED not in allowed:
            raise BadRequestError(
                f"Cannot cancel order in '{order.status.value}' status"
            )

        now = datetime.now(timezone.utc)
        await self.order_repo.update(
            order_id,
            status=OrderStatus.CANCELLED,
            cancelled_at=now,
            cancellation_reason=reason,
        )

        history = OrderStatusHistory(
            order_id=order_id,
            from_status=order.status.value,
            to_status=OrderStatus.CANCELLED.value,
            changed_by=user_id,
            notes=reason or "Cancelled by user",
        )
        await self.order_repo.add_status_history(history)

        return await self.order_repo.get_by_id(order_id)  # type: ignore[return-value]
