"""
SQLAlchemy 2.0 ORM models for the Order & Subscription Management System.

All 39 tables organised by module:
  1. IAM (tenants, users, roles, permissions, user_roles, role_permissions)
  2. Tenant Configuration (tenant_configs, feature_flags)
  3. Product Catalog (product_categories, products, product_variants, product_attributes,
     product_attribute_values, product_images, product_category_association, catalogs,
     catalog_items, catalog_schedules)
  4. Subscription Engine (subscription_plans, subscription_plan_tiers, subscriptions,
     subscription_cycles, subscription_selections, subscription_events)
  5. Order Management (carts, cart_items, cart_item_customizations, orders, order_items,
     order_item_customizations, order_status_history)
  6. Payment Processing (payment_methods, payments, payment_transactions, invoices,
     invoice_line_items, promo_codes, promo_code_usages)
  7. Fulfillment & Logistics (addresses, delivery_zones, delivery_slots, fulfillment_orders)
  8. Notification Hub (notification_templates, notifications, notification_logs)
  9. Analytics (metric_snapshots, cohort_data)
 10. Integration Gateway (webhooks, webhook_events, integration_configs, audit_logs)
"""

from __future__ import annotations

import enum
import uuid
from datetime import date, datetime, time
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    Time,
    UniqueConstraint,
    Index,
)
from sqlalchemy import Enum as SAEnum
from sqlalchemy import DECIMAL, JSON, TIMESTAMP
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.sql import func


# ---------------------------------------------------------------------------
# Base & mixins
# ---------------------------------------------------------------------------


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        TIMESTAMP(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )


# ---------------------------------------------------------------------------
# Python enums
# ---------------------------------------------------------------------------


# --- IAM ---
class TenantStatus(str, enum.Enum):
    active = "active"
    suspended = "suspended"
    trial = "trial"


class UserStatus(str, enum.Enum):
    active = "active"
    inactive = "inactive"
    suspended = "suspended"


# --- Product Catalog ---
class ProductStatus(str, enum.Enum):
    draft = "draft"
    active = "active"
    archived = "archived"


class AttributeType(str, enum.Enum):
    text = "text"
    number = "number"
    boolean = "boolean"
    select = "select"
    multi_select = "multi_select"


class CatalogStatus(str, enum.Enum):
    draft = "draft"
    published = "published"
    archived = "archived"


# --- Subscription Engine ---
class BillingInterval(str, enum.Enum):
    weekly = "weekly"
    biweekly = "biweekly"
    monthly = "monthly"


class SubscriptionStatus(str, enum.Enum):
    created = "created"
    active = "active"
    paused = "paused"
    pending_cancel = "pending_cancel"
    cancelled = "cancelled"


class CycleStatus(str, enum.Enum):
    upcoming = "upcoming"
    selection_open = "selection_open"
    selections_locked = "selections_locked"
    order_created = "order_created"
    completed = "completed"
    skipped = "skipped"


class SubscriptionEventType(str, enum.Enum):
    created = "created"
    activated = "activated"
    paused = "paused"
    resumed = "resumed"
    modified = "modified"
    cancelled = "cancelled"
    renewed = "renewed"
    skipped = "skipped"


# --- Order Management ---
class OrderStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    processing = "processing"
    ready = "ready"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    picked_up = "picked_up"
    cancelled = "cancelled"
    refunded = "refunded"


class OrderType(str, enum.Enum):
    one_time = "one_time"
    subscription = "subscription"
    reorder = "reorder"


# --- Payment Processing ---
class PaymentMethodType(str, enum.Enum):
    card = "card"
    gcash = "gcash"
    maya = "maya"
    grabpay = "grabpay"
    qr_ph = "qr_ph"
    otc = "otc"
    cod = "cod"
    wallet = "wallet"


class PaymentStatus(str, enum.Enum):
    pending = "pending"
    awaiting_method = "awaiting_method"
    awaiting_action = "awaiting_action"
    processing = "processing"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"
    partially_refunded = "partially_refunded"
    pending_collection = "pending_collection"


class PaymentChannel(str, enum.Enum):
    paymongo = "paymongo"
    cod = "cod"
    wallet = "wallet"


class TransactionType(str, enum.Enum):
    intent_created = "intent_created"
    method_attached = "method_attached"
    awaiting_action = "awaiting_action"
    paid = "paid"
    failed = "failed"
    refunded = "refunded"
    refund_updated = "refund_updated"
    cod_collected = "cod_collected"


class TransactionStatus(str, enum.Enum):
    success = "success"
    failed = "failed"
    pending = "pending"


