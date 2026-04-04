"""Integration Gateway services."""

from __future__ import annotations

import secrets
from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.events import get_event_bus
from app.core.exceptions import NotFoundException
from app.repo.db import (
    AuditLog,
    IntegrationConfig,
    Webhook,
    WebhookEvent,
    WebhookEventStatus,
)
from app.repo.integration import (
    AuditLogRepository,
    IntegrationConfigRepository,
    WebhookEventRepository,
    WebhookRepository,
)
from app.schemas.base import PaginatedResponse
from app.schemas.integration import (
    AuditLogResponse,
    IntegrationConfigCreate,
    WebhookCreate,
)


class IntegrationService:
    """Business logic for webhooks and external integrations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.webhook_repo = WebhookRepository(session)
        self.event_repo = WebhookEventRepository(session)
        self.config_repo = IntegrationConfigRepository(session)

    # ------------------------------------------------------------------
    # Webhooks
    # ------------------------------------------------------------------

    async def register_webhook(self, tenant_id: UUID | str, data: WebhookCreate) -> Webhook:
        """Register a new webhook endpoint."""
        webhook_data = data.model_dump()
        webhook_data["tenant_id"] = tenant_id

        # Auto-generate secret if not provided
        if not webhook_data.get("secret"):
            webhook_data["secret"] = secrets.token_urlsafe(32)

        return await self.webhook_repo.create(webhook_data)

    async def list_webhooks(self, tenant_id: UUID | str) -> list[Webhook]:
        """List all active webhooks for a tenant."""
        return await self.webhook_repo.get_active(tenant_id)

    async def delete_webhook(self, webhook_id: UUID | str, tenant_id: UUID | str) -> None:
        """Deactivate a webhook."""
        deleted = await self.webhook_repo.delete(webhook_id, tenant_id=tenant_id)
        if not deleted:
            raise NotFoundException("Webhook", str(webhook_id))

    async def get_webhook_events(self, webhook_id: UUID | str, tenant_id: UUID | str) -> list[WebhookEvent]:
        """List delivery events for a webhook."""
        # Verify webhook belongs to tenant
        webhook = await self.webhook_repo.get_by_id(webhook_id, tenant_id=tenant_id)
        if webhook is None:
            raise NotFoundException("Webhook", str(webhook_id))
        return await self.event_repo.get_by_webhook(webhook_id)

    async def deliver_event(
        self,
        tenant_id: UUID | str,
        event_type: str,
        payload: dict[str, Any],
    ) -> None:
        """Find matching webhooks and create delivery events.

        TODO: Actually deliver via HTTP POST with HMAC signature.
        Currently creates WebhookEvent records and marks them as delivered.
        """
        webhooks = await self.webhook_repo.get_by_event(tenant_id, event_type)

        for webhook in webhooks:
            event = await self.event_repo.create(
                {
                    "webhook_id": webhook.id,
                    "event_type": event_type,
                    "payload": payload,
                    "status": WebhookEventStatus.pending,
                }
            )

            # TODO: HTTP POST to webhook.url with payload and HMAC signature
            # For now, stub: mark as delivered
            await self.event_repo.update(
                event.id,
                {
                    "status": WebhookEventStatus.delivered,
                    "response_code": 200,
                },
            )

            # Update last_triggered_at on the webhook
            await self.webhook_repo.update(
                webhook.id,
                {"last_triggered_at": datetime.now(timezone.utc)},
                tenant_id=tenant_id,
            )

    # ------------------------------------------------------------------
    # Integration Configs
    # ------------------------------------------------------------------

    async def configure_integration(self, tenant_id: UUID | str, data: IntegrationConfigCreate) -> IntegrationConfig:
        """Create or update an integration configuration."""
        config_data = data.model_dump()
        config_data["tenant_id"] = tenant_id
        return await self.config_repo.create(config_data)

    async def list_integrations(self, tenant_id: UUID | str) -> list[IntegrationConfig]:
        """List all active integrations for a tenant."""
        return await self.config_repo.get_active(tenant_id)


class AuditService:
    """Business logic for audit trail logging and querying."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = AuditLogRepository(session)

    async def log(
        self,
        tenant_id: UUID | str,
        actor_id: UUID | str | None,
        action: str,
        resource_type: str,
        resource_id: UUID | str,
        before_state: dict | None = None,
        after_state: dict | None = None,
        ip_address: str = "0.0.0.0",
        user_agent: str | None = None,
    ) -> AuditLog:
        """Create an audit log entry."""
        return await self.repo.create(
            {
                "tenant_id": tenant_id,
                "actor_id": actor_id,
                "action": action,
                "resource_type": resource_type,
                "resource_id": resource_id,
                "before_state": before_state,
                "after_state": after_state,
                "ip_address": ip_address,
                "user_agent": user_agent,
            }
        )

    async def query_logs(
        self,
        tenant_id: UUID | str,
        filters: dict[str, Any] | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> PaginatedResponse[AuditLogResponse]:
        """Query audit logs with pagination."""
        items, total = await self.repo.query(tenant_id, filters=filters, skip=skip, limit=limit)
        return PaginatedResponse.build(
            items=[AuditLogResponse.model_validate(i) for i in items],
            total=total,
            page=(skip // limit) + 1 if limit > 0 else 1,
            page_size=limit,
        )
