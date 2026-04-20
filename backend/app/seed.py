"""
Database seeding module.

This module provides idempotent database seeding that runs on every application
startup via the FastAPI lifespan hook in ``main.py``.

Seed data is split into two categories:

**Essential seeds** (always run):
  - Tenant -- the default tenant record
  - Admin user -- the superuser account for first login
  - Tenant config -- business settings (timezone, currency, tax, hours)

**Template seeds** (only when ``SEED_TEMPLATE_DATA=true``):
  - Product categories, products with variants, and a default catalog
  - Subscription plans with tiered pricing
  - Delivery zones with delivery time slots
  - Notification templates for transactional emails/SMS

Template data definitions live in ``seed_template_data.py`` -- a plain Python
data file that business owners can customise before their first deployment.

Each seed function checks whether data already exists before inserting,
making the entire module safe to call repeatedly (idempotent).
"""

import uuid
from decimal import Decimal

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.database import SessionLocal
from app.logger import get_logger

# -- Models ------------------------------------------------------------------
from app.modules.fulfillment.models import DeliverySlot, DeliveryZone
from app.modules.iam.models import Tenant, User
from app.modules.iam.services import get_password_hash
from app.modules.notification_hub.models import NotificationChannel, NotificationTemplate
from app.modules.product_catalog.models import (
    Catalog,
    CatalogItem,
    CatalogStatus,
    Product,
    ProductCategory,
    ProductImage,
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


# -- Helpers -----------------------------------------------------------------


async def _exists(session: AsyncSession, model, **filters) -> bool:
    """Return True if at least one row matches the given filters."""
    stmt = select(model.id).filter_by(**filters).limit(1)
    return (await session.execute(stmt)).scalar_one_or_none() is not None


# ============================================================================
# Essential Seeds (always run)
# ============================================================================


async def _seed_tenant(session: AsyncSession) -> uuid.UUID:
    """Create the default tenant if it does not exist."""
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
    """Create the admin superuser for first-time login.

    If the row already exists, ensure it stays active with the superadmin
    role so a stale deactivation or pre-role-migration record doesn't
    lock the tenant out of its only admin.
    """
    existing = (
        await session.execute(select(User).filter_by(tenant_id=tenant_id, email=settings.seed_admin_email))
    ).scalar_one_or_none()
    if existing is not None:
        if not existing.is_active:
            existing.is_active = True
            logger.info("Reactivated seed admin user: %s", settings.seed_admin_email)
        if existing.role != "superadmin":
            existing.role = "superadmin"
            logger.info("Restored superadmin role on seed admin: %s", settings.seed_admin_email)
        await session.flush()
        return existing.id
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
    """Set default business configuration (hours, currency, tax rate)."""
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


# ============================================================================
# Template Seeds (gated by SEED_TEMPLATE_DATA env var)
# ============================================================================


async def _seed_product_categories(session: AsyncSession, tenant_id: uuid.UUID) -> dict[str, uuid.UUID]:
    """Seed product categories from template data."""
    from app.seed_template_data import PRODUCT_CATEGORIES

    ids: dict[str, uuid.UUID] = {}
    for cat in PRODUCT_CATEGORIES:
        slug = cat["slug"]
        if await _exists(session, ProductCategory, tenant_id=tenant_id, slug=slug):
            row = await session.execute(select(ProductCategory.id).filter_by(tenant_id=tenant_id, slug=slug))
            ids[slug] = row.scalar_one()
            continue
        cat_id = uuid.uuid4()
        session.add(
            ProductCategory(
                id=cat_id,
                tenant_id=tenant_id,
                name=cat["name"],
                slug=slug,
                description=cat["description"],
            )
        )
        ids[slug] = cat_id
    await session.flush()
    logger.info("Seeded %d product categories", len(PRODUCT_CATEGORIES))
    return ids


async def _seed_products_and_variants(session: AsyncSession, tenant_id: uuid.UUID) -> list[uuid.UUID]:
    """Seed products with default variants and nutritional metadata.

    The ``metadata`` field stores nutritional info, dietary tags, allergens,
    and ingredients. The frontend reads this via the product API to populate
    meal cards without needing mock data fallback.

    Returns the list of variant IDs for catalog creation.
    """
    from app.seed_template_data import PRODUCTS

    variant_ids: list[uuid.UUID] = []
    for p in PRODUCTS:
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

        # Map string status to enum
        status = ProductStatus.active if p["status"] == "active" else ProductStatus.draft

        session.add(
            Product(
                id=product_id,
                tenant_id=tenant_id,
                name=p["name"],
                slug=p["slug"],
                description=p["description"],
                sku=p["sku"],
                status=status,
                is_subscribable=p["is_subscribable"],
                is_standalone=p["is_standalone"],
                metadata_=p.get("metadata"),
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

        # Seed product image if provided
        image_url = p.get("image_url")
        if image_url:
            session.add(
                ProductImage(
                    id=uuid.uuid4(),
                    product_id=product_id,
                    url=image_url,
                    alt_text=p["name"],
                    sort_order=0,
                    is_primary=True,
                )
            )

        variant_ids.append(variant_id)

    await session.flush()
    logger.info("Seeded %d products with variants", len(PRODUCTS))
    return variant_ids


async def _seed_catalog(session: AsyncSession, tenant_id: uuid.UUID, variant_ids: list[uuid.UUID]) -> None:
    """Create a default published catalog containing all seeded products."""
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
    """Seed subscription plans with tiered pricing from template data."""
    from app.seed_template_data import SUBSCRIPTION_PLANS

    interval_map = {
        "weekly": BillingInterval.weekly,
        "biweekly": BillingInterval.biweekly,
        "monthly": BillingInterval.monthly,
    }

    for plan_data in SUBSCRIPTION_PLANS:
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
                billing_interval=interval_map[plan_data["billing_interval"]],
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
    """Seed delivery zones and their time slots from template data."""
    from app.seed_template_data import DELIVERY_ZONES

    for z in DELIVERY_ZONES:
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
            "body_template": (
                "Hi {{first_name}}, your order #{{order_number}} has been confirmed. Total: {{currency}} {{total}}."
            ),
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


# ============================================================================
# Main entry point
# ============================================================================


async def seed_database() -> None:
    """Run all seed functions inside a single transaction.

    Essential seeds (tenant, admin, config) always run.
    Template seeds (products, plans, zones, notifications) only run
    when ``SEED_TEMPLATE_DATA=true`` (the default).

    Safe to call on every startup -- each seeder checks for existing
    data before inserting.
    """
    async with SessionLocal() as session:
        try:
            # -- Essential seeds (always) ------------------------------------
            tenant_id = await _seed_tenant(session)
            await _seed_admin_user(session, tenant_id)
            await _seed_tenant_config(session, tenant_id)

            # -- Template seeds (conditional) --------------------------------
            if settings.seed_template_data:
                logger.info("SEED_TEMPLATE_DATA=true -- seeding template data")
                await _seed_product_categories(session, tenant_id)
                variant_ids = await _seed_products_and_variants(session, tenant_id)
                await _seed_catalog(session, tenant_id, variant_ids)
                await _seed_subscription_plans(session, tenant_id)
                await _seed_delivery_zones_and_slots(session, tenant_id)
                await _seed_notification_templates(session, tenant_id)
            else:
                logger.info("SEED_TEMPLATE_DATA=false -- skipping template data")

            await session.commit()
            logger.info("Database seed completed successfully")
        except Exception:
            await session.rollback()
            logger.error("Database seed failed", exc_info=True)
            raise