class InvoiceStatus(str, enum.Enum):
    draft = "draft"
    issued = "issued"
    paid = "paid"
    void = "void"


class DiscountType(str, enum.Enum):
    percentage = "percentage"
    fixed_amount = "fixed_amount"


# --- Fulfillment & Logistics ---
class FulfillmentType(str, enum.Enum):
    delivery = "delivery"
    pickup = "pickup"


class FulfillmentStatus(str, enum.Enum):
    created = "created"
    in_production = "in_production"
    packed = "packed"
    shipped = "shipped"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    picked_up = "picked_up"
    failed = "failed"


# --- Notification Hub ---
class NotificationChannel(str, enum.Enum):
    email = "email"
    sms = "sms"
    push = "push"
    whatsapp = "whatsapp"


class NotificationStatus(str, enum.Enum):
    queued = "queued"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"
    bounced = "bounced"


class NotificationLogStatus(str, enum.Enum):
    success = "success"
    failed = "failed"


# --- Analytics ---
class PeriodType(str, enum.Enum):
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"


# --- Integration Gateway ---
class WebhookEventStatus(str, enum.Enum):
    pending = "pending"
    delivered = "delivered"
    failed = "failed"


class IntegrationSystemType(str, enum.Enum):
    inventory = "inventory"
    food_costing = "food_costing"
    menu_recipe = "menu_recipe"
    crm = "crm"
    accounting = "accounting"


# ===========================================================================
# Module 1: IAM
# ===========================================================================


class Tenant(TimestampMixin, Base):
    __tablename__ = "tenants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    domain: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    status: Mapped[TenantStatus] = mapped_column(
        SAEnum(TenantStatus, name="tenant_status", create_constraint=True),
        nullable=False,
        server_default="active",
    )
    trial_ends_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    # relationships
    users: Mapped[list["User"]] = relationship(back_populates="tenant")
    roles: Mapped[list["Role"]] = relationship(back_populates="tenant")
    tenant_config: Mapped[Optional["TenantConfig"]] = relationship(back_populates="tenant")
    feature_flags: Mapped[list["FeatureFlag"]] = relationship(back_populates="tenant")
    product_categories: Mapped[list["ProductCategory"]] = relationship(back_populates="tenant")
    products: Mapped[list["Product"]] = relationship(back_populates="tenant")
    product_attributes: Mapped[list["ProductAttribute"]] = relationship(back_populates="tenant")
    catalogs: Mapped[list["Catalog"]] = relationship(back_populates="tenant")
    subscription_plans: Mapped[list["SubscriptionPlan"]] = relationship(back_populates="tenant")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="tenant")
    carts: Mapped[list["Cart"]] = relationship(back_populates="tenant")
    orders: Mapped[list["Order"]] = relationship(back_populates="tenant")
    payment_methods: Mapped[list["PaymentMethod"]] = relationship(back_populates="tenant")
    payments: Mapped[list["Payment"]] = relationship(back_populates="tenant")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="tenant")
    promo_codes: Mapped[list["PromoCode"]] = relationship(back_populates="tenant")
    addresses: Mapped[list["Address"]] = relationship(back_populates="tenant")
    delivery_zones: Mapped[list["DeliveryZone"]] = relationship(back_populates="tenant")
    fulfillment_orders: Mapped[list["FulfillmentOrder"]] = relationship(back_populates="tenant")
    notification_templates: Mapped[list["NotificationTemplate"]] = relationship(back_populates="tenant")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="tenant")
    metric_snapshots: Mapped[list["MetricSnapshot"]] = relationship(back_populates="tenant")
    cohort_data: Mapped[list["CohortData"]] = relationship(back_populates="tenant")
    webhooks: Mapped[list["Webhook"]] = relationship(back_populates="tenant")
    integration_configs: Mapped[list["IntegrationConfig"]] = relationship(back_populates="tenant")
    audit_logs: Mapped[list["AuditLog"]] = relationship(back_populates="tenant")


class User(TimestampMixin, Base):
    __tablename__ = "users"
    __table_args__ = (Index("ix_users_tenant_email", "tenant_id", "email", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    status: Mapped[UserStatus] = mapped_column(
        SAEnum(UserStatus, name="user_status", create_constraint=True),
        nullable=False,
        server_default="active",
    )
    email_verified_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    last_login_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="users")
    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="user")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="user")
    carts: Mapped[list["Cart"]] = relationship(back_populates="user")
    orders: Mapped[list["Order"]] = relationship(back_populates="user")
    payment_methods: Mapped[list["PaymentMethod"]] = relationship(back_populates="user")
    addresses: Mapped[list["Address"]] = relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="user")
    subscription_events: Mapped[list["SubscriptionEvent"]] = relationship(back_populates="actor")
    order_status_changes: Mapped[list["OrderStatusHistory"]] = relationship(back_populates="changed_by_user")
    promo_code_usages: Mapped[list["PromoCodeUsage"]] = relationship(back_populates="user")


