"""
Integration Gateway services.

This module operates entirely backend-to-backend. No frontend-facing API.
It handles webhook dispatch, audit logging, and integration with external RSPH systems.
"""

import hashlib
import hmac
import json
from datetime import datetime, timezone
from uuid import UUID

from app.modules.integration_gateway.models import AuditLog, WebhookEvent
from app.modules.integration_gateway.repo import AuditLogRepo, WebhookRepo
from app.shared.events import Event, event_bus


class WebhookDispatchService:
    def __init__(self, webhook_repo: WebhookRepo):
        self.webhook_repo = webhook_repo

    async def dispatch(self, tenant_id: UUID, event_type: str, payload: dict) -> None:
        webhooks = await self.webhook_repo.get_active_by_event(tenant_id, event_type)
        for webhook in webhooks:
            event = WebhookEvent(
                webhook_id=webhook.id,
                event_type=event_type,
                payload=payload,
                status="pending",
            )
            await self.webhook_repo.create_event(event)
            # TODO: Dispatch HTTP POST to webhook.url with HMAC signature
            # signature = hmac.new(webhook.secret.encode(), json.dumps(payload).encode(), hashlib.sha256).hexdigest()
            # In production, use a background task queue (Celery) for delivery + retry


class AuditService:
    def __init__(self, audit_repo: AuditLogRepo):
        self.audit_repo = audit_repo

    async def log(
        self,
        tenant_id: UUID,
        actor_id: UUID | None,
        action: str,
        resource_type: str,
        resource_id: UUID,
        before_state: dict | None = None,
        after_state: dict | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditLog:
        audit_log = AuditLog(
            tenant_id=tenant_id,
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            before_state=before_state,
            after_state=after_state,
            ip_address=ip_address,
            user_agent=user_agent,
        )
        return await self.audit_repo.create(audit_log)

    async def get_audit_trail(
        self, tenant_id: UUID, resource_type: str, resource_id: UUID
    ) -> list[AuditLog]:
        return await self.audit_repo.list_by_resource(tenant_id, resource_type, resource_id)
