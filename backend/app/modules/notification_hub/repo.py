"""Repository layer for the Notification Hub module — DB access only."""

from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.notification_hub.models import (
    Notification,
    NotificationLog,
    NotificationTemplate,
)


class NotificationTemplateRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_tenant(self, tenant_id: UUID) -> list[NotificationTemplate]:
        result = await self.db.execute(
            select(NotificationTemplate)
            .where(NotificationTemplate.tenant_id == tenant_id)
            .order_by(NotificationTemplate.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_by_id(self, template_id: UUID) -> NotificationTemplate | None:
        result = await self.db.execute(
            select(NotificationTemplate)
            .where(NotificationTemplate.id == template_id)
        )
        return result.scalar_one_or_none()

    async def get_by_event_and_channel(
        self,
        tenant_id: UUID,
        event_type: str,
        channel: str,
    ) -> NotificationTemplate | None:
        result = await self.db.execute(
            select(NotificationTemplate).where(
                NotificationTemplate.tenant_id == tenant_id,
                NotificationTemplate.event_type == event_type,
                NotificationTemplate.channel == channel,
                NotificationTemplate.is_active.is_(True),
            )
        )
        return result.scalar_one_or_none()

    async def create(self, template: NotificationTemplate) -> NotificationTemplate:
        self.db.add(template)
        await self.db.flush()
        return template

    async def update(self, template_id: UUID, **kwargs) -> NotificationTemplate | None:
        await self.db.execute(
            update(NotificationTemplate)
            .where(NotificationTemplate.id == template_id)
            .values(**kwargs)
        )
        return await self.get_by_id(template_id)


class NotificationRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, notification: Notification) -> Notification:
        self.db.add(notification)
        await self.db.flush()
        return notification

    async def get_by_id(self, notification_id: UUID) -> Notification | None:
        result = await self.db.execute(
            select(Notification)
            .options(selectinload(Notification.logs))
            .where(Notification.id == notification_id)
        )
        return result.scalar_one_or_none()

    async def list_by_tenant(
        self,
        tenant_id: UUID,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[Notification], int]:
        query = (
            select(Notification)
            .options(selectinload(Notification.logs))
            .where(Notification.tenant_id == tenant_id)
            .offset(offset)
            .limit(limit)
            .order_by(Notification.created_at.desc())
        )
        count_query = (
            select(func.count())
            .select_from(Notification)
            .where(Notification.tenant_id == tenant_id)
        )

        result = await self.db.execute(query)
        count_result = await self.db.execute(count_query)
        return list(result.scalars().all()), count_result.scalar_one()

    async def list_by_user(
        self,
        user_id: UUID,
        tenant_id: UUID,
    ) -> list[Notification]:
        result = await self.db.execute(
            select(Notification)
            .options(selectinload(Notification.logs))
            .where(
                Notification.user_id == user_id,
                Notification.tenant_id == tenant_id,
            )
            .order_by(Notification.created_at.desc())
        )
        return list(result.scalars().all())

    async def update(self, notification_id: UUID, **kwargs) -> Notification | None:
        await self.db.execute(
            update(Notification)
            .where(Notification.id == notification_id)
            .values(**kwargs)
        )
        return await self.get_by_id(notification_id)

    async def add_log(self, log: NotificationLog) -> NotificationLog:
        self.db.add(log)
        await self.db.flush()
        return log
