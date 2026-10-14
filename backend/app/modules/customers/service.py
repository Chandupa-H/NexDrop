from typing import Optional, List
from app.modules.customers.models import Customer
from app.modules.customers.schemas import CustomerCreate
from app.modules.customers.repository import CustomerRepository


class CustomerService:
    def __init__(self, repository: CustomerRepository):
        self.repository = repository

    async def get_customer(self, customer_id: int) -> Optional[Customer]:
        return await self.repository.get_by_id(customer_id)

    async def get_by_user(self, user_id: int) -> Optional[Customer]:
        return await self.repository.get_by_user_id(user_id)

    async def list_customers(self, skip: int = 0, limit: int = 100) -> List[Customer]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def create_customer(self, payload: CustomerCreate) -> Customer:
        customer = Customer(
            user_id=payload.user_id,
            phone=payload.phone,
            default_address=payload.default_address,
            city=payload.city,
            postal_code=payload.postal_code,
            notes=payload.notes,
        )
        return await self.repository.create(customer)
