"""
Demo data seeder.

Creates a realistic production-like dataset on top of the essential seeds
(tenant, admin, config) and template seeds (products, plans, zones). Adds:

  - Demo customers with addresses and payment methods
  - Promo codes
  - Historical one-time orders spanning ~90 days (varied statuses)
  - Active subscriptions with cycles and selections
  - Payments, transactions, and invoices for each order
  - Fulfillment records tied to orders
  - Notification log entries
  - Analytics metric snapshots

All demo rows are tagged via ``metadata_["demo"] = True`` (or a tag column
where JSON metadata isn't available) so they can be cleanly removed by the
demo-clear endpoint without touching real production data.
"""

from __future__ import annotations

import random
import uuid
from datetime import date, datetime, time, timedelta, timezone
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import SessionLocal
from app.logger import get_logger
from app.modules.fulfillment.models import (
    Address,
    DeliverySlot,
    DeliveryZone,
    FulfillmentOrder,
    FulfillmentStatus,
    FulfillmentType,
)
from app.modules.iam.models import Tenant, User
from app.modules.iam.services import get_password_hash
from app.modules.notification_hub.models import (
    Notification,
    NotificationChannel,
    NotificationStatus,
    NotificationTemplate,
)
from app.modules.order_management.models import (
    Order,
    OrderItem,
    OrderStatus,
    OrderStatusHistory,
    OrderType,
)
from app.modules.payment_processing.models import (
    DiscountType,
    Invoice,
    InvoiceLineItem,
    InvoiceStatus,
    Payment,
    PaymentChannel,
    PaymentMethod,
    PaymentMethodType,
    PaymentStatus,
    PaymentTransaction,
    PromoCode,
    TransactionStatus,
    TransactionType,
)
from app.modules.product_catalog.models import Ingredient, Product, ProductIngredient, ProductVariant
from app.modules.subscription_engine.models import (
    CycleStatus,
    Subscription,
    SubscriptionCycle,
    SubscriptionEvent,
    SubscriptionEventType,
    SubscriptionPlan,
    SubscriptionPlanTier,
    SubscriptionSelection,
    SubscriptionStatus,
)
from app.modules.analytics.models import MetricSnapshot, PeriodType

logger = get_logger(__name__)
settings = get_settings()

DEMO_TAG = "demo"
DEMO_EMAIL_DOMAIN = "demo.osms.local"

DEMO_CUSTOMERS = [
    ("Maria", "Santos", "maria.santos"),
    ("Juan", "dela Cruz", "juan.delacruz"),
    ("Ana", "Reyes", "ana.reyes"),
    ("Miguel", "Garcia", "miguel.garcia"),
    ("Sofia", "Torres", "sofia.torres"),
    ("Luis", "Ramos", "luis.ramos"),
    ("Isabel", "Flores", "isabel.flores"),
    ("Carlos", "Mendoza", "carlos.mendoza"),
    ("Patricia", "Aquino", "patricia.aquino"),
    ("Rafael", "Bautista", "rafael.bautista"),
    ("Elena", "Cruz", "elena.cruz"),
    ("Diego", "Villanueva", "diego.villanueva"),
]

DEMO_ADDRESSES = [
    ("Home", "123 Mabini St", "Makati", "Metro Manila", "1200"),
    ("Home", "45 Rizal Ave", "Quezon City", "Metro Manila", "1100"),
    ("Office", "88 Ayala Ave, Tower 1", "Makati", "Metro Manila", "1226"),
    ("Home", "22 Katipunan Ext", "Quezon City", "Metro Manila", "1108"),
    ("Home", "77 BGC 5th Ave", "Taguig", "Metro Manila", "1634"),
]

DEMO_PROMO_CODES = [
    ("WELCOME10", DiscountType.PERCENTAGE, Decimal("10"), "New customer 10% off"),
    ("DEMO50", DiscountType.FIXED_AMOUNT, Decimal("50"), "Demo flat ₱50 off"),
    ("FREESHIP", DiscountType.FIXED_AMOUNT, Decimal("100"), "Free delivery"),
]


def _demo_meta(extra: dict | None = None) -> dict:
    m = {DEMO_TAG: True}
    if extra:
        m.update(extra)
    return m


async def _exists(session: AsyncSession, model, **filters) -> bool:
    stmt = select(model.id).filter_by(**filters).limit(1)
    return (await session.execute(stmt)).scalar_one_or_none() is not None


async def _get_tenant_id(session: AsyncSession) -> uuid.UUID:
    tenant_id = uuid.UUID(settings.seed_tenant_id)
    exists = await _exists(session, Tenant, id=tenant_id)
    if not exists:
        raise RuntimeError("Base tenant missing — run main seeder first")
    return tenant_id


