"""Pydantic schemas for the Notification Hub module."""

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from app.modules.notification_hub.models import (
    LogStatus,
    NotificationChannel,
    NotificationStatus,
)

# ── Notification Template ──────────────────────────────────────────────

class NotificationTemplateCreate(BaseModel):
    event_type: str = Field(..., max_length=100)
    channel: NotificationChannel
    subject: str | None = Field(None, max_length=255)
    body_template: str


class NotificationTemplateUpdate(BaseModel):
    subject: str | None = Field(None, max_length=255)
    body_template: str | None = None
    is_active: bool | None = None


class NotificationTemplateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    event_type: str
    channel: NotificationChannel
    subject: str | None
    body_template: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ── Notification ───────────────────────────────────────────────────────

class SendNotificationRequest(BaseModel):
    user_id: UUID
    channel: NotificationChannel
    recipient: str = Field(..., max_length=255)
    subject: str | None = Field(None, max_length=255)
    body: str
    template_id: UUID | None = None
    scheduled_for: datetime | None = None


class NotificationLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    notification_id: UUID
    attempt: int
    status: LogStatus
    provider_response: dict | None
    error_message: str | None
    created_at: datetime


class NotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    tenant_id: UUID
    template_id: UUID | None
    user_id: UUID
    channel: NotificationChannel
    recipient: str
    subject: str | None
    body: str
    status: NotificationStatus
    scheduled_for: datetime | None
    sent_at: datetime | None
    logs: list[NotificationLogResponse] = []
    created_at: datetime
    updated_at: datetime


class NotificationListResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    total: int
    page: int
    per_page: int
    items: list[NotificationResponse]