class Role(TimestampMixin, Base):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")
    is_system: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    hierarchy_level: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="roles")
    user_roles: Mapped[list["UserRole"]] = relationship(back_populates="role")
    role_permissions: Mapped[list["RolePermission"]] = relationship(back_populates="role")


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    resource: Mapped[str] = mapped_column(String(100), nullable=False)
    action: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False, server_default="")

    # relationships
    role_permissions: Mapped[list["RolePermission"]] = relationship(back_populates="permission")


class UserRole(Base):
    __tablename__ = "user_roles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    user: Mapped["User"] = relationship(back_populates="user_roles")
    role: Mapped["Role"] = relationship(back_populates="user_roles")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), primary_key=True)
    permission_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("permissions.id"), primary_key=True)

    # relationships
    role: Mapped["Role"] = relationship(back_populates="role_permissions")
    permission: Mapped["Permission"] = relationship(back_populates="role_permissions")


# ===========================================================================
# Module 2: Tenant Configuration
# ===========================================================================


class TenantConfig(Base):
    __tablename__ = "tenant_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), unique=True, nullable=False)
    business_name: Mapped[str] = mapped_column(String(255), nullable=False)
    logo_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    primary_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    secondary_color: Mapped[Optional[str]] = mapped_column(String(7), nullable=True)
    timezone: Mapped[str] = mapped_column(String(50), nullable=False, server_default="UTC")
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="PHP")
    default_language: Mapped[str] = mapped_column(String(5), nullable=False, server_default="en")
    tax_rate: Mapped[Decimal] = mapped_column(DECIMAL(5, 4), nullable=False, server_default="0.0000")
    tax_label: Mapped[str] = mapped_column(String(50), nullable=False, server_default="VAT")
    order_cutoff_hours: Mapped[int] = mapped_column(Integer, nullable=False, server_default="24")
    max_pause_days: Mapped[int] = mapped_column(Integer, nullable=False, server_default="30")
    operating_hours: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    payment_gateways: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    notification_settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="tenant_config")


