from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class WebhookBase(BaseModel):
    target_url: str
    event_type: str
    is_active: bool = True


class WebhookCreate(WebhookBase):
    merchant_id: int


class WebhookResponse(WebhookBase):
    id: int
    merchant_id: int
    secret_token: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WebhookConfigSchema(BaseModel):
    target_url: str
    secret_key: str
    is_active: bool = True
    subscribed_events: List[str] = [
        "order.created",
        "order.picked_up",
        "order.in_transit",
        "order.out_for_delivery",
        "order.delivered",
        "order.failed",
    ]


class WebhookTestPingRequest(BaseModel):
    target_url: str
    secret_key: Optional[str] = None
    event: Optional[str] = "order.in_transit"
    tracking_number: Optional[str] = "ND-LK-890216"


class WebhookTestPingResponse(BaseModel):
    success: bool
    status_code: int
    status_text: str
    duration_ms: int
    payload_sent: dict
    signature: str
    message: str


class WebhookLogResponse(BaseModel):
    id: str
    event: str
    tracking_number: Optional[str] = None
    status: int
    status_text: str
    timestamp: str
    duration_ms: int
    payload_summary: Optional[str] = None
    response_body: Optional[str] = None
