"""Schemas for the Product Catalog module."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import Field

from app.repo.db import AttributeType, CatalogStatus, ProductStatus
from app.schemas.base import BaseSchema, PaginatedResponse

# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------


class CategoryCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=100)
    parent_id: UUID | None = None
    description: str | None = None
    sort_order: int | None = 0


class CategoryResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    parent_id: UUID | None = None
    sort_order: int
    is_active: bool


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------


class VariantCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=100)
    sku: str | None = None
    price: Decimal = Field(ge=0)
    compare_at_price: Decimal | None = None
    cost_price: Decimal | None = None
    weight: Decimal | None = None
    is_default: bool = False
    metadata: dict | None = None


class VariantResponse(BaseSchema):
    id: UUID
    name: str
    sku: str
    price: Decimal
    compare_at_price: Decimal | None = None
    cost_price: Decimal | None = None
    is_default: bool
    is_active: bool
    stock_quantity: int | None = None


class ImageCreate(BaseSchema):
    url: str = Field(max_length=500)
    alt_text: str | None = None
    sort_order: int | None = 0
    is_primary: bool = False


class ImageResponse(BaseSchema):
    id: UUID
    url: str
    alt_text: str | None = None
    sort_order: int
    is_primary: bool


class AttributeCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=100)
    type: AttributeType
    is_filterable: bool = True
    is_visible: bool = True


class AttributeResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    type: AttributeType
    is_filterable: bool
    is_visible: bool


class AttributeValueSet(BaseSchema):
    attribute_id: UUID
    value: str


class ProductCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None
    short_description: str | None = None
    sku: str | None = None
    is_subscribable: bool = True
    is_standalone: bool = True
    category_ids: list[UUID] | None = None
    metadata: dict | None = None


class ProductUpdate(BaseSchema):
    name: str | None = None
    description: str | None = None
    short_description: str | None = None
    sku: str | None = None
    is_subscribable: bool | None = None
    is_standalone: bool | None = None
    category_ids: list[UUID] | None = None
    metadata: dict | None = None
    status: ProductStatus | None = None


class ProductResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    short_description: str | None = None
    sku: str | None = None
    status: ProductStatus
    is_subscribable: bool
    is_standalone: bool
    metadata: dict | None = None
    variants: list[VariantResponse] = []
    images: list[ImageResponse] = []
    created_at: datetime
    updated_at: datetime


class ProductListResponse(PaginatedResponse[ProductResponse]):
    pass


# ---------------------------------------------------------------------------
# Catalog
# ---------------------------------------------------------------------------


class CatalogItemCreate(BaseSchema):
    product_variant_id: UUID
    sort_order: int | None = 0
    is_featured: bool = False
    availability_limit: int | None = None


class CatalogItemResponse(BaseSchema):
    id: UUID
    product_variant_id: UUID
    sort_order: int
    is_featured: bool
    availability_limit: int | None = None


class CatalogScheduleCreate(BaseSchema):
    starts_at: datetime
    ends_at: datetime
    recurrence_rule: str | None = None


class CatalogCreate(BaseSchema):
    name: str = Field(min_length=1, max_length=255)
    description: str | None = None


class CatalogUpdate(BaseSchema):
    name: str | None = None
    description: str | None = None
    status: CatalogStatus | None = None


class CatalogResponse(BaseSchema):
    id: UUID
    name: str
    slug: str
    description: str | None = None
    status: CatalogStatus
    published_at: datetime | None = None
    items: list[CatalogItemResponse] | None = None
    created_at: datetime
