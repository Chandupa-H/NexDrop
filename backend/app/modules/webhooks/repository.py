from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.webhooks.models import WebhookSubscription


class WebhookRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, webhook_id: int) -> Optional[WebhookSubscription]:
        result = await self.session.execute(
            select(WebhookSubscription).where(WebhookSubscription.id == webhook_id)
        )
        return result.scalars().first()

    async def list_by_merchant(self, merchant_id: int) -> List[WebhookSubscription]:
        result = await self.session.execute(
            select(WebhookSubscription).where(WebhookSubscription.merchant_id == merchant_id)
        )
        return list(result.scalars().all())

    async def list_by_event(self, event_type: str) -> List[WebhookSubscription]:
        result = await self.session.execute(
            select(WebhookSubscription)
            .where(WebhookSubscription.event_type == event_type)
            .where(WebhookSubscription.is_active.is_(True))
        )
        return list(result.scalars().all())

    async def create(self, subscription: WebhookSubscription) -> WebhookSubscription:
        self.session.add(subscription)
        await self.session.flush()
        await self.session.refresh(subscription)
        return subscription
