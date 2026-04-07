from uuid import UUID

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.modules.integration_gateway.models import AuditLog, IntegrationConfig, Webhook, WebhookEvent


class WebhookRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_tenant(self, tenant_id: UUID) -> list[Webhook]:
        result = await self.db.execute(
            select(Webhook).where(Webhook.tenant_id == tenant_id).order_by(Webhook.created_at.desc())
        )
        return list(result.scalars().all())

    async def get_active_by_event(self, tenant_id: UUID, event_type: str) -> list[Webhook]:
        result = await self.db.execute(
            select(Webhook).where(
                Webhook.tenant_id == tenant_id,
                Webhook.is_active.is_(True),
            )
        )
        webhooks = result.scalars().all()
        return [w for w in webhooks if event_type in (w.events or [])]

    async def create(self, webhook: Webhook) -> Webhook:
        self.db.add(webhook)
        await self.db.flush()
        return webhook

    async def create_event(self, event: WebhookEvent) -> WebhookEvent:
        self.db.add(event)
        await self.db.flush()
        return event

    async def update_event(self, event_id: UUID, **kwargs) -> None:
        await self.db.execute(update(WebhookEvent).where(WebhookEvent.id == event_id).values(**kwargs))


class IntegrationConfigRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def list_by_tenant(self, tenant_id: UUID) -> list[IntegrationConfig]:
        result = await self.db.execute(
            select(IntegrationConfig).where(IntegrationConfig.tenant_id == tenant_id)
        )
        return list(result.scalars().all())

    async def get_by_system_type(self, tenant_id: UUID, system_type: str) -> IntegrationConfig | None:
        result = await self.db.execute(
            select(IntegrationConfig).where(
                IntegrationConfig.tenant_id == tenant_id,
                IntegrationConfig.system_type == system_type,
            )
        )
        return result.scalar_one_or_none()


class AuditLogRepo:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create(self, log: AuditLog) -> AuditLog:
        self.db.add(log)
        await self.db.flush()
        return log

    async def list_by_resource(
        self, tenant_id: UUID, resource_type: str, resource_id: UUID
    ) -> list[AuditLog]:
        result = await self.db.execute(
            select(AuditLog)
            .where(
                AuditLog.tenant_id == tenant_id,
                AuditLog.resource_type == resource_type,
                AuditLog.resource_id == resource_id,
            )
            .order_by(AuditLog.created_at.desc())
        )
        return list(result.scalars().all())
