from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_optional_db
from app.modules.pricing.schemas import (
    PricingTierResponse,
    PricingTierCreate,
    PricingTierUpdate,
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
    include_inactive: bool = False,
    service: PricingService = Depends(get_pricing_service),
) -> List[PricingTierResponse]:
    if include_inactive:
        tiers = await service.list_all_tiers()
    else:
        tiers = await service.list_active_tiers()
    return [PricingTierResponse.model_validate(t) for t in tiers]


@router.post("/tiers", response_model=PricingTierResponse, status_code=status.HTTP_201_CREATED)
async def create_pricing_tier(
    payload: PricingTierCreate,
    service: PricingService = Depends(get_pricing_service),
) -> PricingTierResponse:
    tier = await service.create_tier(payload)
    return PricingTierResponse.model_validate(tier)


@router.patch("/tiers/{tier_id}", response_model=PricingTierResponse)
async def update_pricing_tier(
    tier_id: int,
    payload: PricingTierUpdate,
    service: PricingService = Depends(get_pricing_service),
) -> PricingTierResponse:
    tier = await service.update_tier(tier_id, payload)
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pricing tier with ID {tier_id} not found",
        )
    return PricingTierResponse.model_validate(tier)


@router.post("/estimate", response_model=PriceCalculationResponse)
async def calculate_estimate(
    request: PriceCalculationRequest,
    service: PricingService = Depends(get_pricing_service),
) -> PriceCalculationResponse:
    """
    Calculate instant shipping price estimate based on distance and weight.
    """
    return await service.calculate_estimate(request)
