"""Order Management API routes."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request

from app.dependencies import get_cart_service, get_order_service
from app.modules.order_management.schemas import (
    CartItemAdd,
    CartItemResponse,
    CartItemUpdate,
    CartResponse,
    CheckoutRequest,
    OrderCancelRequest,
    OrderListResponse,
    OrderResponse,
    OrderStatusUpdateRequest,
    PromoApplyRequest,
)
from app.modules.order_management.services import CartService, OrderService
from app.shared.auth import CurrentUser, OptionalUser, SuperUser

router = APIRouter(tags=["Orders"])


# ── Helpers ─────────────────────────────────────────────────────────────

def _extract_session_id(request: Request) -> str | None:
    """Get guest session id from header or cookie."""
    return request.headers.get("X-Session-ID") or request.cookies.get("session_id")


# ── Cart Endpoints ──────────────────────────────────────────────────────

@router.get("/cart", response_model=CartResponse | None)
async def get_cart(
    request: Request,
    user: OptionalUser,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
):
    """Get the current user/guest cart."""
    user_id = user.id if user else None
    tenant_id = user.tenant_id if user else None
    session_id = _extract_session_id(request)

    if tenant_id is None:
        # For guest carts, tenant_id must come from a header or similar mechanism.
        # This is a simplified approach; in production you'd resolve tenant from domain.
        return None

    cart = await cart_service.get_cart(
        tenant_id=tenant_id, user_id=user_id, session_id=session_id
    )
    return cart


@router.post("/cart/items", response_model=CartItemResponse, status_code=201)
async def add_cart_item(
    request: Request,
    body: CartItemAdd,
    user: OptionalUser,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
):
    """Add an item to the cart."""
    user_id = user.id if user else None
    tenant_id = user.tenant_id if user else None
    session_id = _extract_session_id(request)

    if tenant_id is None:
        from app.exceptions import BadRequestError
        raise BadRequestError("Tenant context required")

    customizations = (
        [c.model_dump() for c in body.customizations] if body.customizations else None
    )

    item = await cart_service.add_item(
        tenant_id=tenant_id,
        product_variant_id=body.product_variant_id,
        quantity=body.quantity,
        unit_price=body.unit_price,
        customizations=customizations,
        user_id=user_id,
        session_id=session_id,
    )
    return item


@router.patch("/cart/items/{item_id}", response_model=CartItemResponse)
async def update_cart_item(
    item_id: UUID,
    body: CartItemUpdate,
    user: OptionalUser,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
):
    """Update a cart item's quantity or customizations."""
    customizations = (
        [c.model_dump() for c in body.customizations] if body.customizations else None
    )
    item = await cart_service.update_item(
        item_id=item_id,
        quantity=body.quantity,
        customizations=customizations,
    )
    return item


@router.delete("/cart/items/{item_id}", status_code=204)
async def remove_cart_item(
    item_id: UUID,
    user: OptionalUser,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
):
    """Remove an item from the cart."""
    await cart_service.remove_item(item_id)


@router.delete("/cart", status_code=204)
async def clear_cart(
    request: Request,
    user: OptionalUser,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
):
    """Clear all items from the cart."""
    user_id = user.id if user else None
    tenant_id = user.tenant_id if user else None
    session_id = _extract_session_id(request)

    if tenant_id is None:
        from app.exceptions import BadRequestError
        raise BadRequestError("Tenant context required")

    await cart_service.clear_cart(
        tenant_id=tenant_id, user_id=user_id, session_id=session_id
    )


@router.post("/cart/promo", response_model=CartResponse)
async def apply_promo(
    request: Request,
    body: PromoApplyRequest,
    user: OptionalUser,
    cart_service: Annotated[CartService, Depends(get_cart_service)],
):
    """Apply a promo code to the cart."""
    user_id = user.id if user else None
    tenant_id = user.tenant_id if user else None
    session_id = _extract_session_id(request)

    if tenant_id is None:
        from app.exceptions import BadRequestError
        raise BadRequestError("Tenant context required")

    cart = await cart_service.apply_promo(
        tenant_id=tenant_id,
        promo_code=body.code,
        user_id=user_id,
        session_id=session_id,
    )
    return cart


# ── Order Endpoints ─────────────────────────────────────────────────────

@router.post("/orders/checkout", response_model=OrderResponse, status_code=201)
async def checkout(
    body: CheckoutRequest,
    user: CurrentUser,
    order_service: Annotated[OrderService, Depends(get_order_service)],
):
    """Checkout the current cart and create an order."""
    order = await order_service.checkout(
        tenant_id=user.tenant_id,
        user_id=user.id,
        delivery_address_id=body.delivery_address_id,
        delivery_slot_id=body.delivery_slot_id,
        payment_method=body.payment_method,
        notes=body.notes,
    )
    return order


@router.get("/orders", response_model=OrderListResponse)
async def list_orders(
    user: CurrentUser,
    order_service: Annotated[OrderService, Depends(get_order_service)],
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    status: str | None = Query(None),
):
    """List orders for the current user."""
    orders, total = await order_service.list_orders(
        tenant_id=user.tenant_id,
        user_id=user.id,
        page=page,
        per_page=per_page,
        status=status,
    )
    return OrderListResponse(total=total, page=page, per_page=per_page, items=orders)


@router.get("/orders/{order_id}", response_model=OrderResponse)
async def get_order(
    order_id: UUID,
    user: CurrentUser,
    order_service: Annotated[OrderService, Depends(get_order_service)],
):
    """Get a single order by ID."""
    return await order_service.get_order(order_id)


@router.patch("/orders/{order_id}/status", response_model=OrderResponse)
async def update_order_status(
    order_id: UUID,
    body: OrderStatusUpdateRequest,
    current_user: SuperUser,
    order_service: Annotated[OrderService, Depends(get_order_service)],
):
    """Update order status (admin/manager only)."""
    return await order_service.update_status(
        order_id=order_id,
        new_status=body.status,
        changed_by=current_user.id,
        notes=body.notes,
    )


@router.post("/orders/{order_id}/cancel", response_model=OrderResponse)
async def cancel_order(
    order_id: UUID,
    body: OrderCancelRequest,
    user: CurrentUser,
    order_service: Annotated[OrderService, Depends(get_order_service)],
):
    """Cancel an order."""
    return await order_service.cancel_order(
        order_id=order_id,
        user_id=user.id,
        reason=body.reason,
    )