class FeatureFlag(TimestampMixin, Base):
    __tablename__ = "feature_flags"
    __table_args__ = (UniqueConstraint("tenant_id", "flag_key", name="uq_feature_flags_tenant_key"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    flag_key: Mapped[str] = mapped_column(String(100), nullable=False)
    enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="feature_flags")


# ===========================================================================
# Module 3: Product Catalog
# ===========================================================================

# Association table for many-to-many: products <-> product_categories
product_category_association = Table(
    "product_category_association",
    Base.metadata,
    Column("product_id", ForeignKey("products.id"), primary_key=True),
    Column("category_id", ForeignKey("product_categories.id"), primary_key=True),
)


class ProductCategory(TimestampMixin, Base):
    __tablename__ = "product_categories"
    __table_args__ = (Index("ix_product_categories_tenant_slug", "tenant_id", "slug", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("product_categories.id"), nullable=True)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="product_categories")
    parent: Mapped[Optional["ProductCategory"]] = relationship(
        back_populates="children", remote_side="ProductCategory.id"
    )
    children: Mapped[list["ProductCategory"]] = relationship(back_populates="parent")
    products: Mapped[list["Product"]] = relationship(
        secondary=product_category_association, back_populates="categories"
    )


class Product(TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (Index("ix_products_tenant_slug", "tenant_id", "slug", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    short_description: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    sku: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    status: Mapped[ProductStatus] = mapped_column(
        SAEnum(ProductStatus, name="product_status", create_constraint=True),
        nullable=False,
        server_default="draft",
    )
    is_subscribable: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_standalone: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="products")
    variants: Mapped[list["ProductVariant"]] = relationship(back_populates="product")
    attribute_values: Mapped[list["ProductAttributeValue"]] = relationship(back_populates="product")
    images: Mapped[list["ProductImage"]] = relationship(back_populates="product")
    categories: Mapped[list["ProductCategory"]] = relationship(
        secondary=product_category_association, back_populates="products"
    )


class ProductVariant(TimestampMixin, Base):
    __tablename__ = "product_variants"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    compare_at_price: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    cost_price: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    weight: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(8, 2), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    stock_quantity: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    product: Mapped["Product"] = relationship(back_populates="variants")
    catalog_items: Mapped[list["CatalogItem"]] = relationship(back_populates="product_variant")
    subscription_selections: Mapped[list["SubscriptionSelection"]] = relationship(back_populates="product_variant")
    cart_items: Mapped[list["CartItem"]] = relationship(back_populates="product_variant")
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="product_variant")


class ProductAttribute(TimestampMixin, Base):
    __tablename__ = "product_attributes"
    __table_args__ = (Index("ix_product_attributes_tenant_slug", "tenant_id", "slug", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[AttributeType] = mapped_column(
        SAEnum(AttributeType, name="attribute_type", create_constraint=True), nullable=False
    )
    is_filterable: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    is_visible: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="product_attributes")
    attribute_values: Mapped[list["ProductAttributeValue"]] = relationship(back_populates="attribute")


class ProductAttributeValue(Base):
    __tablename__ = "product_attribute_values"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    attribute_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_attributes.id"), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)

    # relationships
    product: Mapped["Product"] = relationship(back_populates="attribute_values")
    attribute: Mapped["ProductAttribute"] = relationship(back_populates="attribute_values")


class ProductImage(Base):
    __tablename__ = "product_images"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")

    # relationships
    product: Mapped["Product"] = relationship(back_populates="images")


class Catalog(TimestampMixin, Base):
    __tablename__ = "catalogs"
    __table_args__ = (Index("ix_catalogs_tenant_slug", "tenant_id", "slug", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[CatalogStatus] = mapped_column(
        SAEnum(CatalogStatus, name="catalog_status", create_constraint=True),
        nullable=False,
        server_default="draft",
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="catalogs")
    items: Mapped[list["CatalogItem"]] = relationship(back_populates="catalog")
    schedules: Mapped[list["CatalogSchedule"]] = relationship(back_populates="catalog")


class CatalogItem(Base):
    __tablename__ = "catalog_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    catalog_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("catalogs.id"), nullable=False)
    product_variant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_variants.id"), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    is_featured: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    availability_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # relationships
    catalog: Mapped["Catalog"] = relationship(back_populates="items")
    product_variant: Mapped["ProductVariant"] = relationship(back_populates="catalog_items")


class CatalogSchedule(Base):
    __tablename__ = "catalog_schedules"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    catalog_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("catalogs.id"), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    recurrence_rule: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # relationships
    catalog: Mapped["Catalog"] = relationship(back_populates="schedules")


# ===========================================================================
# Module 4: Subscription Engine
# ===========================================================================


class SubscriptionPlan(TimestampMixin, Base):
    __tablename__ = "subscription_plans"
    __table_args__ = (Index("ix_subscription_plans_tenant_slug", "tenant_id", "slug", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    billing_interval: Mapped[BillingInterval] = mapped_column(
        SAEnum(BillingInterval, name="billing_interval", create_constraint=True), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="subscription_plans")
    tiers: Mapped[list["SubscriptionPlanTier"]] = relationship(back_populates="plan")


class SubscriptionPlanTier(TimestampMixin, Base):
    __tablename__ = "subscription_plan_tiers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subscription_plans.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    items_per_cycle: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    compare_at_price: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")

    # relationships
    plan: Mapped["SubscriptionPlan"] = relationship(back_populates="tiers")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="plan_tier")


class Subscription(TimestampMixin, Base):
    __tablename__ = "subscriptions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    plan_tier_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subscription_plan_tiers.id"), nullable=False)
    status: Mapped[SubscriptionStatus] = mapped_column(
        SAEnum(SubscriptionStatus, name="subscription_status", create_constraint=True),
        nullable=False,
        server_default="created",
    )
    current_cycle_start: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    current_cycle_end: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    next_billing_date: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    paused_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    pause_expires_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    payment_method_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("payment_methods.id"), nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="subscriptions")
    user: Mapped["User"] = relationship(back_populates="subscriptions")
    plan_tier: Mapped["SubscriptionPlanTier"] = relationship(back_populates="subscriptions")
    payment_method: Mapped[Optional["PaymentMethod"]] = relationship(back_populates="subscriptions")
    cycles: Mapped[list["SubscriptionCycle"]] = relationship(back_populates="subscription")
    events: Mapped[list["SubscriptionEvent"]] = relationship(back_populates="subscription")
    orders: Mapped[list["Order"]] = relationship(back_populates="subscription")
    payments: Mapped[list["Payment"]] = relationship(back_populates="subscription")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="subscription")


class SubscriptionCycle(TimestampMixin, Base):
    __tablename__ = "subscription_cycles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    subscription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subscriptions.id"), nullable=False)
    cycle_number: Mapped[int] = mapped_column(Integer, nullable=False)
    starts_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    selection_deadline: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    status: Mapped[CycleStatus] = mapped_column(
        SAEnum(CycleStatus, name="cycle_status", create_constraint=True),
        nullable=False,
        server_default="upcoming",
    )
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("orders.id"), nullable=True)
    billed_amount: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)

    # relationships
    subscription: Mapped["Subscription"] = relationship(back_populates="cycles")
    order: Mapped[Optional["Order"]] = relationship(back_populates="subscription_cycle")
    selections: Mapped[list["SubscriptionSelection"]] = relationship(back_populates="cycle")


