from datetime import datetime
from pydantic import BaseModel, ConfigDict
from app.modules.notifications.models import NotificationChannel


class NotificationBase(BaseModel):
    title: str
    message: str
    channel: NotificationChannel = NotificationChannel.IN_APP


class NotificationCreate(NotificationBase):
    user_id: int


class NotificationResponse(NotificationBase):
    id: int
    user_id: int
    is_read: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
