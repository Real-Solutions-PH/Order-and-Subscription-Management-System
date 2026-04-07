"""Tenant, tenant configuration, and feature flag schemas."""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from pydantic import Field

from app.schemas.base import BaseSchema


class TenantCreate(BaseSchema):
    """Schema for creating a new tenant."""

    name: str = Field(min_length=1, max_length=255)
    slug: str | None = Field(default=None, max_length=100)


class TenantUpdate(BaseSchema):
    """Schema for updating tenant details."""

    name: str | None = None
    domain: str | None = None
    status: str | None = None


class TenantResponse(BaseSchema):
    """Public tenant representation."""

    id: UUID
    name: str
    slug: str
    domain: str | None = None
    status: str
    created_at: datetime


class TenantConfigUpdate(BaseSchema):
    """Schema for updating tenant configuration. All fields optional."""

    business_name: str | None = None
    logo_url: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    timezone: str | None = None
    currency: str | None = None
    default_language: str | None = None
    tax_rate: Decimal | None = None
    tax_label: str | None = None
    order_cutoff_hours: int | None = None
    max_pause_days: int | None = None
    operating_hours: dict[str, Any] | None = None
    payment_gateways: dict[str, Any] | None = None
    notification_settings: dict[str, Any] | None = None


class TenantConfigResponse(BaseSchema):
    """Full tenant configuration representation."""

    id: UUID
    tenant_id: UUID
    business_name: str
    logo_url: str | None = None
    primary_color: str | None = None
    secondary_color: str | None = None
    timezone: str
    currency: str
    default_language: str
    tax_rate: Decimal
    tax_label: str
    order_cutoff_hours: int
    max_pause_days: int
    operating_hours: dict[str, Any] | None = None
    payment_gateways: dict[str, Any] | None = None
    notification_settings: dict[str, Any] | None = None


class FeatureFlagUpdate(BaseSchema):
    """Schema for toggling a feature flag."""

    flag_key: str
    enabled: bool


class FeatureFlagResponse(BaseSchema):
    """Feature flag representation."""

    id: UUID
    flag_key: str
    enabled: bool
    metadata: dict[str, Any] | None = Field(default=None, alias="metadata_")
