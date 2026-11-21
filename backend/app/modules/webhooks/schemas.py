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
    event: Optional[str] = "order.in_transit"


class WebhookTestPingResponse(BaseModel):
    success: bool
    status_code: Optional[int] = None
    status_text: str
    duration_ms: int
    payload_sent: dict
    signature: str
    delivery_id: str
    delivery_status: str
    attempt_number: int = 1
    message: str


class WebhookLogResponse(BaseModel):
    id: str
    event: str
    tracking_number: Optional[str] = None
    status: Optional[int] = None
    status_text: str
    timestamp: str
    duration_ms: int
    delivery_status: str = "delivered"
    attempt_number: int = 1
    error_message: Optional[str] = None
    payload_summary: Optional[str] = None
    response_body: Optional[str] = None

    model_config = ConfigDict(extra="ignore")
