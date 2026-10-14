from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.couriers.models import Courier


class CourierRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, courier_id: int) -> Optional[Courier]:
        result = await self.session.execute(select(Courier).where(Courier.id == courier_id))
        return result.scalars().first()

    async def get_by_user_id(self, user_id: int) -> Optional[Courier]:
        result = await self.session.execute(select(Courier).where(Courier.user_id == user_id))
        return result.scalars().first()

    async def list_available(self) -> List[Courier]:
        result = await self.session.execute(
            select(Courier).where(Courier.is_available.is_(True))
        )
        return list(result.scalars().all())

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Courier]:
        result = await self.session.execute(select(Courier).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, courier: Courier) -> Courier:
        self.session.add(courier)
        await self.session.flush()
        await self.session.refresh(courier)
        return courier
