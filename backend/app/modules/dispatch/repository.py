from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.dispatch.models import DispatchAssignment


class DispatchRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, assignment_id: int) -> Optional[DispatchAssignment]:
        result = await self.session.execute(
            select(DispatchAssignment).where(DispatchAssignment.id == assignment_id)
        )
        return result.scalars().first()

    async def list_by_courier(self, courier_id: int) -> List[DispatchAssignment]:
        result = await self.session.execute(
            select(DispatchAssignment).where(DispatchAssignment.courier_id == courier_id)
        )
        return list(result.scalars().all())

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[DispatchAssignment]:
        result = await self.session.execute(select(DispatchAssignment).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, assignment: DispatchAssignment) -> DispatchAssignment:
        self.session.add(assignment)
        await self.session.flush()
        await self.session.refresh(assignment)
        return assignment
