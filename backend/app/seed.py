"""Prepopulate the database with required seed data if it doesn't already exist."""

import uuid
from datetime import time
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import SessionLocal
from app.logger import get_logger
from app.modules.fulfillment.models import DeliverySlot, DeliveryZone

# ── Models ───────────────────────────────────────────────────────────────
from app.modules.iam.models import Tenant, User
from app.modules.iam.services import get_password_hash
from app.modules.notification_hub.models import NotificationChannel, NotificationTemplate
from app.modules.product_catalog.models import (
    Catalog,
    CatalogItem,
    CatalogStatus,
    Product,
    ProductCategory,
    ProductStatus,
    ProductVariant,
)
from app.modules.subscription_engine.models import (
    BillingInterval,
    SubscriptionPlan,
    SubscriptionPlanTier,
)
from app.modules.tenant_config.models import TenantConfig

logger = get_logger(__name__)
settings = get_settings()


# ── Helpers ──────────────────────────────────────────────────────────────


async def _exists(session: AsyncSession, model, **filters) -> bool:
    """Return True if at least one row matches the given filters."""
    stmt = select(model.id).filter_by(**filters).limit(1)
    return (await session.execute(stmt)).scalar_one_or_none() is not None


# ── Seed functions (one per table) ───────────────────────────────────────


async def _seed_tenant(session: AsyncSession) -> uuid.UUID:
    tenant_id = uuid.UUID(settings.seed_tenant_id)
    if await _exists(session, Tenant, id=tenant_id):
        return tenant_id
    session.add(
        Tenant(
            id=tenant_id,
            name=settings.seed_tenant_name,
            slug=settings.seed_tenant_slug,
            status="active",
        )
    )
    await session.flush()
    logger.info("Seeded tenant: %s (%s)", settings.seed_tenant_name, tenant_id)
    return tenant_id


async def _seed_admin_user(session: AsyncSession, tenant_id: uuid.UUID) -> uuid.UUID:
    if await _exists(session, User, tenant_id=tenant_id, email=settings.seed_admin_email):
        return (
            await session.execute(select(User.id).filter_by(tenant_id=tenant_id, email=settings.seed_admin_email))
        ).scalar_one()
    user_id = uuid.uuid4()
    session.add(
        User(
            id=user_id,
            tenant_id=tenant_id,
            email=settings.seed_admin_email,
            hashed_password=get_password_hash(settings.seed_admin_password),
            first_name=settings.seed_admin_first_name,
            last_name=settings.seed_admin_last_name,
            is_active=True,
            role="superadmin",
        )
    )
    await session.flush()
    logger.info("Seeded admin user: %s", settings.seed_admin_email)
    return user_id


