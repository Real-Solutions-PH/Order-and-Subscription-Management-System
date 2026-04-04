"""Integration Gateway routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionChecker
from app.repo.session import get_app_db
from app.schemas.base import MessageResponse
from app.schemas.integration import (
    AuditLogListResponse,
    AuditLogResponse,
    IntegrationConfigCreate,
    IntegrationConfigResponse,
    WebhookCreate,
    WebhookEventResponse,
    WebhookResponse,
)
from app.services.integration import AuditService, IntegrationService

router = APIRouter(prefix="", tags=["integrations"])


# ---------------------------------------------------------------------------
# Webhooks
# ---------------------------------------------------------------------------


@router.post(
    "/webhooks",
    response_model=WebhookResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register_webhook(
    data: WebhookCreate,
    current_user: dict[str, Any] = Depends(PermissionChecker(["integrations:write"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Register a new webhook endpoint (admin)."""
    service = IntegrationService(session)
    return await service.register_webhook(current_user["tenant_id"], data)


@router.get("/webhooks", response_model=list[WebhookResponse])
async def list_webhooks(
    current_user: dict[str, Any] = Depends(PermissionChecker(["integrations:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """List all active webhooks (admin)."""
    service = IntegrationService(session)
    return await service.list_webhooks(current_user["tenant_id"])


@router.delete("/webhooks/{webhook_id}", response_model=MessageResponse)
async def delete_webhook(
    webhook_id: UUID,
    current_user: dict[str, Any] = Depends(PermissionChecker(["integrations:write"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Remove a webhook (admin)."""
    service = IntegrationService(session)
    await service.delete_webhook(webhook_id, current_user["tenant_id"])
    return MessageResponse(message="Webhook deleted")


@router.get(
    "/webhooks/{webhook_id}/events",
    response_model=list[WebhookEventResponse],
)
async def list_webhook_events(
    webhook_id: UUID,
    current_user: dict[str, Any] = Depends(PermissionChecker(["integrations:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """List delivery events for a webhook (admin)."""
    service = IntegrationService(session)
    return await service.get_webhook_events(webhook_id, current_user["tenant_id"])


# ---------------------------------------------------------------------------
# Integrations
# ---------------------------------------------------------------------------


@router.post(
    "/integrations",
    response_model=IntegrationConfigResponse,
    status_code=status.HTTP_201_CREATED,
)
async def configure_integration(
    data: IntegrationConfigCreate,
    current_user: dict[str, Any] = Depends(PermissionChecker(["integrations:write"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Configure an external integration (admin)."""
    service = IntegrationService(session)
    return await service.configure_integration(current_user["tenant_id"], data)


@router.get("/integrations", response_model=list[IntegrationConfigResponse])
async def list_integrations(
    current_user: dict[str, Any] = Depends(PermissionChecker(["integrations:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """List all active integrations (admin)."""
    service = IntegrationService(session)
    return await service.list_integrations(current_user["tenant_id"])


# ---------------------------------------------------------------------------
# Audit Logs
# ---------------------------------------------------------------------------


@router.get("/audit-logs", response_model=AuditLogListResponse)
async def query_audit_logs(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    action: str | None = Query(None, description="Filter by action"),
    resource_type: str | None = Query(None, description="Filter by resource type"),
    actor_id: UUID | None = Query(None, description="Filter by actor"),
    current_user: dict[str, Any] = Depends(PermissionChecker(["audit:read"])),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Query audit trail (admin)."""
    filters: dict[str, Any] = {}
    if action is not None:
        filters["action"] = action
    if resource_type is not None:
        filters["resource_type"] = resource_type
    if actor_id is not None:
        filters["actor_id"] = actor_id

    service = AuditService(session)
    return await service.query_logs(
        current_user["tenant_id"],
        filters=filters if filters else None,
        skip=skip,
        limit=limit,
    )
