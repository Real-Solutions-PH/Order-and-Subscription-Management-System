"""Integration Gateway schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel

from app.repo.db import IntegrationSystemType, WebhookEventStatus
from app.schemas.base import BaseSchema, PaginatedResponse


# ---------------------------------------------------------------------------
# Webhook
# ---------------------------------------------------------------------------


class WebhookCreate(BaseModel):
    url: str
    events: list[str]
    secret: Optional[str] = None  # auto-generated if not provided


class WebhookResponse(BaseSchema):
    id: UUID
    url: str
    events: list[str]
    is_active: bool
    last_triggered_at: Optional[datetime] = None


class WebhookEventResponse(BaseSchema):
    id: UUID
    event_type: str
    status: WebhookEventStatus
    response_code: Optional[int] = None
    retry_count: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Integration Config
# ---------------------------------------------------------------------------


class IntegrationConfigCreate(BaseModel):
    system_type: IntegrationSystemType
    base_url: str
    api_key: str
    settings: Optional[dict] = None


class IntegrationConfigResponse(BaseSchema):
    id: UUID
    system_type: IntegrationSystemType
    base_url: str
    is_active: bool
    last_sync_at: Optional[datetime] = None


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------


class AuditLogResponse(BaseSchema):
    id: UUID
    actor_id: Optional[UUID] = None
    action: str
    resource_type: str
    resource_id: UUID
    ip_address: str
    created_at: datetime


AuditLogListResponse = PaginatedResponse[AuditLogResponse]
