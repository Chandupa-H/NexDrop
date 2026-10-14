from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.customers.models import Customer


class CustomerRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, customer_id: int) -> Optional[Customer]:
        result = await self.session.execute(select(Customer).where(Customer.id == customer_id))
        return result.scalars().first()

    async def get_by_user_id(self, user_id: int) -> Optional[Customer]:
        result = await self.session.execute(select(Customer).where(Customer.user_id == user_id))
        return result.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Customer]:
        result = await self.session.execute(select(Customer).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, customer: Customer) -> Customer:
        self.session.add(customer)
        await self.session.flush()
        await self.session.refresh(customer)
        return customer
