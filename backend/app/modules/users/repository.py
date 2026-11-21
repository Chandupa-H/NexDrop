from typing import Optional, List
from uuid import UUID
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.users.models import User


class UserRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalars().first()

    async def get_by_email(self, email: str) -> Optional[User]:
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalars().first()

    async def list_by_normalized_email(self, email: str) -> List[User]:
        result = await self.session.execute(
            select(User).where(func.lower(User.email) == email.strip().lower())
        )
        return list(result.scalars().all())

    async def get_by_supabase_user_id(
        self, supabase_user_id: UUID, *, for_update: bool = False
    ) -> Optional[User]:
        statement = select(User).where(User.supabase_user_id == supabase_user_id)
        if for_update:
            statement = statement.with_for_update()
        result = await self.session.execute(statement)
        return result.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        result = await self.session.execute(select(User).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, user: User) -> User:
        self.session.add(user)
        await self.session.flush()
        await self.session.refresh(user)
        return user