# -- Customers ----------------------------------------------------------------


async def _seed_customers(session: AsyncSession, tenant_id: uuid.UUID) -> list[User]:
    users: list[User] = []
    password_hash = get_password_hash("demo1234")
    for first, last, handle in DEMO_CUSTOMERS:
        email = f"{handle}@{DEMO_EMAIL_DOMAIN}"
        existing = (
            await session.execute(select(User).filter_by(tenant_id=tenant_id, email=email))
        ).scalar_one_or_none()
        if existing:
            users.append(existing)
            continue
        u = User(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            email=email,
            hashed_password=password_hash,
            first_name=first,
            last_name=last,
            phone=f"+639{random.randint(100000000, 999999999)}",
            is_active=True,
            role="customer",
            metadata_=_demo_meta(),
        )
        session.add(u)
        users.append(u)
    await session.flush()
    logger.info("Seeded %d demo customers", len(users))
    return users


async def _seed_addresses(session: AsyncSession, tenant_id: uuid.UUID, users: list[User]) -> dict[uuid.UUID, Address]:
    addr_by_user: dict[uuid.UUID, Address] = {}
    for u in users:
        existing = (
            await session.execute(select(Address).filter_by(user_id=u.id).limit(1))
        ).scalar_one_or_none()
        if existing:
            addr_by_user[u.id] = existing
            continue
        label, line1, city, province, postal = random.choice(DEMO_ADDRESSES)
        a = Address(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=u.id,
            label=label,
            line_1=line1,
            city=city,
            province=province,
            postal_code=postal,
            country="PH",
            is_default=True,
            notes=f"[{DEMO_TAG}] demo address",
        )
        session.add(a)
        addr_by_user[u.id] = a
    await session.flush()
    logger.info("Seeded %d demo addresses", len(addr_by_user))
    return addr_by_user


async def _seed_payment_methods(session: AsyncSession, tenant_id: uuid.UUID, users: list[User]) -> dict[uuid.UUID, PaymentMethod]:
    pm_by_user: dict[uuid.UUID, PaymentMethod] = {}
    types = [
        (PaymentMethodType.CARD, "Visa **** 4242", "Visa", "4242"),
        (PaymentMethodType.GCASH, "GCash Wallet", None, None),
        (PaymentMethodType.MAYA, "Maya Wallet", None, None),
    ]
    for u in users:
        existing = (
            await session.execute(select(PaymentMethod).filter_by(user_id=u.id).limit(1))
        ).scalar_one_or_none()
        if existing:
            pm_by_user[u.id] = existing
            continue
        ptype, display, brand, last4 = random.choice(types)
        pm = PaymentMethod(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            user_id=u.id,
            type=ptype,
            display_name=display,
            card_brand=brand,
            last_four=last4,
            is_default=True,
            metadata_=_demo_meta(),
        )
        session.add(pm)
        pm_by_user[u.id] = pm
    await session.flush()
    return pm_by_user


# -- Ingredients --------------------------------------------------------------


