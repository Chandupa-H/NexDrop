from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.merchants.models import Merchant


class MerchantRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, merchant_id: int) -> Optional[Merchant]:
        result = await self.session.execute(select(Merchant).where(Merchant.id == merchant_id))
        return result.scalars().first()

    async def get_by_user_id(self, user_id: int) -> Optional[Merchant]:
        result = await self.session.execute(select(Merchant).where(Merchant.user_id == user_id))
        return result.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Merchant]:
        result = await self.session.execute(select(Merchant).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, merchant: Merchant) -> Merchant:
        self.session.add(merchant)
        await self.session.flush()
        await self.session.refresh(merchant)
        return merchant
