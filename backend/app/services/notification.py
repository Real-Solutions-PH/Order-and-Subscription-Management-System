"""Notification Hub service."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from jinja2 import Template as Jinja2Template
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import get_event_bus
from app.core.exceptions import BadRequestException, NotFoundException
from app.repo.db import (
    Notification,
    NotificationChannel,
    NotificationLogStatus,
    NotificationStatus,
    NotificationTemplate,
)
from app.repo.notification import (
    NotificationLogRepository,
    NotificationRepository,
    NotificationTemplateRepository,
)
from app.schemas.notification import (
    NotificationSend,
    TemplateCreate,
    TemplateUpdate,
)


class NotificationService:
    """Business logic for sending and managing notifications."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.template_repo = NotificationTemplateRepository(session)
        self.notification_repo = NotificationRepository(session)
        self.log_repo = NotificationLogRepository(session)

    # ------------------------------------------------------------------
    # Template-based sending
    # ------------------------------------------------------------------

    async def send_notification(
        self,
        tenant_id: UUID | str,
        user_id: UUID | str,
        event_type: str,
        context: dict[str, Any],
    ) -> Notification:
        """Look up template, render with Jinja2, create notification, dispatch.

        The dispatch step is currently a stub that marks the notification as sent.
        """
        # Default to email channel; callers can extend context to specify channel
        channel = context.pop("channel", NotificationChannel.email)
        if isinstance(channel, str):
            channel = NotificationChannel(channel)

        template = await self.template_repo.get_by_event(
            tenant_id, event_type, channel
        )
        if template is None:
            raise NotFoundException("NotificationTemplate", f"{event_type}/{channel.value}")

        # Render subject and body with Jinja2
        subject = (
            Jinja2Template(template.subject).render(**context)
            if template.subject
            else event_type
        )
        body = Jinja2Template(template.body_template).render(**context)

        # Resolve recipient from context
        recipient = context.get("recipient", context.get("email", ""))

        notification = await self.notification_repo.create(
            {
                "tenant_id": tenant_id,
                "template_id": template.id,
                "user_id": user_id,
                "channel": channel,
                "recipient": recipient,
                "subject": subject,
                "body": body,
                "status": NotificationStatus.queued,
            }
        )

        # TODO: Dispatch to actual email/SMS/push provider
        # For now, stub: mark as sent immediately
        await self.notification_repo.update(
            notification.id,
            {
                "status": NotificationStatus.sent,
                "sent_at": datetime.now(timezone.utc),
            },
        )

        # Log the attempt
        await self.log_repo.create(
            {
                "notification_id": notification.id,
                "attempt": 1,
                "status": NotificationLogStatus.success,
                "provider_response": {"stub": True},
            }
        )

        event_bus = get_event_bus()
        await event_bus.publish(
            "notification.sent",
            {
                "tenant_id": str(tenant_id),
                "notification_id": str(notification.id),
                "channel": channel.value,
            },
        )

        # Refresh to get updated status
        await self.session.refresh(notification)
        return notification

    # ------------------------------------------------------------------
    # Direct sending (no template)
    # ------------------------------------------------------------------

    async def send_direct(
        self,
        tenant_id: UUID | str,
        data: NotificationSend,
    ) -> Notification:
        """Send a notification without a template."""
        notification = await self.notification_repo.create(
            {
                "tenant_id": tenant_id,
                "user_id": data.user_id,
                "channel": data.channel,
                "recipient": "",  # Resolved by provider
                "subject": data.subject,
                "body": data.body,
                "status": NotificationStatus.queued,
                "scheduled_for": data.scheduled_for,
            }
        )

        if data.scheduled_for is None:
            # TODO: Dispatch to actual provider
            await self.notification_repo.update(
                notification.id,
                {
                    "status": NotificationStatus.sent,
                    "sent_at": datetime.now(timezone.utc),
                },
            )
            await self.log_repo.create(
                {
                    "notification_id": notification.id,
                    "attempt": 1,
                    "status": NotificationLogStatus.success,
                    "provider_response": {"stub": True},
                }
            )

        await self.session.refresh(notification)
        return notification

    # ------------------------------------------------------------------
    # Queries
    # ------------------------------------------------------------------

    async def get_notifications(
        self,
        user_id: UUID | str,
        tenant_id: UUID | str,
        skip: int = 0,
        limit: int = 50,
    ) -> list[Notification]:
        """List notifications for a user."""
        return await self.notification_repo.get_by_user(
            user_id, tenant_id=tenant_id, skip=skip, limit=limit
        )

    # ------------------------------------------------------------------
    # Template management
    # ------------------------------------------------------------------

    async def create_template(
        self, tenant_id: UUID | str, data: TemplateCreate
    ) -> NotificationTemplate:
        """Create a new notification template."""
        template_data = data.model_dump()
        template_data["tenant_id"] = tenant_id
        return await self.template_repo.create(template_data)

    async def update_template(
        self,
        template_id: UUID | str,
        tenant_id: UUID | str,
        data: TemplateUpdate,
    ) -> NotificationTemplate:
        """Update an existing notification template."""
        update_data = data.model_dump(exclude_unset=True)
        if not update_data:
            template = await self.template_repo.get_by_id(
                template_id, tenant_id=tenant_id
            )
            if template is None:
                raise NotFoundException("NotificationTemplate", str(template_id))
            return template

        updated = await self.template_repo.update(
            template_id, update_data, tenant_id=tenant_id
        )
        if updated is None:
            raise NotFoundException("NotificationTemplate", str(template_id))
        return updated

    async def list_templates(
        self, tenant_id: UUID | str
    ) -> list[NotificationTemplate]:
        """List all notification templates for a tenant."""
        templates = await self.template_repo.get_all(tenant_id=tenant_id)
        return list(templates)