class SubscriptionSelection(Base):
    __tablename__ = "subscription_selections"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cycle_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subscription_cycles.id"), nullable=False)
    product_variant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_variants.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False, server_default="1")
    customization: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)

    # relationships
    cycle: Mapped["SubscriptionCycle"] = relationship(back_populates="selections")
    product_variant: Mapped["ProductVariant"] = relationship(back_populates="subscription_selections")


class SubscriptionEvent(Base):
    __tablename__ = "subscription_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    subscription_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("subscriptions.id"), nullable=False)
    event_type: Mapped[SubscriptionEventType] = mapped_column(
        SAEnum(SubscriptionEventType, name="subscription_event_type", create_constraint=True),
        nullable=False,
    )
    event_data: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    actor_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    subscription: Mapped["Subscription"] = relationship(back_populates="events")
    actor: Mapped["User"] = relationship(back_populates="subscription_events")


# ===========================================================================
# Module 5: Order Management
# ===========================================================================


class Cart(TimestampMixin, Base):
    __tablename__ = "carts"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    session_id: Mapped[str] = mapped_column(String(255), nullable=False)
    promo_code_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("promo_codes.id"), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="carts")
    user: Mapped[Optional["User"]] = relationship(back_populates="carts")
    promo_code: Mapped[Optional["PromoCode"]] = relationship(back_populates="carts")
    items: Mapped[list["CartItem"]] = relationship(back_populates="cart")


class CartItem(TimestampMixin, Base):
    __tablename__ = "cart_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cart_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("carts.id"), nullable=False)
    product_variant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_variants.id"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)

    # relationships
    cart: Mapped["Cart"] = relationship(back_populates="items")
    product_variant: Mapped["ProductVariant"] = relationship(back_populates="cart_items")
    customizations: Mapped[list["CartItemCustomization"]] = relationship(back_populates="cart_item")


class CartItemCustomization(Base):
    __tablename__ = "cart_item_customizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cart_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("cart_items.id"), nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    price_adjustment: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, server_default="0.00")

    # relationships
    cart_item: Mapped["CartItem"] = relationship(back_populates="customizations")


class Order(TimestampMixin, Base):
    __tablename__ = "orders"
    __table_args__ = (Index("ix_orders_tenant_order_number", "tenant_id", "order_number", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("subscriptions.id"), nullable=True)
    subscription_cycle_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("subscription_cycles.id"), nullable=True
    )
    order_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, name="order_status", create_constraint=True),
        nullable=False,
        server_default="pending",
    )
    order_type: Mapped[OrderType] = mapped_column(
        SAEnum(OrderType, name="order_type", create_constraint=True), nullable=False
    )
    subtotal: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    discount_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, server_default="0.00")
    tax_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, server_default="0.00")
    delivery_fee: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, server_default="0.00")
    total: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="PHP")
    delivery_address_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("addresses.id"), nullable=True)
    delivery_slot_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("delivery_slots.id"), nullable=True)
    promo_code_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("promo_codes.id"), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    placed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    confirmed_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    cancelled_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    cancellation_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="orders")
    user: Mapped[Optional["User"]] = relationship(back_populates="orders")
    subscription: Mapped[Optional["Subscription"]] = relationship(back_populates="orders")
    subscription_cycle: Mapped[Optional["SubscriptionCycle"]] = relationship(back_populates="order")
    delivery_address: Mapped[Optional["Address"]] = relationship(back_populates="orders")
    delivery_slot: Mapped[Optional["DeliverySlot"]] = relationship(back_populates="orders")
    promo_code: Mapped[Optional["PromoCode"]] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order")
    status_history: Mapped[list["OrderStatusHistory"]] = relationship(back_populates="order")
    payments: Mapped[list["Payment"]] = relationship(back_populates="order")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="order")
    fulfillment_orders: Mapped[list["FulfillmentOrder"]] = relationship(back_populates="order")
    promo_code_usages: Mapped[list["PromoCodeUsage"]] = relationship(back_populates="order")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=False)
    product_variant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("product_variants.id"), nullable=False)
    product_name: Mapped[str] = mapped_column(String(255), nullable=False)
    variant_name: Mapped[str] = mapped_column(String(100), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)

    # relationships
    order: Mapped["Order"] = relationship(back_populates="items")
    product_variant: Mapped["ProductVariant"] = relationship(back_populates="order_items")
    customizations: Mapped[list["OrderItemCustomization"]] = relationship(back_populates="order_item")


