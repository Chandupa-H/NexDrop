from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.customers.schemas import CustomerResponse
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


def get_customer_service(session: AsyncSession = Depends(get_db)) -> CustomerService:
    return CustomerService(CustomerRepository(session))


@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    skip: int = 0,
    limit: int = 50,
    service: CustomerService = Depends(get_customer_service),
) -> List[CustomerResponse]:
    customers = await service.list_customers(skip=skip, limit=limit)
    return [CustomerResponse.model_validate(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerResponse:
    customer = await service.get_customer(customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )
    return CustomerResponse.model_validate(customer)
