"""Notification Hub routes."""

from __future__ import annotations

from typing import Any
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.permissions import PermissionChecker, get_current_user
from app.repo.session import get_app_db
from app.schemas.notification import (
    NotificationListResponse,
    NotificationResponse,
    NotificationSend,
    TemplateCreate,
    TemplateResponse,
    TemplateUpdate,
)
from app.services.notification import NotificationService

router = APIRouter(prefix="", tags=["notifications"])


# ---------------------------------------------------------------------------
# Templates (admin)
# ---------------------------------------------------------------------------


@router.post(
    "/notification-templates",
    response_model=TemplateResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_template(
    data: TemplateCreate,
    current_user: dict[str, Any] = Depends(
        PermissionChecker(["notifications:write"])
    ),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Create a new notification template (admin)."""
    service = NotificationService(session)
    return await service.create_template(current_user["tenant_id"], data)


@router.get("/notification-templates", response_model=list[TemplateResponse])
async def list_templates(
    current_user: dict[str, Any] = Depends(
        PermissionChecker(["notifications:read"])
    ),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """List all notification templates (admin)."""
    service = NotificationService(session)
    return await service.list_templates(current_user["tenant_id"])


@router.patch(
    "/notification-templates/{template_id}",
    response_model=TemplateResponse,
)
async def update_template(
    template_id: UUID,
    data: TemplateUpdate,
    current_user: dict[str, Any] = Depends(
        PermissionChecker(["notifications:write"])
    ),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Update a notification template (admin)."""
    service = NotificationService(session)
    return await service.update_template(
        template_id, current_user["tenant_id"], data
    )


# ---------------------------------------------------------------------------
# Notifications
# ---------------------------------------------------------------------------


@router.post(
    "/notifications/send",
    response_model=NotificationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def send_notification(
    data: NotificationSend,
    current_user: dict[str, Any] = Depends(
        PermissionChecker(["notifications:write"])
    ),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """Send an ad-hoc notification (admin)."""
    service = NotificationService(session)
    return await service.send_direct(current_user["tenant_id"], data)


@router.get("/notifications", response_model=list[NotificationResponse])
async def list_notifications(
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    current_user: dict[str, Any] = Depends(get_current_user),
    session: AsyncSession = Depends(get_app_db),
) -> Any:
    """List sent notifications for the current user."""
    service = NotificationService(session)
    return await service.get_notifications(
        current_user["sub"],
        current_user["tenant_id"],
        skip=skip,
        limit=limit,
    )
