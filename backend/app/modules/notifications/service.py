from typing import List, Optional
from app.modules.notifications.models import Notification
from app.modules.notifications.schemas import NotificationCreate
from app.modules.notifications.repository import NotificationRepository


class NotificationService:
    def __init__(self, repository: NotificationRepository):
        self.repository = repository

    async def list_user_notifications(self, user_id: int, limit: int = 50) -> List[Notification]:
        return await self.repository.list_by_user(user_id=user_id, limit=limit)

    async def create_notification(self, payload: NotificationCreate) -> Notification:
        notification = Notification(
            user_id=payload.user_id,
            title=payload.title,
            message=payload.message,
            channel=payload.channel,
            is_read=False,
        )
        return await self.repository.create(notification)

    async def mark_as_read(self, notification_id: int) -> Optional[Notification]:
        notification = await self.repository.get_by_id(notification_id)
        if not notification:
            return None
        notification.is_read = True
        await self.repository.session.flush()
        return notification
