"""Service layer for the Notification Hub module."""

from uuid import UUID

from app.exceptions import NotFoundError
from app.modules.notification_hub.models import (
    Notification,
    NotificationStatus,
    NotificationTemplate,
)
from app.modules.notification_hub.repo import NotificationRepo, NotificationTemplateRepo
from app.modules.notification_hub.schemas import (
    NotificationTemplateCreate,
    NotificationTemplateUpdate,
    SendNotificationRequest,
)


class NotificationService:
    def __init__(
        self,
        template_repo: NotificationTemplateRepo,
        notification_repo: NotificationRepo,
    ):
        self.template_repo = template_repo
        self.notification_repo = notification_repo

    # ── Template operations ────────────────────────────────────────────

    async def list_templates(self, tenant_id: UUID) -> list[NotificationTemplate]:
        return await self.template_repo.list_by_tenant(tenant_id)

    async def create_template(self, tenant_id: UUID, data: NotificationTemplateCreate) -> NotificationTemplate:
        template = NotificationTemplate(
            tenant_id=tenant_id,
            event_type=data.event_type,
            channel=data.channel,
            subject=data.subject,
            body_template=data.body_template,
        )
        return await self.template_repo.create(template)

    async def update_template(self, template_id: UUID, data: NotificationTemplateUpdate) -> NotificationTemplate:
        update_data = data.model_dump(exclude_unset=True)
        template = await self.template_repo.update(template_id, **update_data)
        if not template:
            raise NotFoundError("Notification template not found")
        return template

    # ── Notification operations ────────────────────────────────────────

    async def send_notification(self, tenant_id: UUID, data: SendNotificationRequest) -> Notification:
        notification = Notification(
            tenant_id=tenant_id,
            template_id=data.template_id,
            user_id=data.user_id,
            channel=data.channel,
            recipient=data.recipient,
            subject=data.subject,
            body=data.body,
            status=NotificationStatus.queued,
            scheduled_for=data.scheduled_for,
        )
        notification = await self.notification_repo.create(notification)

        # TODO: Dispatch to email/SMS/push/WhatsApp provider here.
        # For now the notification stays in "queued" status.

        return notification

    async def list_notifications(
        self,
        tenant_id: UUID,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Notification], int]:
        return await self.notification_repo.list_by_tenant(tenant_id, offset, limit)
