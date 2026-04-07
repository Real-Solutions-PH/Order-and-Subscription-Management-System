"""
Central dependency injection module.

All repo → service → route dependencies are wired here using FastAPI's Depends().
Single database for everything.
"""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

# ── DB Session dependency ────────────────────────────────────────────

SessionDep = Annotated[AsyncSession, Depends(get_db)]


# ── IAM Repos ────────────────────────────────────────────────────────

def get_tenant_repo(db: SessionDep):
    from app.modules.iam.repo import TenantRepo
    return TenantRepo(db)


def get_user_repo(db: SessionDep):
    from app.modules.iam.repo import UserRepo
    return UserRepo(db)


# ── IAM Services ─────────────────────────────────────────────────────

def get_auth_service(user_repo=Depends(get_user_repo)):
    from app.modules.iam.services import AuthService
    return AuthService(user_repo)


def get_user_service(user_repo=Depends(get_user_repo)):
    from app.modules.iam.services import UserService
    return UserService(user_repo)


# ── Tenant Config Repos & Services ───────────────────────────────────

def get_tenant_config_repo(db: SessionDep):
    from app.modules.tenant_config.repo import TenantConfigRepo
    return TenantConfigRepo(db)


def get_feature_flag_repo(db: SessionDep):
    from app.modules.tenant_config.repo import FeatureFlagRepo
    return FeatureFlagRepo(db)


def get_config_service(config_repo=Depends(get_tenant_config_repo)):
    from app.modules.tenant_config.services import ConfigService
    return ConfigService(config_repo)


def get_feature_flag_service(flag_repo=Depends(get_feature_flag_repo)):
    from app.modules.tenant_config.services import FeatureFlagService
    return FeatureFlagService(flag_repo)


# ── Product Catalog Repos & Services ─────────────────────────────────

def get_product_repo(db: SessionDep):
    from app.modules.product_catalog.repo import ProductRepo
    return ProductRepo(db)


def get_catalog_repo(db: SessionDep):
    from app.modules.product_catalog.repo import CatalogRepo
    return CatalogRepo(db)


def get_product_service(product_repo=Depends(get_product_repo)):
    from app.modules.product_catalog.services import ProductService
    return ProductService(product_repo)


def get_catalog_service(catalog_repo=Depends(get_catalog_repo)):
    from app.modules.product_catalog.services import CatalogService
    return CatalogService(catalog_repo)


# ── Subscription Engine Repos & Services ─────────────────────────────

def get_subscription_plan_repo(db: SessionDep):
    from app.modules.subscription_engine.repo import SubscriptionPlanRepo
    return SubscriptionPlanRepo(db)


def get_subscription_repo(db: SessionDep):
    from app.modules.subscription_engine.repo import SubscriptionRepo
    return SubscriptionRepo(db)


def get_subscription_plan_service(plan_repo=Depends(get_subscription_plan_repo)):
    from app.modules.subscription_engine.services import SubscriptionPlanService
    return SubscriptionPlanService(plan_repo)


def get_subscription_service(
    sub_repo=Depends(get_subscription_repo),
    plan_repo=Depends(get_subscription_plan_repo),
):
    from app.modules.subscription_engine.services import SubscriptionService
    return SubscriptionService(sub_repo, plan_repo)


# ── Order Management Repos & Services ────────────────────────────────

def get_cart_repo(db: SessionDep):
    from app.modules.order_management.repo import CartRepo
    return CartRepo(db)


def get_order_repo(db: SessionDep):
    from app.modules.order_management.repo import OrderRepo
    return OrderRepo(db)


def get_cart_service(cart_repo=Depends(get_cart_repo)):
    from app.modules.order_management.services import CartService
    return CartService(cart_repo)


def get_order_service(
    order_repo=Depends(get_order_repo),
    cart_repo=Depends(get_cart_repo),
):
    from app.modules.order_management.services import OrderService
    return OrderService(order_repo, cart_repo)


# ── Payment Processing Repos & Services ──────────────────────────────

def get_payment_repo(db: SessionDep):
    from app.modules.payment_processing.repo import PaymentRepo
    return PaymentRepo(db)


def get_promo_code_repo(db: SessionDep):
    from app.modules.payment_processing.repo import PromoCodeRepo
    return PromoCodeRepo(db)


def get_invoice_repo(db: SessionDep):
    from app.modules.payment_processing.repo import InvoiceRepo
    return InvoiceRepo(db)


def get_payment_service(payment_repo=Depends(get_payment_repo)):
    from app.modules.payment_processing.services import PaymentService
    return PaymentService(payment_repo)


def get_promo_code_service(promo_repo=Depends(get_promo_code_repo)):
    from app.modules.payment_processing.services import PromoCodeService
    return PromoCodeService(promo_repo)


def get_invoice_service(invoice_repo=Depends(get_invoice_repo)):
    from app.modules.payment_processing.services import InvoiceService
    return InvoiceService(invoice_repo)


# ── Fulfillment Repos & Services ─────────────────────────────────────

def get_delivery_zone_repo(db: SessionDep):
    from app.modules.fulfillment.repo import DeliveryZoneRepo
    return DeliveryZoneRepo(db)


def get_fulfillment_repo(db: SessionDep):
    from app.modules.fulfillment.repo import FulfillmentRepo
    return FulfillmentRepo(db)


def get_address_repo(db: SessionDep):
    from app.modules.fulfillment.repo import AddressRepo
    return AddressRepo(db)


def get_delivery_zone_service(zone_repo=Depends(get_delivery_zone_repo)):
    from app.modules.fulfillment.services import DeliveryZoneService
    return DeliveryZoneService(zone_repo)


def get_fulfillment_service(fulfillment_repo=Depends(get_fulfillment_repo)):
    from app.modules.fulfillment.services import FulfillmentService
    return FulfillmentService(fulfillment_repo)


def get_address_service(address_repo=Depends(get_address_repo)):
    from app.modules.fulfillment.services import AddressService
    return AddressService(address_repo)


# ── Notification Hub Repos & Services ────────────────────────────────

def get_notification_template_repo(db: SessionDep):
    from app.modules.notification_hub.repo import NotificationTemplateRepo
    return NotificationTemplateRepo(db)


def get_notification_repo(db: SessionDep):
    from app.modules.notification_hub.repo import NotificationRepo
    return NotificationRepo(db)


def get_notification_service(
    template_repo=Depends(get_notification_template_repo),
    notification_repo=Depends(get_notification_repo),
):
    from app.modules.notification_hub.services import NotificationService
    return NotificationService(template_repo, notification_repo)


# ── Analytics Repos & Services ───────────────────────────────────────

def get_analytics_repo(db: SessionDep):
    from app.modules.analytics.repo import AnalyticsRepo
    return AnalyticsRepo(db)


def get_analytics_service(analytics_repo=Depends(get_analytics_repo)):
    from app.modules.analytics.services import AnalyticsService
    return AnalyticsService(analytics_repo)
