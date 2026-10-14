from typing import Optional, List
from app.modules.users.models import User
from app.modules.users.schemas import UserCreate
from app.modules.users.repository import UserRepository


class UserService:
    def __init__(self, repository: UserRepository):
        self.repository = repository

    async def get_user(self, user_id: int) -> Optional[User]:
        return await self.repository.get_by_id(user_id)

    async def get_by_email(self, email: str) -> Optional[User]:
        return await self.repository.get_by_email(email)

    async def list_users(self, skip: int = 0, limit: int = 100) -> List[User]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def create_user(self, payload: UserCreate, hashed_password: str) -> User:
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hashed_password,
            role=payload.role,
            is_active=payload.is_active,
        )
        return await self.repository.create(user)
