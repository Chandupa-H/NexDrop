from typing import List, Optional
import secrets
from app.modules.webhooks.models import WebhookSubscription
from app.modules.webhooks.schemas import WebhookCreate
from app.modules.webhooks.repository import WebhookRepository


class WebhookService:
    def __init__(self, repository: WebhookRepository):
        self.repository = repository

    async def list_by_merchant(self, merchant_id: int) -> List[WebhookSubscription]:
        return await self.repository.list_by_merchant(merchant_id)

    async def create_subscription(self, payload: WebhookCreate) -> WebhookSubscription:
        subscription = WebhookSubscription(
            merchant_id=payload.merchant_id,
            target_url=str(payload.target_url),
            event_type=payload.event_type,
            secret_token=f"whsec_{secrets.token_hex(20)}",
            is_active=payload.is_active,
        )
        return await self.repository.create(subscription)

    async def get_by_id(self, webhook_id: int) -> Optional[WebhookSubscription]:
        return await self.repository.get_by_id(webhook_id)
