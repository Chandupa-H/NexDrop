from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.warehouses.models import Warehouse


class WarehouseRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, warehouse_id: int) -> Optional[Warehouse]:
        result = await self.session.execute(
            select(Warehouse).where(Warehouse.id == warehouse_id)
        )
        return result.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100, active_only: bool = False) -> List[Warehouse]:
        query = select(Warehouse)
        if active_only:
            query = query.where(Warehouse.is_active.is_(True))
        query = query.offset(skip).limit(limit)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def create(self, warehouse: Warehouse) -> Warehouse:
        self.session.add(warehouse)
        await self.session.flush()
        await self.session.refresh(warehouse)
        return warehouse

    async def update(self, warehouse: Warehouse) -> Warehouse:
        await self.session.flush()
        await self.session.refresh(warehouse)
        return warehouse