async def _seed_ingredients(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    """Create Ingredient rows from product metadata and link via ProductIngredient.

    The template products store ingredient *names* in metadata. We promote each
    unique name to an Ingredient row and join it to the parent Product.
    """
    from app.seed_template_data import PRODUCTS

    # Build name → list of product slugs mapping
    ingredient_to_products: dict[str, list[str]] = {}
    for p in PRODUCTS:
        for ing_name in (p.get("metadata") or {}).get("ingredients", []):
            ingredient_to_products.setdefault(ing_name, []).append(p["slug"])

    if not ingredient_to_products:
        return

    # Insert ingredients (idempotent by name uniqueness)
    name_to_id: dict[str, uuid.UUID] = {}
    for name in ingredient_to_products:
        existing = (
            await session.execute(select(Ingredient).filter_by(tenant_id=tenant_id, name=name))
        ).scalar_one_or_none()
        if existing:
            name_to_id[name] = existing.id
            continue
        ing_id = uuid.uuid4()
        session.add(
            Ingredient(
                id=ing_id,
                tenant_id=tenant_id,
                name=name,
                default_unit="g",
                description=f"{name} — seeded",
            )
        )
        name_to_id[name] = ing_id
    await session.flush()

    # Link each ingredient to its products (skip duplicates)
    slug_to_product_id: dict[str, uuid.UUID] = {}
    product_rows = (
        await session.execute(select(Product).filter_by(tenant_id=tenant_id))
    ).scalars().all()
    for p in product_rows:
        slug_to_product_id[p.slug] = p.id

    for ing_name, slugs in ingredient_to_products.items():
        ing_id = name_to_id[ing_name]
        for slug in slugs:
            product_id = slug_to_product_id.get(slug)
            if not product_id:
                continue
            if await _exists(session, ProductIngredient, product_id=product_id, ingredient_id=ing_id):
                continue
            session.add(
                ProductIngredient(
                    id=uuid.uuid4(),
                    product_id=product_id,
                    ingredient_id=ing_id,
                    quantity=None,
                    unit=None,
                )
            )
    await session.flush()
    logger.info("Seeded %d ingredients", len(name_to_id))


# -- Promo codes --------------------------------------------------------------


async def _seed_promo_codes(session: AsyncSession, tenant_id: uuid.UUID) -> list[PromoCode]:
    codes: list[PromoCode] = []
    now = datetime.now(timezone.utc)
    for code, dtype, value, _desc in DEMO_PROMO_CODES:
        existing = (
            await session.execute(select(PromoCode).filter_by(code=code))
        ).scalar_one_or_none()
        if existing:
            codes.append(existing)
            continue
        pc = PromoCode(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            code=code,
            discount_type=dtype,
            discount_value=value,
            min_order_amount=Decimal("200.00"),
            usage_limit=500,
            per_user_limit=1,
            first_order_only=False,
            starts_at=now - timedelta(days=30),
            expires_at=now + timedelta(days=90),
            is_active=True,
        )
        session.add(pc)
        codes.append(pc)
    await session.flush()
    return codes


# -- Orders -------------------------------------------------------------------


async def _get_variants(session: AsyncSession, tenant_id: uuid.UUID) -> list[tuple[ProductVariant, Product]]:
    rows = await session.execute(
        select(ProductVariant, Product)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(Product.tenant_id == tenant_id, ProductVariant.is_active.is_(True))
    )
    return list(rows.all())


async def _get_zone_and_slot(
    session: AsyncSession, tenant_id: uuid.UUID
) -> tuple[DeliveryZone | None, DeliverySlot | None]:
    zone = (
        await session.execute(select(DeliveryZone).filter_by(tenant_id=tenant_id).limit(1))
    ).scalar_one_or_none()
    slot = None
    if zone:
        slot = (
            await session.execute(select(DeliverySlot).filter_by(zone_id=zone.id).limit(1))
        ).scalar_one_or_none()
    return zone, slot


def _order_number(seq: int) -> str:
    return f"DEMO-{datetime.now().year}{seq:06d}"


async def _seed_orders(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    users: list[User],
    addresses: dict[uuid.UUID, Address],
    payment_methods: dict[uuid.UUID, PaymentMethod],
) -> list[Order]:
    variants = await _get_variants(session, tenant_id)
    if not variants:
        logger.warning("No product variants found — skipping demo orders")
        return []

    zone, slot = await _get_zone_and_slot(session, tenant_id)
    now = datetime.now(timezone.utc)
    tax_rate = Decimal("0.12")
    orders: list[Order] = []

    # Status distribution weighted toward delivered (realistic history)
    status_weights = [
        (OrderStatus.DELIVERED, 0.55),
        (OrderStatus.OUT_FOR_DELIVERY, 0.08),
        (OrderStatus.PROCESSING, 0.10),
        (OrderStatus.CONFIRMED, 0.10),
        (OrderStatus.PENDING, 0.07),
        (OrderStatus.CANCELLED, 0.07),
        (OrderStatus.REFUNDED, 0.03),
    ]
    statuses = [s for s, _ in status_weights]
    weights = [w for _, w in status_weights]

    # Count existing demo orders to continue numbering
    existing_count = (
        await session.execute(
            select(Order).filter_by(tenant_id=tenant_id, order_type=OrderType.ONE_TIME)
        )
    ).scalars().all()
    seq_offset = len([o for o in existing_count if (o.metadata_ or {}).get(DEMO_TAG)])

    # Skip historical bulk if already seeded; still top-up today bucket below.
    skip_history = seq_offset >= 60
    if skip_history:
        logger.info("Historical demo orders already seeded (%d found) — topping up today only", seq_offset)

    # 80 historical orders + 15 explicit "today" orders for live ops tiles.
    # 60% of historical placed in current calendar month so "this month" KPIs populate.
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    days_into_month = (now.date() - month_start.date()).days

    # Distribution for today: ensure each Live Ops tile is non-zero.
    today_status_pool = [
        OrderStatus.PENDING, OrderStatus.PENDING,
        OrderStatus.CONFIRMED,
        OrderStatus.PROCESSING, OrderStatus.PROCESSING,
        OrderStatus.READY,
        OrderStatus.OUT_FOR_DELIVERY, OrderStatus.OUT_FOR_DELIVERY,
        OrderStatus.DELIVERED, OrderStatus.DELIVERED, OrderStatus.DELIVERED,
        OrderStatus.DELIVERED, OrderStatus.DELIVERED,
        OrderStatus.CANCELLED,
        OrderStatus.PROCESSING,
    ]
    total_to_seed = 80 + len(today_status_pool)
    start_idx = 80 if skip_history else 0

    for i in range(start_idx, total_to_seed):
        user = random.choice(users)
        addr = addresses.get(user.id)
        pm = payment_methods.get(user.id)
        if i >= 80:
            # Today bucket
            today_idx = i - 80
            placed_at = today_start + timedelta(
                hours=random.randint(0, max(now.hour, 1)),
                minutes=random.randint(0, 59),
            )
            status = today_status_pool[today_idx]
        elif random.random() < 0.6:
            # Current month — pick a day between month start and today
            placed_at = month_start + timedelta(
                days=random.randint(0, max(days_into_month, 0)),
                hours=random.randint(0, 23),
            )
            status = random.choices(statuses, weights=weights, k=1)[0]
        else:
            placed_at = now - timedelta(days=random.randint(31, 90), hours=random.randint(0, 23))
            status = random.choices(statuses, weights=weights, k=1)[0]

        # 1–4 line items
        picks = random.sample(variants, k=min(random.randint(1, 4), len(variants)))
        subtotal = Decimal("0")
        order_id = uuid.uuid4()
        items_payload: list[OrderItem] = []
        for v, p in picks:
            qty = random.randint(1, 3)
            line_total = v.price * qty
            subtotal += line_total
            items_payload.append(
                OrderItem(
                    id=uuid.uuid4(),
                    order_id=order_id,
                    product_variant_id=v.id,
                    product_name=p.name,
                    variant_name=v.name,
                    quantity=qty,
                    unit_price=v.price,
                    total_price=line_total,
                )
            )

        delivery_fee = zone.delivery_fee if zone else Decimal("0")
        tax_amount = (subtotal * tax_rate).quantize(Decimal("0.01"))
        total = subtotal + tax_amount + delivery_fee

        confirmed_at = placed_at + timedelta(minutes=5) if status != OrderStatus.PENDING else None
        delivered_at = placed_at + timedelta(hours=random.randint(4, 30)) if status == OrderStatus.DELIVERED else None
        cancelled_at = placed_at + timedelta(hours=random.randint(1, 12)) if status in (OrderStatus.CANCELLED, OrderStatus.REFUNDED) else None

        order = Order(
            id=order_id,
            tenant_id=tenant_id,
            user_id=user.id,
            order_number=_order_number(seq_offset + i + 1),
            status=status,
            order_type=OrderType.ONE_TIME,
            subtotal=subtotal,
            discount_amount=Decimal("0"),
            tax_amount=tax_amount,
            delivery_fee=delivery_fee,
            total=total,
            currency="PHP",
            delivery_address_id=addr.id if addr else None,
            delivery_slot_id=slot.id if slot else None,
            placed_at=placed_at,
            confirmed_at=confirmed_at,
            delivered_at=delivered_at,
            cancelled_at=cancelled_at,
            cancellation_reason="Customer request" if cancelled_at else None,
            metadata_=_demo_meta(),
        )
        session.add(order)
        for it in items_payload:
            session.add(it)

        session.add(
            OrderStatusHistory(
                id=uuid.uuid4(),
                order_id=order_id,
                from_status=None,
                to_status=status.value if hasattr(status, "value") else str(status),
                changed_by=user.id,
                notes=f"[{DEMO_TAG}] seeded",
            )
        )

        # Payment
        pay_status = {
            OrderStatus.DELIVERED: PaymentStatus.PAID,
            OrderStatus.OUT_FOR_DELIVERY: PaymentStatus.PAID,
            OrderStatus.READY: PaymentStatus.PAID,
            OrderStatus.PROCESSING: PaymentStatus.PAID,
            OrderStatus.CONFIRMED: PaymentStatus.PAID,
            OrderStatus.PENDING: PaymentStatus.PENDING,
            OrderStatus.CANCELLED: PaymentStatus.FAILED,
            OrderStatus.REFUNDED: PaymentStatus.REFUNDED,
            OrderStatus.PICKED_UP: PaymentStatus.PAID,
        }[status]

        payment_id = uuid.uuid4()
        paid_at = confirmed_at if pay_status == PaymentStatus.PAID else None
        session.add(
            Payment(
                id=payment_id,
                tenant_id=tenant_id,
                order_id=order_id,
                payment_method_id=pm.id if pm else None,
                amount=total,
                currency="PHP",
                status=pay_status,
                payment_channel=PaymentChannel.PAYMONGO,
                paid_at=paid_at,
                retry_count=0,
                metadata_=_demo_meta(),
            )
        )
        txn_type = {
            PaymentStatus.PAID: TransactionType.PAID,
            PaymentStatus.PENDING: TransactionType.INTENT_CREATED,
            PaymentStatus.FAILED: TransactionType.FAILED,
            PaymentStatus.REFUNDED: TransactionType.REFUNDED,
        }[pay_status]
        txn_status = TransactionStatus.SUCCESS if pay_status in (PaymentStatus.PAID, PaymentStatus.REFUNDED) else (
            TransactionStatus.PENDING if pay_status == PaymentStatus.PENDING else TransactionStatus.FAILED
        )
        session.add(
            PaymentTransaction(
                id=uuid.uuid4(),
                payment_id=payment_id,
                type=txn_type,
                amount=total,
                status=txn_status,
                payment_method_type=pm.type.value if pm and hasattr(pm.type, "value") else None,
            )
        )

        # Invoice for paid orders
        if pay_status == PaymentStatus.PAID:
            inv_id = uuid.uuid4()
            session.add(
                Invoice(
                    id=inv_id,
                    tenant_id=tenant_id,
                    order_id=order_id,
                    invoice_number=f"INV-{datetime.now().year}{seq_offset + i + 1:06d}",
                    status=InvoiceStatus.PAID,
                    subtotal=subtotal,
                    tax_amount=tax_amount,
                    discount_amount=Decimal("0"),
                    total=total,
                    currency="PHP",
                    issued_at=placed_at,
                    paid_at=paid_at,
                )
            )
            for it in items_payload:
                session.add(
                    InvoiceLineItem(
                        id=uuid.uuid4(),
                        invoice_id=inv_id,
                        description=f"{it.product_name} — {it.variant_name}",
                        quantity=it.quantity,
                        unit_price=it.unit_price,
                        total_price=it.total_price,
                    )
                )

        # Fulfillment
        fulfill_status_map = {
            OrderStatus.DELIVERED: FulfillmentStatus.DELIVERED,
            OrderStatus.OUT_FOR_DELIVERY: FulfillmentStatus.OUT_FOR_DELIVERY,
            OrderStatus.READY: FulfillmentStatus.PACKED,
            OrderStatus.PROCESSING: FulfillmentStatus.IN_PRODUCTION,
            OrderStatus.CONFIRMED: FulfillmentStatus.CREATED,
            OrderStatus.PENDING: FulfillmentStatus.CREATED,
            OrderStatus.CANCELLED: FulfillmentStatus.FAILED,
            OrderStatus.REFUNDED: FulfillmentStatus.FAILED,
            OrderStatus.PICKED_UP: FulfillmentStatus.DELIVERED,
        }
        session.add(
            FulfillmentOrder(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                order_id=order_id,
                address_id=addr.id if addr else None,
                delivery_slot_id=slot.id if slot else None,
                fulfillment_type=FulfillmentType.DELIVERY,
                status=fulfill_status_map[status],
                scheduled_date=(placed_at + timedelta(days=1)).date(),
                delivered_at=delivered_at,
                metadata_=_demo_meta(),
            )
        )

        orders.append(order)

    await session.flush()
    logger.info("Seeded %d demo orders with payments/invoices/fulfillment", len(orders))
    return orders


# -- Subscriptions ------------------------------------------------------------


async def _seed_subscriptions(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    users: list[User],
    payment_methods: dict[uuid.UUID, PaymentMethod],
) -> list[Subscription]:
    tiers = (
        await session.execute(
            select(SubscriptionPlanTier, SubscriptionPlan)
            .join(SubscriptionPlan, SubscriptionPlan.id == SubscriptionPlanTier.plan_id)
            .where(SubscriptionPlan.tenant_id == tenant_id, SubscriptionPlanTier.is_active.is_(True))
        )
    ).all()
    if not tiers:
        return []

    variants = await _get_variants(session, tenant_id)
    subs: list[Subscription] = []
    now = datetime.now(timezone.utc)

    # Up to 10 demo subs spread across 6 months: ~70% active, ~25% cancelled, ~5% paused
    sample_users = random.sample(users, k=min(10, len(users)))
    for idx, u in enumerate(sample_users):
        # Skip if user already has a demo subscription
        existing = (
            await session.execute(select(Subscription).filter_by(user_id=u.id).limit(1))
        ).scalar_one_or_none()
        if existing and (existing.metadata_ or {}).get(DEMO_TAG):
            continue

        tier, _plan = random.choice(tiers)
        pm = payment_methods.get(u.id)
        cycle_days = 7  # weekly default
        # Spread subscription start dates across last 180 days for cohort+trend data
        signup_offset_days = random.randint(7, 180)
        signup_at = now - timedelta(days=signup_offset_days)
        cycle_start = now - timedelta(days=random.randint(0, 6))
        cycle_end = cycle_start + timedelta(days=cycle_days)
        next_billing = cycle_end

        # Status mix
        roll = random.random()
        if roll < 0.70:
            sub_status = SubscriptionStatus.active
            cancelled_at = None
        elif roll < 0.95:
            sub_status = SubscriptionStatus.cancelled
            # Cancel between signup and now (bias to last 60 days for churn signal)
            cancel_offset = random.randint(7, max(8, min(signup_offset_days, 60)))
            cancelled_at = now - timedelta(days=cancel_offset)
        else:
            sub_status = SubscriptionStatus.paused
            cancelled_at = None

        sub_id = uuid.uuid4()
        session.add(
            Subscription(
                id=sub_id,
                tenant_id=tenant_id,
                user_id=u.id,
                plan_tier_id=tier.id,
                status=sub_status,
                current_cycle_start=cycle_start,
                current_cycle_end=cycle_end,
                next_billing_date=next_billing,
                payment_method_id=pm.id if pm else None,
                cancelled_at=cancelled_at,
                cancellation_reason=random.choice([
                    "Too expensive", "Didn't use enough", "Found alternative", "Pausing temporarily"
                ]) if cancelled_at else None,
                created_at=signup_at,
                updated_at=signup_at,
                metadata_=_demo_meta(),
            )
        )
        session.add(
            SubscriptionEvent(
                id=uuid.uuid4(),
                subscription_id=sub_id,
                event_type=SubscriptionEventType.created,
                event_data={"source": DEMO_TAG},
                actor_id=u.id,
            )
        )
        session.add(
            SubscriptionEvent(
                id=uuid.uuid4(),
                subscription_id=sub_id,
                event_type=SubscriptionEventType.activated,
                event_data={"source": DEMO_TAG},
                actor_id=u.id,
            )
        )

        # Two past cycles + one upcoming
        for cycle_num, (cs, ce, cstat) in enumerate(
            [
                (cycle_start - timedelta(days=cycle_days * 2), cycle_start - timedelta(days=cycle_days), CycleStatus.completed),
                (cycle_start - timedelta(days=cycle_days), cycle_start, CycleStatus.completed),
                (cycle_start, cycle_end, CycleStatus.selection_open),
            ],
            start=1,
        ):
            cycle_id = uuid.uuid4()
            session.add(
                SubscriptionCycle(
                    id=cycle_id,
                    subscription_id=sub_id,
                    cycle_number=cycle_num,
                    starts_at=cs,
                    ends_at=ce,
                    selection_deadline=cs + timedelta(days=3),
                    status=cstat,
                    billed_amount=tier.price if cstat == CycleStatus.completed else None,
                )
            )
            if variants:
                for v, _p in random.sample(variants, k=min(tier.items_per_cycle, len(variants))):
                    session.add(
                        SubscriptionSelection(
                            id=uuid.uuid4(),
                            cycle_id=cycle_id,
                            product_variant_id=v.id,
                            quantity=1,
                        )
                    )

        subs.append(
            await session.get(Subscription, sub_id)
            or Subscription(id=sub_id, tenant_id=tenant_id, user_id=u.id, plan_tier_id=tier.id)
        )

    await session.flush()
    logger.info("Seeded %d demo subscriptions", len(subs))
    return subs


# -- Notifications ------------------------------------------------------------


async def _seed_notifications(
    session: AsyncSession,
    tenant_id: uuid.UUID,
    users: list[User],
    orders: list[Order],
) -> None:
    template_by_event = {}
    rows = (await session.execute(select(NotificationTemplate).filter_by(tenant_id=tenant_id))).scalars().all()
    for t in rows:
        template_by_event[(t.event_type, t.channel)] = t

    for o in orders[:30]:
        user = next((u for u in users if u.id == o.user_id), None)
        if not user:
            continue
        tmpl = template_by_event.get(("order_confirmed", NotificationChannel.email))
        if not tmpl:
            continue
        session.add(
            Notification(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                template_id=tmpl.id,
                user_id=user.id,
                channel=NotificationChannel.email,
                recipient=user.email,
                subject=f"Order Confirmed — #{o.order_number}",
                body=f"Hi {user.first_name}, your order #{o.order_number} was confirmed. Total: PHP {o.total}.",
                status=NotificationStatus.sent,
                sent_at=o.confirmed_at or o.placed_at,
            )
        )
    await session.flush()


# -- Analytics ----------------------------------------------------------------


async def _seed_metric_snapshots(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    existing = await _exists(session, MetricSnapshot, tenant_id=tenant_id, metric_type="demo_revenue_daily")
    if existing:
        return
    today = date.today()
    for i in range(90):
        d = today - timedelta(days=i)
        revenue = Decimal(random.randint(15000, 85000))
        session.add(
            MetricSnapshot(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                metric_type="demo_revenue_daily",
                period_type=PeriodType.daily,
                period_start=d,
                value=revenue,
                metadata_=_demo_meta(),
            )
        )
        session.add(
            MetricSnapshot(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                metric_type="demo_orders_daily",
                period_type=PeriodType.daily,
                period_start=d,
                value=Decimal(random.randint(8, 45)),
                metadata_=_demo_meta(),
            )
        )
    await session.flush()


# -- Entrypoints --------------------------------------------------------------


async def seed_demo_data() -> dict[str, int]:
    """Seed a realistic demo dataset. Idempotent — safe to re-run."""
    counts: dict[str, int] = {}
    async with SessionLocal() as session:
        try:
            tenant_id = await _get_tenant_id(session)

            users = await _seed_customers(session, tenant_id)
            addresses = await _seed_addresses(session, tenant_id, users)
            payment_methods = await _seed_payment_methods(session, tenant_id, users)
            await _seed_ingredients(session, tenant_id)
            await _seed_promo_codes(session, tenant_id)
            orders = await _seed_orders(session, tenant_id, users, addresses, payment_methods)
            subs = await _seed_subscriptions(session, tenant_id, users, payment_methods)
            await _seed_notifications(session, tenant_id, users, orders)
            await _seed_metric_snapshots(session, tenant_id)

            await session.commit()

            counts = {
                "customers": len(users),
                "orders": len(orders),
                "subscriptions": len(subs),
            }
            logger.info("Demo data seed complete: %s", counts)
        except Exception:
            await session.rollback()
            logger.error("Demo seed failed", exc_info=True)
            raise
    return counts


async def clear_demo_data() -> dict[str, int]:
    """Delete only rows tagged as demo. Production data is untouched.

    Deletion order respects FK constraints:
      notifications → payment_transactions → invoice_line_items → invoices →
      payments → fulfillment_orders → order_items → order_status_history →
      orders → subscription_selections → subscription_cycles →
      subscription_events → subscriptions → payment_methods → addresses →
      promo_codes → metric_snapshots → users.
    """
    from sqlalchemy import delete

    counts: dict[str, int] = {}
    async with SessionLocal() as session:
        try:
            tenant_id = await _get_tenant_id(session)

            # Identify demo users by email domain
            demo_user_ids = (
                await session.execute(
                    select(User.id).where(
                        User.tenant_id == tenant_id,
                        User.email.like(f"%@{DEMO_EMAIL_DOMAIN}"),
                    )
                )
            ).scalars().all()
            demo_user_ids = list(demo_user_ids)

            # Demo orders = orders tagged OR belonging to demo users
            demo_order_ids = (
                await session.execute(
                    select(Order.id).where(
                        Order.tenant_id == tenant_id,
                        (Order.user_id.in_(demo_user_ids) if demo_user_ids else Order.order_number.like("DEMO-%")),
                    )
                )
            ).scalars().all()
            demo_order_ids = list(demo_order_ids)

            # Demo subscriptions
            demo_sub_ids = (
                await session.execute(
                    select(Subscription.id).where(
                        Subscription.tenant_id == tenant_id,
                        Subscription.user_id.in_(demo_user_ids) if demo_user_ids else Subscription.id.is_(None),
                    )
                )
            ).scalars().all()
            demo_sub_ids = list(demo_sub_ids)

            # Notifications for demo users
            if demo_user_ids:
                r = await session.execute(
                    delete(Notification).where(Notification.user_id.in_(demo_user_ids))
                )
                counts["notifications"] = r.rowcount or 0

            # Payment transactions + invoices + payments tied to demo orders
            if demo_order_ids:
                demo_payment_ids = (
                    await session.execute(
                        select(Payment.id).where(Payment.order_id.in_(demo_order_ids))
                    )
                ).scalars().all()
                demo_payment_ids = list(demo_payment_ids)

                if demo_payment_ids:
                    r = await session.execute(
                        delete(PaymentTransaction).where(PaymentTransaction.payment_id.in_(demo_payment_ids))
                    )
                    counts["payment_transactions"] = r.rowcount or 0

                demo_invoice_ids = (
                    await session.execute(
                        select(Invoice.id).where(Invoice.order_id.in_(demo_order_ids))
                    )
                ).scalars().all()
                demo_invoice_ids = list(demo_invoice_ids)
                if demo_invoice_ids:
                    await session.execute(
                        delete(InvoiceLineItem).where(InvoiceLineItem.invoice_id.in_(demo_invoice_ids))
                    )
                    r = await session.execute(delete(Invoice).where(Invoice.id.in_(demo_invoice_ids)))
                    counts["invoices"] = r.rowcount or 0

                if demo_payment_ids:
                    r = await session.execute(delete(Payment).where(Payment.id.in_(demo_payment_ids)))
                    counts["payments"] = r.rowcount or 0

                r = await session.execute(
                    delete(FulfillmentOrder).where(FulfillmentOrder.order_id.in_(demo_order_ids))
                )
                counts["fulfillment_orders"] = r.rowcount or 0

                r = await session.execute(delete(OrderItem).where(OrderItem.order_id.in_(demo_order_ids)))
                counts["order_items"] = r.rowcount or 0
                r = await session.execute(
                    delete(OrderStatusHistory).where(OrderStatusHistory.order_id.in_(demo_order_ids))
                )
                counts["order_status_history"] = r.rowcount or 0
                r = await session.execute(delete(Order).where(Order.id.in_(demo_order_ids)))
                counts["orders"] = r.rowcount or 0

            # Subscription cleanup
            if demo_sub_ids:
                demo_cycle_ids = (
                    await session.execute(
                        select(SubscriptionCycle.id).where(SubscriptionCycle.subscription_id.in_(demo_sub_ids))
                    )
                ).scalars().all()
                demo_cycle_ids = list(demo_cycle_ids)
                if demo_cycle_ids:
                    await session.execute(
                        delete(SubscriptionSelection).where(SubscriptionSelection.cycle_id.in_(demo_cycle_ids))
                    )
                    await session.execute(
                        delete(SubscriptionCycle).where(SubscriptionCycle.id.in_(demo_cycle_ids))
                    )
                await session.execute(
                    delete(SubscriptionEvent).where(SubscriptionEvent.subscription_id.in_(demo_sub_ids))
                )
                r = await session.execute(delete(Subscription).where(Subscription.id.in_(demo_sub_ids)))
                counts["subscriptions"] = r.rowcount or 0

            # Per-user artifacts
            if demo_user_ids:
                r = await session.execute(
                    delete(PaymentMethod).where(PaymentMethod.user_id.in_(demo_user_ids))
                )
                counts["payment_methods"] = r.rowcount or 0
                r = await session.execute(delete(Address).where(Address.user_id.in_(demo_user_ids)))
                counts["addresses"] = r.rowcount or 0

            # Promo codes (only the demo ones by code name)
            demo_codes = [c for c, _, _, _ in DEMO_PROMO_CODES]
            r = await session.execute(
                delete(PromoCode).where(PromoCode.tenant_id == tenant_id, PromoCode.code.in_(demo_codes))
            )
            counts["promo_codes"] = r.rowcount or 0

            # Metric snapshots (only demo_ prefixed metric types)
            r = await session.execute(
                delete(MetricSnapshot).where(
                    MetricSnapshot.tenant_id == tenant_id,
                    MetricSnapshot.metric_type.like("demo_%"),
                )
            )
            counts["metric_snapshots"] = r.rowcount or 0

            # Ingredients seeded by demo (identified by description suffix)
            demo_ing_ids = (
                await session.execute(
                    select(Ingredient.id).where(
                        Ingredient.tenant_id == tenant_id,
                        Ingredient.description.like("%— seeded"),
                    )
                )
            ).scalars().all()
            demo_ing_ids = list(demo_ing_ids)
            if demo_ing_ids:
                await session.execute(
                    delete(ProductIngredient).where(ProductIngredient.ingredient_id.in_(demo_ing_ids))
                )
                r = await session.execute(delete(Ingredient).where(Ingredient.id.in_(demo_ing_ids)))
                counts["ingredients"] = r.rowcount or 0

            # Finally, demo users
            if demo_user_ids:
                r = await session.execute(delete(User).where(User.id.in_(demo_user_ids)))
                counts["users"] = r.rowcount or 0

            await session.commit()
            logger.info("Cleared demo data: %s", counts)
        except Exception:
            await session.rollback()
            logger.error("Demo clear failed", exc_info=True)
            raise
    return counts
