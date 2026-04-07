"""API routes for the Notification Hub module."""

from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.dependencies import get_notification_service
from app.modules.notification_hub.schemas import (
    NotificationListResponse,
    NotificationResponse,
    NotificationTemplateCreate,
    NotificationTemplateResponse,
    NotificationTemplateUpdate,
    SendNotificationRequest,
)
from app.shared.auth import CurrentUser, SuperUser

router = APIRouter(tags=["Notifications"])


# ── Template Endpoints ─────────────────────────────────────────────────


@router.get("/notification-templates", response_model=list[NotificationTemplateResponse])
async def list_notification_templates(
    current_user: SuperUser,
    notification_service=Depends(get_notification_service),
):
    return await notification_service.list_templates(current_user.tenant_id)


@router.post(
    "/notification-templates",
    response_model=NotificationTemplateResponse,
    status_code=201,
)
async def create_notification_template(
    data: NotificationTemplateCreate,
    current_user: SuperUser,
    notification_service=Depends(get_notification_service),
):
    return await notification_service.create_template(current_user.tenant_id, data)


@router.patch(
    "/notification-templates/{template_id}",
    response_model=NotificationTemplateResponse,
)
async def update_notification_template(
    template_id: UUID,
    data: NotificationTemplateUpdate,
    current_user: SuperUser,
    notification_service=Depends(get_notification_service),
):
    return await notification_service.update_template(template_id, data)


# ── Notification Endpoints ─────────────────────────────────────────────


@router.post("/notifications/send", response_model=NotificationResponse, status_code=201)
async def send_notification(
    data: SendNotificationRequest,
    current_user: SuperUser,
    notification_service=Depends(get_notification_service),
):
    return await notification_service.send_notification(current_user.tenant_id, data)


@router.get("/notifications", response_model=NotificationListResponse)
async def list_notifications(
    current_user: CurrentUser,
    notification_service=Depends(get_notification_service),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
):
    offset = (page - 1) * per_page
    notifications, total = await notification_service.list_notifications(
        current_user.tenant_id, offset, per_page
    )
    return NotificationListResponse(
        total=total, page=page, per_page=per_page, items=notifications
    )
