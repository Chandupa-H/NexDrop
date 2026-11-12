from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_optional_db
from app.modules.webhooks.schemas import (
    WebhookResponse,
    WebhookCreate,
    WebhookConfigSchema,
    WebhookTestPingRequest,
    WebhookTestPingResponse,
    WebhookLogResponse,
)
from app.modules.webhooks.service import WebhookService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

# Singleton service instance
webhook_service = WebhookService()


def get_service() -> WebhookService:
    return webhook_service


@router.get("/merchant/{merchant_id}/config", response_model=WebhookConfigSchema)
async def get_merchant_webhook_config(
    merchant_id: int,
    service: WebhookService = Depends(get_service),
) -> WebhookConfigSchema:
    """Fetch webhook URL, secret token, and subscribed events for a merchant."""
    return await service.get_merchant_config(merchant_id)


@router.post("/merchant/{merchant_id}/config", response_model=WebhookConfigSchema)
async def save_merchant_webhook_config(
    merchant_id: int,
    payload: WebhookConfigSchema,
    service: WebhookService = Depends(get_service),
) -> WebhookConfigSchema:
    """Save target URL, active status, and event triggers for a merchant's webhook."""
    return await service.save_merchant_config(merchant_id, payload)


@router.get("/merchant/{merchant_id}/logs", response_model=List[WebhookLogResponse])
async def get_merchant_webhook_logs(
    merchant_id: int,
    service: WebhookService = Depends(get_service),
) -> List[WebhookLogResponse]:
    """Get delivery logs for all recent webhook notifications sent to this merchant."""
    return await service.list_merchant_logs(merchant_id)


@router.post("/test-ping", response_model=WebhookTestPingResponse)
async def send_test_webhook_ping(
    payload: WebhookTestPingRequest,
    service: WebhookService = Depends(get_service),
) -> WebhookTestPingResponse:
    """Send a real-time signed test webhook ping with HMAC-SHA256 signature."""
    return await service.test_ping(
        target_url=payload.target_url,
        secret_key=payload.secret_key,
        event=payload.event or "order.in_transit",
        tracking_number=payload.tracking_number or "ND-LK-890216",
    )