class OrderItemCustomization(Base):
    __tablename__ = "order_item_customizations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_item_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("order_items.id"), nullable=False)
    key: Mapped[str] = mapped_column(String(100), nullable=False)
    value: Mapped[str] = mapped_column(String(255), nullable=False)
    price_adjustment: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, server_default="0.00")

    # relationships
    order_item: Mapped["OrderItem"] = relationship(back_populates="customizations")


class OrderStatusHistory(Base):
    __tablename__ = "order_status_history"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=False)
    from_status: Mapped[Optional[OrderStatus]] = mapped_column(
        SAEnum(OrderStatus, name="order_status", create_constraint=False), nullable=True
    )
    to_status: Mapped[OrderStatus] = mapped_column(
        SAEnum(OrderStatus, name="order_status", create_constraint=False), nullable=False
    )
    changed_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    order: Mapped["Order"] = relationship(back_populates="status_history")
    changed_by_user: Mapped["User"] = relationship(back_populates="order_status_changes")


# ===========================================================================
# Module 6: Payment Processing
# ===========================================================================


class PaymentMethod(TimestampMixin, Base):
    __tablename__ = "payment_methods"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    type: Mapped[PaymentMethodType] = mapped_column(
        SAEnum(PaymentMethodType, name="payment_method_type", create_constraint=True), nullable=False
    )
    paymongo_method_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    last_four: Mapped[Optional[str]] = mapped_column(String(4), nullable=True)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    card_brand: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    expires_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="payment_methods")
    user: Mapped["User"] = relationship(back_populates="payment_methods")
    subscriptions: Mapped[list["Subscription"]] = relationship(back_populates="payment_method")


class Payment(TimestampMixin, Base):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("orders.id"), nullable=True)
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("subscriptions.id"), nullable=True)
    payment_method_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("payment_methods.id"), nullable=True)
    amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="PHP")
    status: Mapped[PaymentStatus] = mapped_column(
        SAEnum(PaymentStatus, name="payment_status", create_constraint=True),
        nullable=False,
        server_default="pending",
    )
    payment_channel: Mapped[PaymentChannel] = mapped_column(
        SAEnum(PaymentChannel, name="payment_channel", create_constraint=True), nullable=False
    )
    paymongo_intent_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paymongo_payment_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paymongo_checkout_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    checkout_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    next_retry_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    paid_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="payments")
    order: Mapped[Optional["Order"]] = relationship(back_populates="payments")
    subscription: Mapped[Optional["Subscription"]] = relationship(back_populates="payments")
    payment_method: Mapped[Optional["PaymentMethod"]] = relationship()
    transactions: Mapped[list["PaymentTransaction"]] = relationship(back_populates="payment")


class PaymentTransaction(Base):
    __tablename__ = "payment_transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    payment_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("payments.id"), nullable=False)
    type: Mapped[TransactionType] = mapped_column(
        SAEnum(TransactionType, name="transaction_type", create_constraint=True), nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    status: Mapped[TransactionStatus] = mapped_column(
        SAEnum(TransactionStatus, name="transaction_status", create_constraint=True), nullable=False
    )
    paymongo_event_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paymongo_resource_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    paymongo_response: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    payment_method_type: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    fee_amount: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    net_amount: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    error_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    payment: Mapped["Payment"] = relationship(back_populates="transactions")


class Invoice(TimestampMixin, Base):
    __tablename__ = "invoices"
    __table_args__ = (Index("ix_invoices_tenant_invoice_number", "tenant_id", "invoice_number", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    order_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("orders.id"), nullable=True)
    subscription_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("subscriptions.id"), nullable=True)
    invoice_number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[InvoiceStatus] = mapped_column(
        SAEnum(InvoiceStatus, name="invoice_status", create_constraint=True),
        nullable=False,
        server_default="draft",
    )
    subtotal: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    tax_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, server_default="0.00")
    discount_amount: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False, server_default="0.00")
    total: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, server_default="PHP")
    issued_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    paid_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    pdf_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="invoices")
    order: Mapped[Optional["Order"]] = relationship(back_populates="invoices")
    subscription: Mapped[Optional["Subscription"]] = relationship(back_populates="invoices")
    line_items: Mapped[list["InvoiceLineItem"]] = relationship(back_populates="invoice")


