from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.parcels.models import Parcel, ParcelStatus


class ParcelRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, parcel_id: int) -> Optional[Parcel]:
        result = await self.session.execute(select(Parcel).where(Parcel.id == parcel_id))
        return result.scalars().first()

    async def get_by_tracking_number(self, tracking_number: str) -> Optional[Parcel]:
        result = await self.session.execute(
            select(Parcel).where(Parcel.tracking_number == tracking_number)
        )
        return result.scalars().first()

    async def list_by_sender(self, sender_id: int) -> List[Parcel]:
        result = await self.session.execute(
            select(Parcel).where(Parcel.sender_id == sender_id)
        )
        return list(result.scalars().all())

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Parcel]:
        result = await self.session.execute(select(Parcel).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, parcel: Parcel) -> Parcel:
        self.session.add(parcel)
        await self.session.flush()
        await self.session.refresh(parcel)
        return parcel
