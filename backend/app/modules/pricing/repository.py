from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.pricing.models import PricingTier


class PricingRepository:
    def __init__(self, session: Optional[AsyncSession] = None):
        self.session = session

    async def get_by_id(self, tier_id: int) -> Optional[PricingTier]:
        if self.session is None:
            return None
        result = await self.session.execute(
            select(PricingTier).where(PricingTier.id == tier_id)
        )
        return result.scalars().first()

    async def get_by_name(self, name: str) -> Optional[PricingTier]:
        if self.session is None:
            return None
        result = await self.session.execute(
            select(PricingTier).where(PricingTier.name.ilike(name))
        )
        return result.scalars().first()

    async def list_active(self) -> List[PricingTier]:
        if self.session is None:
            return []
        result = await self.session.execute(
            select(PricingTier).where(PricingTier.is_active.is_(True)).order_by(PricingTier.id.asc())
        )
        return list(result.scalars().all())

    async def list_all(self) -> List[PricingTier]:
        if self.session is None:
            return []
        result = await self.session.execute(
            select(PricingTier).order_by(PricingTier.id.asc())
        )
        return list(result.scalars().all())

    async def create(self, tier: PricingTier) -> PricingTier:
        if self.session is None:
            raise RuntimeError("Database session unavailable")
        self.session.add(tier)
        await self.session.flush()
        await self.session.refresh(tier)
        return tier

    async def update(self, tier: PricingTier) -> PricingTier:
        if self.session is None:
            raise RuntimeError("Database session unavailable")
        await self.session.flush()
        await self.session.refresh(tier)
        return tier
