from datetime import datetime
from typing import Optional
from pydantic import BaseModel, HttpUrl, ConfigDict


class WebhookBase(BaseModel):
    target_url: str
    event_type: str
    is_active: bool = True


class WebhookCreate(WebhookBase):
    merchant_id: int


class WebhookResponse(WebhookBase):
    id: int
    merchant_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
