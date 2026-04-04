"""Notification Hub schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Optional
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
    subject: Optional[str] = None
    body_template: str


class TemplateUpdate(BaseModel):
    subject: Optional[str] = None
    body_template: Optional[str] = None
    is_active: Optional[bool] = None


class TemplateResponse(BaseSchema):
    id: UUID
    event_type: str
    channel: NotificationChannel
    subject: Optional[str] = None
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
    scheduled_for: Optional[datetime] = None


class NotificationResponse(BaseSchema):
    id: UUID
    user_id: UUID
    channel: NotificationChannel
    recipient: str
    subject: str
    status: NotificationStatus
    sent_at: Optional[datetime] = None
    created_at: datetime


NotificationListResponse = PaginatedResponse[NotificationResponse]
