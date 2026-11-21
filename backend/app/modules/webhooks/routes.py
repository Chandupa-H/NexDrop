from typing import List

from fastapi import APIRouter, BackgroundTasks, Body, Depends
from app.modules.auth.dependencies import get_authenticated_merchant_profile
from app.modules.merchants.models import Merchant
from app.modules.merchants.schemas import WebhookConfigResponse, WebhookConfigUpdate
from app.modules.webhooks.schemas import (
    WebhookConfigSchema,
    WebhookLogResponse,
    WebhookTestPingRequest,
    WebhookTestPingResponse,
)
from app.modules.webhooks.service import (
    WebhookService,
    authorize_merchant_path,
    get_webhook_service,
)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def _config_response(config: WebhookConfigSchema) -> WebhookConfigResponse:
    return WebhookConfigResponse(
        target_url=config.target_url,
        is_active=config.is_active,
        subscribed_events=config.subscribed_events,
        secret_configured=bool(config.secret_key),
    )


@router.get(
    "/merchant/{merchant_id}/config",
    response_model=WebhookConfigResponse,
)
async def get_merchant_webhook_config(
    merchant_id: int,
    merchant: Merchant = Depends(get_authenticated_merchant_profile),
    service: WebhookService = Depends(get_webhook_service),
) -> WebhookConfigResponse:
    owned_id = authorize_merchant_path(str(merchant_id), merchant.id)
    return _config_response(await service.get_merchant_config(owned_id))


@router.post(
    "/merchant/{merchant_id}/config",
    response_model=WebhookConfigResponse,
)
async def save_merchant_webhook_config(
    merchant_id: int,
    payload: WebhookConfigUpdate,
    merchant: Merchant = Depends(get_authenticated_merchant_profile),
    service: WebhookService = Depends(get_webhook_service),
) -> WebhookConfigResponse:
    owned_id = authorize_merchant_path(str(merchant_id), merchant.id)
    current = await service.get_merchant_config(owned_id)
    updated = await service.save_merchant_config(
        owned_id,
        WebhookConfigSchema(
            target_url=payload.target_url if payload.target_url is not None else current.target_url,
            secret_key=current.secret_key,
            is_active=payload.is_active if payload.is_active is not None else current.is_active,
            subscribed_events=(
                payload.subscribed_events
                if payload.subscribed_events is not None
                else current.subscribed_events
            ),
        ),
    )
    return _config_response(updated)


@router.get(
    "/merchant/{merchant_id}/logs",
    response_model=List[WebhookLogResponse],
)
async def get_merchant_webhook_logs(
    merchant_id: int,
    merchant: Merchant = Depends(get_authenticated_merchant_profile),
    service: WebhookService = Depends(get_webhook_service),
) -> List[WebhookLogResponse]:
    owned_id = authorize_merchant_path(str(merchant_id), merchant.id)
    return await service.list_merchant_logs(owned_id)


@router.post("/test-ping", response_model=WebhookTestPingResponse)
async def send_test_webhook_ping(
    background_tasks: BackgroundTasks,
    payload: WebhookTestPingRequest = Body(default_factory=WebhookTestPingRequest),
    merchant: Merchant = Depends(get_authenticated_merchant_profile),
    service: WebhookService = Depends(get_webhook_service),
) -> WebhookTestPingResponse:
    return await service.send_test_ping(
        merchant_id=merchant.id,
        event=payload.event or "order.in_transit",
        background_tasks=background_tasks,
    )
