"""Notification Hub schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel

from app.repo.db import NotificationChannel, NotificationStatus
from app.schemas.base import BaseSchema, PaginatedResponse

# ---------------------------------------------------------------------------
# Template
# ---------------------------------------------------------------------------


class TemplateCreate(BaseModel):
    event_type: str
    channel: NotificationChannel
    subject: str | None = None
    body_template: str


class TemplateUpdate(BaseModel):
    subject: str | None = None
    body_template: str | None = None
    is_active: bool | None = None


class TemplateResponse(BaseSchema):
    id: UUID
    event_type: str
    channel: NotificationChannel
    subject: str | None = None
    body_template: str
    is_active: bool


# ---------------------------------------------------------------------------
# Notification
# ---------------------------------------------------------------------------


class NotificationSend(BaseModel):
    user_id: UUID
    channel: NotificationChannel
    subject: str
    body: str
    scheduled_for: datetime | None = None


class NotificationResponse(BaseSchema):
    id: UUID
    user_id: UUID
    channel: NotificationChannel
    recipient: str
    subject: str
    status: NotificationStatus
    sent_at: datetime | None = None
    created_at: datetime


NotificationListResponse = PaginatedResponse[NotificationResponse]