async def _seed_tenant_config(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    if await _exists(session, TenantConfig, tenant_id=tenant_id):
        return
    session.add(
        TenantConfig(
            id=uuid.uuid4(),
            tenant_id=tenant_id,
            business_name=settings.seed_business_name,
            primary_color="#4F46E5",
            secondary_color="#10B981",
            timezone=settings.seed_timezone,
            currency="PHP",
            default_language="en",
            tax_rate=Decimal("0.1200"),
            tax_label="VAT",
            order_cutoff_hours=24,
            max_pause_days=14,
            operating_hours={
                "mon": {"open": "08:00", "close": "18:00"},
                "tue": {"open": "08:00", "close": "18:00"},
                "wed": {"open": "08:00", "close": "18:00"},
                "thu": {"open": "08:00", "close": "18:00"},
                "fri": {"open": "08:00", "close": "18:00"},
                "sat": {"open": "09:00", "close": "15:00"},
                "sun": None,
            },
        )
    )
    await session.flush()
    logger.info("Seeded tenant config for tenant %s", tenant_id)


async def _seed_product_categories(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, uuid.UUID]:
    categories = {
        "Meals": ("meals", "Prepared meal options"),
        "Snacks": ("snacks", "Healthy snack options"),
        "Beverages": ("beverages", "Drinks and smoothies"),
    }
    ids: dict[str, uuid.UUID] = {}
    for name, (slug, desc) in categories.items():
        if await _exists(session, ProductCategory, tenant_id=tenant_id, slug=slug):
            row = await session.execute(select(ProductCategory.id).filter_by(tenant_id=tenant_id, slug=slug))
            ids[slug] = row.scalar_one()
            continue
        cat_id = uuid.uuid4()
        session.add(
            ProductCategory(
                id=cat_id,
                tenant_id=tenant_id,
                name=name,
                slug=slug,
                description=desc,
            )
        )
        ids[slug] = cat_id
    await session.flush()
    logger.info("Seeded product categories")
    return ids


async def _seed_products_and_variants(session: AsyncSession, tenant_id: uuid.UUID) -> list[uuid.UUID]:
    """Seed sample products with one default variant each. Returns variant IDs."""
    products = [
        {
            "name": "Classic Chicken Bowl",
            "slug": "classic-chicken-bowl",
            "description": "Grilled chicken with rice and vegetables",
            "sku": "MEAL-001",
            "status": ProductStatus.active,
            "is_subscribable": True,
            "is_standalone": True,
            "variant_name": "Regular",
            "variant_sku": "MEAL-001-REG",
            "price": Decimal("250.00"),
        },
        {
            "name": "Beef Steak Plate",
            "slug": "beef-steak-plate",
            "description": "Premium beef steak with mashed potatoes",
            "sku": "MEAL-002",
            "status": ProductStatus.active,
            "is_subscribable": True,
            "is_standalone": True,
            "variant_name": "Regular",
            "variant_sku": "MEAL-002-REG",
            "price": Decimal("350.00"),
        },
        {
            "name": "Green Smoothie",
            "slug": "green-smoothie",
            "description": "Spinach, banana, and almond milk blend",
            "sku": "BEV-001",
            "status": ProductStatus.active,
            "is_subscribable": False,
            "is_standalone": True,
            "variant_name": "500ml",
            "variant_sku": "BEV-001-500",
            "price": Decimal("120.00"),
        },
    ]

    variant_ids: list[uuid.UUID] = []
    for p in products:
        if await _exists(session, Product, tenant_id=tenant_id, slug=p["slug"]):
            row = await session.execute(select(Product.id).filter_by(tenant_id=tenant_id, slug=p["slug"]))
            product_id = row.scalar_one()
            row2 = await session.execute(select(ProductVariant.id).filter_by(product_id=product_id, is_default=True))
            vid = row2.scalar_one_or_none()
            if vid:
                variant_ids.append(vid)
            continue

        product_id = uuid.uuid4()
        variant_id = uuid.uuid4()
        session.add(
            Product(
                id=product_id,
                tenant_id=tenant_id,
                name=p["name"],
                slug=p["slug"],
                description=p["description"],
                sku=p["sku"],
                status=p["status"],
                is_subscribable=p["is_subscribable"],
                is_standalone=p["is_standalone"],
            )
        )
        session.add(
            ProductVariant(
                id=variant_id,
                product_id=product_id,
                name=p["variant_name"],
                sku=p["variant_sku"],
                price=p["price"],
                is_default=True,
                is_active=True,
            )
        )
        variant_ids.append(variant_id)

    await session.flush()
    logger.info("Seeded products and variants")
    return variant_ids


async def _seed_catalog(session: AsyncSession, tenant_id: uuid.UUID, variant_ids: list[uuid.UUID]) -> None:
    slug = "default-menu"
    if await _exists(session, Catalog, tenant_id=tenant_id, slug=slug):
        return
    catalog_id = uuid.uuid4()
    session.add(
        Catalog(
            id=catalog_id,
            tenant_id=tenant_id,
            name="Default Menu",
            slug=slug,
            description="Main product catalog",
            status=CatalogStatus.published,
        )
    )
    for i, vid in enumerate(variant_ids):
        session.add(
            CatalogItem(
                id=uuid.uuid4(),
                catalog_id=catalog_id,
                product_variant_id=vid,
                sort_order=i,
            )
        )
    await session.flush()
    logger.info("Seeded catalog with %d items", len(variant_ids))


async def _seed_subscription_plans(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    plans = [
        {
            "name": "Weekly Plan",
            "slug": "weekly-plan",
            "description": "Fresh meals delivered every week",
            "billing_interval": BillingInterval.weekly,
            "tiers": [
                {"name": "5 Meals", "items_per_cycle": 5, "price": Decimal("1150.00")},
                {"name": "10 Meals", "items_per_cycle": 10, "price": Decimal("2100.00")},
            ],
        },
        {
            "name": "Monthly Plan",
            "slug": "monthly-plan",
            "description": "Monthly meal subscription with savings",
            "billing_interval": BillingInterval.monthly,
            "tiers": [
                {"name": "20 Meals", "items_per_cycle": 20, "price": Decimal("3800.00")},
                {"name": "30 Meals", "items_per_cycle": 30, "price": Decimal("5400.00")},
            ],
        },
    ]
    for plan_data in plans:
        if await _exists(session, SubscriptionPlan, tenant_id=tenant_id, slug=plan_data["slug"]):
            continue
        plan_id = uuid.uuid4()
        session.add(
            SubscriptionPlan(
                id=plan_id,
                tenant_id=tenant_id,
                name=plan_data["name"],
                slug=plan_data["slug"],
                description=plan_data["description"],
                billing_interval=plan_data["billing_interval"],
                is_active=True,
            )
        )
        for i, tier in enumerate(plan_data["tiers"]):
            session.add(
                SubscriptionPlanTier(
                    id=uuid.uuid4(),
                    plan_id=plan_id,
                    name=tier["name"],
                    items_per_cycle=tier["items_per_cycle"],
                    price=tier["price"],
                    is_active=True,
                    sort_order=i,
                )
            )
    await session.flush()
    logger.info("Seeded subscription plans")


async def _seed_delivery_zones_and_slots(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    zones = [
        {
            "name": "Metro Manila",
            "description": "Greater Metro Manila area",
            "delivery_fee": Decimal("50.00"),
            "min_order_amount": Decimal("500.00"),
            "boundaries": {
                "postal_codes": [
                    "1000",
                    "1001",
                    "1002",
                    "1003",
                    "1004",
                    "1005",
                    "1006",
                    "1007",
                    "1008",
                    "1009",
                    "1010",
                ]
            },
            "slots": [
                {"day": d, "start": time(8, 0), "end": time(12, 0), "capacity": 50}
                for d in range(5)  # Mon-Fri morning
            ]
            + [
                {"day": d, "start": time(13, 0), "end": time(18, 0), "capacity": 50}
                for d in range(5)  # Mon-Fri afternoon
            ]
            + [
                {"day": 5, "start": time(9, 0), "end": time(14, 0), "capacity": 30},  # Sat
            ],
        },
    ]
    for z in zones:
        if await _exists(session, DeliveryZone, tenant_id=tenant_id, name=z["name"]):
            continue
        zone_id = uuid.uuid4()
        session.add(
            DeliveryZone(
                id=zone_id,
                tenant_id=tenant_id,
                name=z["name"],
                description=z["description"],
                delivery_fee=z["delivery_fee"],
                min_order_amount=z["min_order_amount"],
                boundaries=z["boundaries"],
                is_active=True,
            )
        )
        for slot in z["slots"]:
            session.add(
                DeliverySlot(
                    id=uuid.uuid4(),
                    zone_id=zone_id,
                    day_of_week=slot["day"],
                    start_time=slot["start"],
                    end_time=slot["end"],
                    capacity=slot["capacity"],
                    is_active=True,
                )
            )
    await session.flush()
    logger.info("Seeded delivery zones and slots")


async def _seed_notification_templates(session: AsyncSession, tenant_id: uuid.UUID) -> None:
    templates = [
        {
            "event_type": "order_confirmed",
            "channel": NotificationChannel.email,
            "subject": "Order Confirmed — #{{order_number}}",
            "body_template": "Hi {{first_name}}, your order #{{order_number}} has been confirmed. Total: {{currency}} {{total}}.",
        },
        {
            "event_type": "order_delivered",
            "channel": NotificationChannel.email,
            "subject": "Order Delivered — #{{order_number}}",
            "body_template": "Hi {{first_name}}, your order #{{order_number}} has been delivered. Enjoy your meal!",
        },
        {
            "event_type": "payment_received",
            "channel": NotificationChannel.email,
            "subject": "Payment Received",
            "body_template": "Hi {{first_name}}, we received your payment of {{currency}} {{amount}}. Thank you!",
        },
        {
            "event_type": "subscription_activated",
            "channel": NotificationChannel.email,
            "subject": "Subscription Activated",
            "body_template": (
                "Hi {{first_name}}, your {{plan_name}} subscription is now activeNext billing: {{next_billing_date}}."
            ),
        },
        {
            "event_type": "subscription_cancelled",
            "channel": NotificationChannel.email,
            "subject": "Subscription Cancelled",
            "body_template": "Hi {{first_name}}, your subscription has been cancelled. You can resubscribe anytime.",
        },
        {
            "event_type": "order_confirmed",
            "channel": NotificationChannel.sms,
            "subject": None,
            "body_template": "Order #{{order_number}} confirmed. Total: {{currency}} {{total}}.",
        },
    ]
    for t in templates:
        if await _exists(
            session, NotificationTemplate, tenant_id=tenant_id, event_type=t["event_type"], channel=t["channel"]
        ):
            continue
        session.add(
            NotificationTemplate(
                id=uuid.uuid4(),
                tenant_id=tenant_id,
                event_type=t["event_type"],
                channel=t["channel"],
                subject=t["subject"],
                body_template=t["body_template"],
                is_active=True,
            )
        )
    await session.flush()
    logger.info("Seeded notification templates")


# ── Main entry point ─────────────────────────────────────────────────────


async def seed_database() -> None:
    """Run all seed functions inside a single transaction.

    Safe to call on every startup — each seeder checks for existing data
    before inserting.
    """
    async with SessionLocal() as session:
        try:
            tenant_id = await _seed_tenant(session)
            await _seed_admin_user(session, tenant_id)
            await _seed_tenant_config(session, tenant_id)
            await _seed_product_categories(session, tenant_id)
            variant_ids = await _seed_products_and_variants(session, tenant_id)
            await _seed_catalog(session, tenant_id, variant_ids)
            await _seed_subscription_plans(session, tenant_id)
            await _seed_delivery_zones_and_slots(session, tenant_id)
            await _seed_notification_templates(session, tenant_id)
            await session.commit()
            logger.info("Database seed completed successfully")
        except Exception:
            await session.rollback()
            logger.error("Database seed failed", exc_info=True)
            raise
