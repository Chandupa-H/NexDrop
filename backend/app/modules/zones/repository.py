from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.zones.models import DeliveryZone


class ZoneRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, zone_id: int) -> Optional[DeliveryZone]:
        result = await self.session.execute(
            select(DeliveryZone).where(DeliveryZone.id == zone_id)
        )
        return result.scalars().first()

    async def get_by_code(self, code: str) -> Optional[DeliveryZone]:
        result = await self.session.execute(
            select(DeliveryZone).where(DeliveryZone.code == code)
        )
        return result.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100, active_only: bool = False) -> List[DeliveryZone]:
        query = select(DeliveryZone)
        if active_only:
            query = query.where(DeliveryZone.is_active.is_(True))
        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create(self, zone: DeliveryZone) -> DeliveryZone:
        self.session.add(zone)
        await self.session.flush()
        await self.session.refresh(zone)
        return zone

    async def update(self, zone: DeliveryZone) -> DeliveryZone:
        await self.session.flush()
        await self.session.refresh(zone)
        return zone


# Alias for consistency
DeliveryZoneRepository = ZoneRepository

