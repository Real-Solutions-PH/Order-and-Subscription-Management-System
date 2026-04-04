"""Integration Gateway repositories."""

from __future__ import annotations

from typing import Any, Sequence
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.repo.base import BaseRepository
from app.repo.db import (
    AuditLog,
    IntegrationConfig,
    IntegrationSystemType,
    Webhook,
    WebhookEvent,
    WebhookEventStatus,
)


class WebhookRepository(BaseRepository[Webhook]):
    """Repository for webhook registrations."""

    model = Webhook

    async def get_active(self, tenant_id: UUID | str | None = None) -> list[Webhook]:
        """Return all active webhooks."""
        stmt = select(Webhook).where(Webhook.is_active.is_(True))
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_event(self, tenant_id: UUID | str, event_type: str) -> list[Webhook]:
        """Return active webhooks subscribed to a specific event type.

        The ``events`` column is a JSON list of event-type strings.
        Filtering is done in Python after fetching active webhooks.
        """
        webhooks = await self.get_active(tenant_id)
        return [wh for wh in webhooks if isinstance(wh.events, list) and event_type in wh.events]


class WebhookEventRepository(BaseRepository[WebhookEvent]):
    """Repository for webhook delivery events."""

    model = WebhookEvent

    async def get_by_webhook(self, webhook_id: UUID | str) -> list[WebhookEvent]:
        """Return all events for a specific webhook."""
        stmt = (
            select(WebhookEvent).where(WebhookEvent.webhook_id == webhook_id).order_by(WebhookEvent.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_pending_retries(self) -> list[WebhookEvent]:
        """Return failed events that are eligible for retry."""
        stmt = (
            select(WebhookEvent)
            .where(
                WebhookEvent.status == WebhookEventStatus.failed,
                WebhookEvent.retry_count < 5,
            )
            .order_by(WebhookEvent.next_retry_at.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class IntegrationConfigRepository(BaseRepository[IntegrationConfig]):
    """Repository for integration configurations."""

    model = IntegrationConfig

    async def get_by_type(self, tenant_id: UUID | str, system_type: IntegrationSystemType) -> IntegrationConfig | None:
        """Find the configuration for a specific integration system type."""
        stmt = select(IntegrationConfig).where(
            IntegrationConfig.tenant_id == tenant_id,
            IntegrationConfig.system_type == system_type,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active(self, tenant_id: UUID | str | None = None) -> list[IntegrationConfig]:
        """Return all active integration configs."""
        stmt = select(IntegrationConfig).where(IntegrationConfig.is_active.is_(True))
        stmt = self._apply_tenant_filter(stmt, tenant_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())


class AuditLogRepository(BaseRepository[AuditLog]):
    """Repository for audit trail entries."""

    model = AuditLog

    async def get_by_resource(
        self,
        tenant_id: UUID | str,
        resource_type: str,
        resource_id: UUID | str,
    ) -> list[AuditLog]:
        """Return audit entries for a specific resource."""
        stmt = (
            select(AuditLog)
            .where(
                AuditLog.tenant_id == tenant_id,
                AuditLog.resource_type == resource_type,
                AuditLog.resource_id == resource_id,
            )
            .order_by(AuditLog.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_actor(self, tenant_id: UUID | str, actor_id: UUID | str) -> list[AuditLog]:
        """Return audit entries performed by a specific actor."""
        stmt = (
            select(AuditLog)
            .where(
                AuditLog.tenant_id == tenant_id,
                AuditLog.actor_id == actor_id,
            )
            .order_by(AuditLog.created_at.desc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def query(
        self,
        tenant_id: UUID | str,
        filters: dict[str, Any] | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[AuditLog], int]:
        """Query audit logs with optional filters. Returns (items, total_count)."""
        from sqlalchemy import func

        stmt = select(AuditLog).where(AuditLog.tenant_id == tenant_id)
        count_stmt = select(func.count()).select_from(AuditLog).where(AuditLog.tenant_id == tenant_id)

        if filters:
            if "action" in filters:
                stmt = stmt.where(AuditLog.action == filters["action"])
                count_stmt = count_stmt.where(AuditLog.action == filters["action"])
            if "resource_type" in filters:
                stmt = stmt.where(AuditLog.resource_type == filters["resource_type"])
                count_stmt = count_stmt.where(AuditLog.resource_type == filters["resource_type"])
            if "actor_id" in filters:
                stmt = stmt.where(AuditLog.actor_id == filters["actor_id"])
                count_stmt = count_stmt.where(AuditLog.actor_id == filters["actor_id"])

        total_result = await self.session.execute(count_stmt)
        total = total_result.scalar_one()

        stmt = stmt.order_by(AuditLog.created_at.desc()).offset(skip).limit(limit)
        result = await self.session.execute(stmt)

        return list(result.scalars().all()), total
