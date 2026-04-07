from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field

from app.shared.schemas import BaseSchema


# ── Tenant Config ───────────────────────────────────────────────────


class TenantConfigResponse(BaseSchema):
    id: UUID
    tenant_id: UUID
    business_name: str
    logo_url: str | None
    primary_color: str
    secondary_color: str
    timezone: str
    currency: str
    default_language: str
    tax_rate: Decimal
    tax_label: str
    order_cutoff_hours: int
    max_pause_days: int
    operating_hours: dict | None
    payment_gateways: dict | None
    notification_settings: dict | None
    metadata_: dict | None = Field(None, alias="metadata_")
    created_at: datetime
    updated_at: datetime


class TenantConfigUpdateRequest(BaseModel):
    business_name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = Field(None, max_length=7)
    secondary_color: str | None = Field(None, max_length=7)
    timezone: str | None = Field(None, max_length=50)
    currency: str | None = Field(None, max_length=3)
    default_language: str | None = Field(None, max_length=5)
    tax_rate: Decimal | None = None
    tax_label: str | None = Field(None, max_length=50)
    order_cutoff_hours: int | None = None
    max_pause_days: int | None = None
    operating_hours: dict | None = None
    payment_gateways: dict | None = None
    notification_settings: dict | None = None
    metadata_: dict | None = Field(None, alias="metadata")


# ── Feature Flags ───────────────────────────────────────────────────


class FeatureFlagResponse(BaseSchema):
    id: UUID
    tenant_id: UUID
    flag_key: str
    enabled: bool
    metadata_: dict | None = Field(None, alias="metadata_")
    created_at: datetime
    updated_at: datetime


class FeatureFlagUpdateRequest(BaseModel):
    enabled: bool


class FeatureFlagListResponse(BaseSchema):
    items: list[FeatureFlagResponse]
