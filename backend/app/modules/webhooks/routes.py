from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.webhooks.schemas import WebhookResponse, WebhookCreate
from app.modules.webhooks.repository import WebhookRepository
from app.modules.webhooks.service import WebhookService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def get_webhook_service(session: AsyncSession = Depends(get_db)) -> WebhookService:
    return WebhookService(WebhookRepository(session))


@router.get("/merchant/{merchant_id}", response_model=List[WebhookResponse])
async def list_merchant_webhooks(
    merchant_id: int,
    service: WebhookService = Depends(get_webhook_service),
) -> List[WebhookResponse]:
    subscriptions = await service.list_by_merchant(merchant_id)
    return [WebhookResponse.model_validate(s) for s in subscriptions]


@router.post("", response_model=WebhookResponse, status_code=status.HTTP_201_CREATED)
async def create_webhook_subscription(
    payload: WebhookCreate,
    service: WebhookService = Depends(get_webhook_service),
) -> WebhookResponse:
    subscription = await service.create_subscription(payload)
    return WebhookResponse.model_validate(subscription)
