"""Product Catalog domain models."""

import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.models import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

# ── Enums ───────────────────────────────────────────────────────────────

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


# ── Product Category ────────────────────────────────────────────────────

class ProductCategory(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "product_categories"

    parent_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_categories.id"), nullable=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    parent: Mapped["ProductCategory | None"] = relationship(
        "ProductCategory", remote_side="ProductCategory.id", lazy="selectin"
    )


# ── Product ─────────────────────────────────────────────────────────────

class Product(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "products"
    __table_args__ = (
        UniqueConstraint("tenant_id", "slug", name="uq_product_tenant_slug"),
    )

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    short_description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sku: Mapped[str | None] = mapped_column(String(100), nullable=True)
    status: Mapped[ProductStatus] = mapped_column(
        Enum(ProductStatus), default=ProductStatus.draft, nullable=False
    )
    is_subscribable: Mapped[bool] = mapped_column(Boolean, default=False)
    is_standalone: Mapped[bool] = mapped_column(Boolean, default=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    # Relationships
    variants: Mapped[list["ProductVariant"]] = relationship(
        "ProductVariant", back_populates="product", lazy="selectin", cascade="all, delete-orphan"
    )
    images: Mapped[list["ProductImage"]] = relationship(
        "ProductImage", back_populates="product", lazy="selectin", cascade="all, delete-orphan"
    )
    attribute_values: Mapped[list["ProductAttributeValue"]] = relationship(
        "ProductAttributeValue", back_populates="product", lazy="selectin", cascade="all, delete-orphan"
    )


# ── Product Variant ─────────────────────────────────────────────────────

class ProductVariant(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "product_variants"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    sku: Mapped[str] = mapped_column(String(100), nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    compare_at_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    cost_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    weight: Mapped[Decimal | None] = mapped_column(Numeric(10, 2), nullable=True)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    stock_quantity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_: Mapped[dict | None] = mapped_column("metadata", JSONB, nullable=True)

    product: Mapped["Product"] = relationship("Product", back_populates="variants")


# ── Product Attribute ───────────────────────────────────────────────────

class ProductAttribute(UUIDPrimaryKeyMixin, TenantMixin, Base):
    __tablename__ = "product_attributes"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    type: Mapped[AttributeType] = mapped_column(Enum(AttributeType), nullable=False)
    is_filterable: Mapped[bool] = mapped_column(Boolean, default=False)
    is_visible: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)


# ── Product Attribute Value ─────────────────────────────────────────────

class ProductAttributeValue(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "product_attribute_values"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    attribute_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_attributes.id", ondelete="CASCADE"), nullable=False
    )
    value: Mapped[str] = mapped_column(String(255), nullable=False)

    product: Mapped["Product"] = relationship("Product", back_populates="attribute_values")
    attribute: Mapped["ProductAttribute"] = relationship("ProductAttribute", lazy="selectin")


# ── Product Image ───────────────────────────────────────────────────────

class ProductImage(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.id", ondelete="CASCADE"), nullable=False
    )
    url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_primary: Mapped[bool] = mapped_column(Boolean, default=False)

    product: Mapped["Product"] = relationship("Product", back_populates="images")


# ── Catalog ─────────────────────────────────────────────────────────────

class Catalog(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "catalogs"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[CatalogStatus] = mapped_column(
        Enum(CatalogStatus), default=CatalogStatus.draft, nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    items: Mapped[list["CatalogItem"]] = relationship(
        "CatalogItem", back_populates="catalog", lazy="selectin", cascade="all, delete-orphan"
    )
    schedules: Mapped[list["CatalogSchedule"]] = relationship(
        "CatalogSchedule", back_populates="catalog", lazy="selectin", cascade="all, delete-orphan"
    )


# ── Catalog Item ────────────────────────────────────────────────────────

class CatalogItem(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "catalog_items"

    catalog_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("catalogs.id", ondelete="CASCADE"), nullable=False
    )
    product_variant_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("product_variants.id", ondelete="CASCADE"), nullable=False
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False)
    availability_limit: Mapped[int | None] = mapped_column(Integer, nullable=True)

    catalog: Mapped["Catalog"] = relationship("Catalog", back_populates="items")
    product_variant: Mapped["ProductVariant"] = relationship("ProductVariant", lazy="selectin")


# ── Catalog Schedule ────────────────────────────────────────────────────

class CatalogSchedule(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "catalog_schedules"

    catalog_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("catalogs.id", ondelete="CASCADE"), nullable=False
    )
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    recurrence_rule: Mapped[str | None] = mapped_column(String(255), nullable=True)

    catalog: Mapped["Catalog"] = relationship("Catalog", back_populates="schedules")