class InvoiceLineItem(Base):
    __tablename__ = "invoice_line_items"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    invoice_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("invoices.id"), nullable=False)
    description: Mapped[str] = mapped_column(String(255), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    total_price: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)

    # relationships
    invoice: Mapped["Invoice"] = relationship(back_populates="line_items")


class PromoCode(TimestampMixin, Base):
    __tablename__ = "promo_codes"
    __table_args__ = (Index("ix_promo_codes_tenant_code", "tenant_id", "code", unique=True),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    code: Mapped[str] = mapped_column(String(50), nullable=False)
    discount_type: Mapped[DiscountType] = mapped_column(
        SAEnum(DiscountType, name="discount_type", create_constraint=True), nullable=False
    )
    discount_value: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    min_order_amount: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    max_discount_amount: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    usage_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    per_user_limit: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    first_order_only: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    starts_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    expires_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="promo_codes")
    carts: Mapped[list["Cart"]] = relationship(back_populates="promo_code")
    orders: Mapped[list["Order"]] = relationship(back_populates="promo_code")
    usages: Mapped[list["PromoCodeUsage"]] = relationship(back_populates="promo_code")


class PromoCodeUsage(Base):
    __tablename__ = "promo_code_usages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    promo_code_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("promo_codes.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=False)
    discount_applied: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    promo_code: Mapped["PromoCode"] = relationship(back_populates="usages")
    user: Mapped["User"] = relationship(back_populates="promo_code_usages")
    order: Mapped["Order"] = relationship(back_populates="promo_code_usages")


# ===========================================================================
# Module 7: Fulfillment & Logistics
# ===========================================================================


class Address(TimestampMixin, Base):
    __tablename__ = "addresses"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    label: Mapped[str] = mapped_column(String(50), nullable=False)
    line_1: Mapped[str] = mapped_column(String(255), nullable=False)
    line_2: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    province: Mapped[str] = mapped_column(String(100), nullable=False)
    postal_code: Mapped[str] = mapped_column(String(20), nullable=False)
    country: Mapped[str] = mapped_column(String(2), nullable=False, server_default="PH")
    latitude: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 7), nullable=True)
    longitude: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(10, 7), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="false")
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="addresses")
    user: Mapped["User"] = relationship(back_populates="addresses")
    orders: Mapped[list["Order"]] = relationship(back_populates="delivery_address")
    fulfillment_orders: Mapped[list["FulfillmentOrder"]] = relationship(back_populates="address")


class DeliveryZone(TimestampMixin, Base):
    __tablename__ = "delivery_zones"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    delivery_fee: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    min_order_amount: Mapped[Optional[Decimal]] = mapped_column(DECIMAL(12, 2), nullable=True)
    boundaries: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    cutoff_hours: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="delivery_zones")
    slots: Mapped[list["DeliverySlot"]] = relationship(back_populates="zone")


class DeliverySlot(TimestampMixin, Base):
    __tablename__ = "delivery_slots"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    zone_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("delivery_zones.id"), nullable=False)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)
    capacity: Mapped[int] = mapped_column(Integer, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # relationships
    zone: Mapped["DeliveryZone"] = relationship(back_populates="slots")
    orders: Mapped[list["Order"]] = relationship(back_populates="delivery_slot")
    fulfillment_orders: Mapped[list["FulfillmentOrder"]] = relationship(back_populates="delivery_slot")


class FulfillmentOrder(TimestampMixin, Base):
    __tablename__ = "fulfillment_orders"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id"), nullable=False)
    address_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("addresses.id"), nullable=True)
    delivery_slot_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("delivery_slots.id"), nullable=True)
    fulfillment_type: Mapped[FulfillmentType] = mapped_column(
        SAEnum(FulfillmentType, name="fulfillment_type", create_constraint=True), nullable=False
    )
    status: Mapped[FulfillmentStatus] = mapped_column(
        SAEnum(FulfillmentStatus, name="fulfillment_status", create_constraint=True),
        nullable=False,
        server_default="created",
    )
    scheduled_date: Mapped[date] = mapped_column(Date, nullable=False)
    shipped_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    tracking_number: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    driver_notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="fulfillment_orders")
    order: Mapped["Order"] = relationship(back_populates="fulfillment_orders")
    address: Mapped[Optional["Address"]] = relationship(back_populates="fulfillment_orders")
    delivery_slot: Mapped[Optional["DeliverySlot"]] = relationship(back_populates="fulfillment_orders")


# ===========================================================================
# Module 8: Notification Hub
# ===========================================================================


