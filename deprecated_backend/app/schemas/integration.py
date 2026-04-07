"""Integration Gateway schemas."""

from __future__ import annotations

from datetime import datetime
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
    secret: str | None = None  # auto-generated if not provided


class WebhookResponse(BaseSchema):
    id: UUID
    url: str
    events: list[str]
    is_active: bool
    last_triggered_at: datetime | None = None


class WebhookEventResponse(BaseSchema):
    id: UUID
    event_type: str
    status: WebhookEventStatus
    response_code: int | None = None
    retry_count: int
    created_at: datetime


# ---------------------------------------------------------------------------
# Integration Config
# ---------------------------------------------------------------------------


class IntegrationConfigCreate(BaseModel):
    system_type: IntegrationSystemType
    base_url: str
    api_key: str
    settings: dict | None = None


class IntegrationConfigResponse(BaseSchema):
    id: UUID
    system_type: IntegrationSystemType
    base_url: str
    is_active: bool
    last_sync_at: datetime | None = None


# ---------------------------------------------------------------------------
# Audit Log
# ---------------------------------------------------------------------------


class AuditLogResponse(BaseSchema):
    id: UUID
    actor_id: UUID | None = None
    action: str
    resource_type: str
    resource_id: UUID
    ip_address: str
    created_at: datetime


AuditLogListResponse = PaginatedResponse[AuditLogResponse]
