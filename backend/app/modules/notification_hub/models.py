"""Notification Hub domain models."""

import enum
import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.shared.models import Base, TenantMixin, TimestampMixin, UUIDPrimaryKeyMixin

# ── Enums ───────────────────────────────────────────────────────────────


class NotificationChannel(str, enum.Enum):
    email = "email"
    sms = "sms"
    push = "push"
    whatsapp = "whatsapp"


class NotificationStatus(str, enum.Enum):
    queued = "queued"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"
    bounced = "bounced"


class LogStatus(str, enum.Enum):
    success = "success"
    failed = "failed"


# ── Notification Template ──────────────────────────────────────────────


class NotificationTemplate(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "notification_templates"

    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body_template: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    notifications: Mapped[list["Notification"]] = relationship(
        "Notification", back_populates="template", lazy="selectin"
    )


# ── Notification ───────────────────────────────────────────────────────


class Notification(UUIDPrimaryKeyMixin, TenantMixin, TimestampMixin, Base):
    __tablename__ = "notifications"

    template_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notification_templates.id"), nullable=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    channel: Mapped[NotificationChannel] = mapped_column(Enum(NotificationChannel), nullable=False)
    recipient: Mapped[str] = mapped_column(String(255), nullable=False)
    subject: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[NotificationStatus] = mapped_column(
        Enum(NotificationStatus), default=NotificationStatus.queued, nullable=False
    )
    scheduled_for: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    template: Mapped["NotificationTemplate | None"] = relationship(
        "NotificationTemplate", back_populates="notifications"
    )
    logs: Mapped[list["NotificationLog"]] = relationship(
        "NotificationLog", back_populates="notification", lazy="selectin", cascade="all, delete-orphan"
    )


# ── Notification Log ──────────────────────────────────────────────────


class NotificationLog(UUIDPrimaryKeyMixin, Base):
    __tablename__ = "notification_logs"

    notification_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False
    )
    attempt: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[LogStatus] = mapped_column(Enum(LogStatus), nullable=False)
    provider_response: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    notification: Mapped["Notification"] = relationship("Notification", back_populates="logs")
