from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.merchants.schemas import MerchantResponse
from app.modules.merchants.repository import MerchantRepository
from app.modules.merchants.service import MerchantService

router = APIRouter(prefix="/merchants", tags=["Merchants"])


def get_merchant_service(session: AsyncSession = Depends(get_db)) -> MerchantService:
    return MerchantService(MerchantRepository(session))


@router.get("", response_model=List[MerchantResponse])
async def list_merchants(
    skip: int = 0,
    limit: int = 50,
    service: MerchantService = Depends(get_merchant_service),
) -> List[MerchantResponse]:
    merchants = await service.list_merchants(skip=skip, limit=limit)
    return [MerchantResponse.model_validate(m) for m in merchants]


@router.get("/{merchant_id}", response_model=MerchantResponse)
async def get_merchant(
    merchant_id: int,
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantResponse:
    merchant = await service.get_merchant(merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Merchant with ID {merchant_id} not found",
        )
    return MerchantResponse.model_validate(merchant)
