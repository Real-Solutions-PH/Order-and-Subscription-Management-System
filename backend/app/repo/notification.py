"""Notification Hub repositories."""

from __future__ import annotations

from uuid import UUID

from sqlalchemy import select

from app.repo.base import BaseRepository
from app.repo.db import (
    Notification,
    NotificationChannel,
    NotificationLog,
    NotificationStatus,
    NotificationTemplate,
)


class NotificationTemplateRepository(BaseRepository[NotificationTemplate]):
    """Repository for notification templates."""

    model = NotificationTemplate

    async def get_by_event(
        self,
        tenant_id: UUID | str,
        event_type: str,
        channel: NotificationChannel,
    ) -> NotificationTemplate | None:
        """Find the active template for a given event type and channel."""
        stmt = select(NotificationTemplate).where(
            NotificationTemplate.tenant_id == tenant_id,
            NotificationTemplate.event_type == event_type,
            NotificationTemplate.channel == channel,
            NotificationTemplate.is_active.is_(True),
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()


class NotificationRepository(BaseRepository[Notification]):
    """Repository for notifications."""

    model = Notification

    async def get_by_user(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Notification]:
        """Return notifications for a specific user."""
        stmt = (
            select(Notification)
            .where(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_pending(self) -> list[Notification]:
        """Return all queued notifications that are not scheduled for the future."""
        stmt = (
            select(Notification)
            .where(
                Notification.status == NotificationStatus.queued,
                Notification.scheduled_for.is_(None),
            )
            .order_by(Notification.created_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_scheduled(self) -> list[Notification]:
        """Return all queued notifications with a scheduled_for in the future."""
        stmt = (
            select(Notification)
            .where(
                Notification.status == NotificationStatus.queued,
                Notification.scheduled_for.isnot(None),
            )
            .order_by(Notification.scheduled_for.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class NotificationLogRepository(BaseRepository[NotificationLog]):
    """Repository for notification delivery logs."""

    model = NotificationLog

    async def get_by_notification(self, notification_id: UUID | str) -> list[NotificationLog]:
        """Return all log entries for a specific notification."""
        stmt = (
            select(NotificationLog)
            .where(NotificationLog.notification_id == notification_id)
            .order_by(NotificationLog.attempt.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
