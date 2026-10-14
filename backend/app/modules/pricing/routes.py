from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.session import get_optional_db
from app.modules.pricing.schemas import (
    PricingTierResponse,
    PricingTierCreate,
    PriceCalculationRequest,
    PriceCalculationResponse,
)
from app.modules.pricing.repository import PricingRepository
from app.modules.pricing.service import PricingService

router = APIRouter(prefix="/pricing", tags=["Pricing"])


def get_pricing_service(session: Optional[AsyncSession] = Depends(get_optional_db)) -> PricingService:
    return PricingService(PricingRepository(session))


@router.get("/tiers", response_model=List[PricingTierResponse])
async def list_pricing_tiers(
    service: PricingService = Depends(get_pricing_service),
) -> List[PricingTierResponse]:
    tiers = await service.list_active_tiers()
    return [PricingTierResponse.model_validate(t) for t in tiers]


@router.post("/estimate", response_model=PriceCalculationResponse)
async def calculate_estimate(
    request: PriceCalculationRequest,
    service: PricingService = Depends(get_pricing_service),
) -> PriceCalculationResponse:
    """
    Calculate instant shipping price estimate based on distance and weight.
    """
    return await service.calculate_estimate(request)