class NotificationTemplate(TimestampMixin, Base):
    __tablename__ = "notification_templates"
    __table_args__ = (
        UniqueConstraint("tenant_id", "event_type", "channel", name="uq_notification_templates_tenant_event_channel"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(
        SAEnum(NotificationChannel, name="notification_channel", create_constraint=True), nullable=False
    )
    subject: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    body_template: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="notification_templates")
    notifications: Mapped[list["Notification"]] = relationship(back_populates="template")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    template_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("notification_templates.id"), nullable=True)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(
        SAEnum(NotificationChannel, name="notification_channel", create_constraint=False), nullable=False
    )
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        SAEnum(NotificationStatus, name="notification_status", create_constraint=True),
        nullable=False,
        server_default="queued",
    )
    scheduled_for: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    sent_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="notifications")
    template: Mapped[Optional["NotificationTemplate"]] = relationship(back_populates="notifications")
    user: Mapped["User"] = relationship(back_populates="notifications")
    logs: Mapped[list["NotificationLog"]] = relationship(back_populates="notification")


class NotificationLog(Base):
    __tablename__ = "notification_logs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    notification_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("notifications.id"), nullable=False)
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[NotificationLogStatus] = mapped_column(
        SAEnum(NotificationLogStatus, name="notification_log_status", create_constraint=True),
        nullable=False,
    )
    provider_response: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    notification: Mapped["Notification"] = relationship(back_populates="logs")


# ===========================================================================
# Module 9: Analytics
# ===========================================================================


class MetricSnapshot(Base):
    __tablename__ = "metric_snapshots"
    __table_args__ = (
        Index("ix_metric_snapshots_tenant_type_period", "tenant_id", "metric_type", "period_type", "period_start"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    metric_type: Mapped[str] = mapped_column(String(50), nullable=False)
    period_type: Mapped[PeriodType] = mapped_column(
        SAEnum(PeriodType, name="period_type", create_constraint=True), nullable=False
    )
    period_start: Mapped[date] = mapped_column(Date, nullable=False)
    value: Mapped[Decimal] = mapped_column(DECIMAL(14, 4), nullable=False)
    metadata_: Mapped[Optional[dict]] = mapped_column("metadata", JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="metric_snapshots")


class CohortData(Base):
    __tablename__ = "cohort_data"
    __table_args__ = (Index("ix_cohort_data_tenant_month", "tenant_id", "cohort_month", "months_since_signup"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    cohort_month: Mapped[date] = mapped_column(Date, nullable=False)
    months_since_signup: Mapped[int] = mapped_column(Integer, nullable=False)
    total_users: Mapped[int] = mapped_column(Integer, nullable=False)
    active_users: Mapped[int] = mapped_column(Integer, nullable=False)
    revenue: Mapped[Decimal] = mapped_column(DECIMAL(12, 2), nullable=False)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="cohort_data")


# ===========================================================================
# Module 10: Integration Gateway
# ===========================================================================


class Webhook(TimestampMixin, Base):
    __tablename__ = "webhooks"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    secret: Mapped[str] = mapped_column(String(255), nullable=False)
    events: Mapped[dict] = mapped_column(JSON, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    last_triggered_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="webhooks")
    webhook_events: Mapped[list["WebhookEvent"]] = relationship(back_populates="webhook")


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    webhook_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("webhooks.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[WebhookEventStatus] = mapped_column(
        SAEnum(WebhookEventStatus, name="webhook_event_status", create_constraint=True),
        nullable=False,
        server_default="pending",
    )
    response_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    retry_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default="0")
    next_retry_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    webhook: Mapped["Webhook"] = relationship(back_populates="webhook_events")


class IntegrationConfig(TimestampMixin, Base):
    __tablename__ = "integration_configs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    system_type: Mapped[IntegrationSystemType] = mapped_column(
        SAEnum(IntegrationSystemType, name="integration_system_type", create_constraint=True),
        nullable=False,
    )
    base_url: Mapped[str] = mapped_column(String(500), nullable=False)
    api_key: Mapped[str] = mapped_column(String(500), nullable=False)
    settings: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default="true")
    last_sync_at: Mapped[Optional[datetime]] = mapped_column(TIMESTAMP(timezone=True), nullable=True)

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="integration_configs")


class AuditLog(Base):
    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_tenant_resource", "tenant_id", "resource_type", "resource_id"),
        Index("ix_audit_logs_tenant_created", "tenant_id", "created_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    tenant_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tenants.id"), nullable=False)
    actor_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("users.id"), nullable=True)
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)
    resource_id: Mapped[uuid.UUID] = mapped_column(nullable=False)
    before_state: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    after_state: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    user_agent: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(TIMESTAMP(timezone=True), nullable=False, server_default=func.now())

    # relationships
    tenant: Mapped["Tenant"] = relationship(back_populates="audit_logs")
    actor: Mapped[Optional["User"]] = relationship()
