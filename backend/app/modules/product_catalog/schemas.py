"""Pydantic schemas for the Product Catalog module."""

from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.modules.product_catalog.models import CatalogStatus, ProductStatus


# ── Ingredient ───────────────────────────────────────────────────────────


class IngredientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    default_unit: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime


class ProductSummaryForIngredient(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    status: ProductStatus


class IngredientWithUsageResponse(IngredientResponse):
    used_in_products: list[ProductSummaryForIngredient] = []


class IngredientListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    page: int
    per_page: int
    items: list[IngredientWithUsageResponse]


# ── Product Ingredient (Recipe) ──────────────────────────────────────────


class ProductIngredientAdd(BaseModel):
    name: str = Field(..., max_length=255)
    default_unit: str | None = Field(None, max_length=50)
    quantity: Decimal | None = None
    unit: str | None = Field(None, max_length=50)
    notes: str | None = Field(None, max_length=255)


class ProductIngredientUpdate(BaseModel):
    quantity: Decimal | None = None
    unit: str | None = Field(None, max_length=50)
    notes: str | None = Field(None, max_length=255)


class ProductIngredientResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    product_id: UUID
    ingredient_id: UUID
    quantity: Decimal | None
    unit: str | None
    notes: str | None
    ingredient: IngredientResponse


# ── Product Image ───────────────────────────────────────────────────────


class ProductImageCreate(BaseModel):
    url: str = Field(..., max_length=500)
    alt_text: str | None = Field(None, max_length=255)
    sort_order: int = 0
    is_primary: bool = False


class ProductImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    url: str
    alt_text: str | None
    sort_order: int
    is_primary: bool


# ── Product Variant ─────────────────────────────────────────────────────


class ProductVariantCreate(BaseModel):
    name: str = Field(..., max_length=100)
    sku: str = Field(..., max_length=100)
    price: Decimal = Field(..., max_digits=12, decimal_places=2)
    compare_at_price: Decimal | None = None
    cost_price: Decimal | None = None
    weight: Decimal | None = None
    is_default: bool = False
    is_active: bool = True
    stock_quantity: int | None = None
    metadata_: dict | None = Field(None, alias="metadata")


class ProductVariantResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    product_id: UUID
    name: str
    sku: str
    price: Decimal
    compare_at_price: Decimal | None
    cost_price: Decimal | None
    weight: Decimal | None
    is_default: bool
    is_active: bool
    stock_quantity: int | None
    metadata_: dict | None = Field(None, alias="metadata")
    created_at: datetime
    updated_at: datetime

    @field_validator("metadata_", mode="before")
    @classmethod
    def coerce_metadata(cls, v: object) -> dict | None:
        return v if isinstance(v, dict) else None


# ── Product ─────────────────────────────────────────────────────────────


class ProductCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    short_description: str | None = Field(None, max_length=500)
    sku: str | None = Field(None, max_length=100)
    status: ProductStatus = ProductStatus.draft
    is_subscribable: bool = False
    is_standalone: bool = True
    metadata_: dict | None = Field(None, alias="metadata")


class ProductUpdate(BaseModel):
    name: str | None = Field(None, max_length=255)
    description: str | None = None
    short_description: str | None = Field(None, max_length=500)
    sku: str | None = Field(None, max_length=100)
    status: ProductStatus | None = None
    is_subscribable: bool | None = None
    is_standalone: bool | None = None
    metadata_: dict | None = Field(None, alias="metadata")


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: UUID
    tenant_id: UUID
    name: str
    slug: str
    description: str | None
    short_description: str | None
    sku: str | None
    status: ProductStatus
    is_subscribable: bool
    is_standalone: bool
    metadata_: dict | None = Field(None, alias="metadata")
    variants: list[ProductVariantResponse] = []
    images: list[ProductImageResponse] = []
    ingredients: list["ProductIngredientResponse"] = []
    created_at: datetime
    updated_at: datetime

    @field_validator("metadata_", mode="before")
    @classmethod
    def coerce_metadata(cls, v: object) -> dict | None:
        return v if isinstance(v, dict) else None


class ProductListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    page: int
    per_page: int
    items: list[ProductResponse]


# ── Catalog Schedule ────────────────────────────────────────────────────


class CatalogScheduleCreate(BaseModel):
    starts_at: datetime
    ends_at: datetime
    recurrence_rule: str | None = None


class CatalogScheduleResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    catalog_id: UUID
    starts_at: datetime
    ends_at: datetime
    recurrence_rule: str | None


# ── Catalog Item ────────────────────────────────────────────────────────


class CatalogItemAdd(BaseModel):
    product_variant_id: UUID
    sort_order: int = 0
    is_featured: bool = False
    availability_limit: int | None = None


class CatalogItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    catalog_id: UUID
    product_variant_id: UUID
    sort_order: int
    is_featured: bool
    availability_limit: int | None
    product_variant: ProductVariantResponse


# ── Catalog ─────────────────────────────────────────────────────────────


class CatalogCreate(BaseModel):
    name: str = Field(..., max_length=255)
    description: str | None = None
    status: CatalogStatus = CatalogStatus.draft


class CatalogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    name: str
    slug: str
    description: str | None
    status: CatalogStatus
    published_at: datetime | None
    items: list[CatalogItemResponse] = []
    schedules: list[CatalogScheduleResponse] = []
    created_at: datetime
    updated_at: datetime
