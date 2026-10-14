from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.notifications.schemas import NotificationResponse, NotificationCreate
from app.modules.notifications.repository import NotificationRepository
from app.modules.notifications.service import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def get_notification_service(session: AsyncSession = Depends(get_db)) -> NotificationService:
    return NotificationService(NotificationRepository(session))


@router.get("/user/{user_id}", response_model=List[NotificationResponse])
async def list_notifications(
    user_id: int,
    limit: int = 20,
    service: NotificationService = Depends(get_notification_service),
) -> List[NotificationResponse]:
    notifications = await service.list_user_notifications(user_id=user_id, limit=limit)
    return [NotificationResponse.model_validate(n) for n in notifications]


@router.post("", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED)
async def create_notification(
    payload: NotificationCreate,
    service: NotificationService = Depends(get_notification_service),
) -> NotificationResponse:
    notification = await service.create_notification(payload)
    return NotificationResponse.model_validate(notification)


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
async def mark_as_read(
    notification_id: int,
    service: NotificationService = Depends(get_notification_service),
) -> NotificationResponse:
    notification = await service.mark_as_read(notification_id)
    if not notification:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Notification {notification_id} not found",
        )
    return NotificationResponse.model_validate(notification)
