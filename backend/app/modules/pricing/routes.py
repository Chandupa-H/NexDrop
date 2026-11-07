from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_optional_db
from app.modules.pricing.schemas import (
    PricingTierResponse,
    PricingTierCreate,
    PricingTierUpdate,
    AdminPricingRules,
    AdminPricingRulesUpdate,
    PriceCalculationRequest,
    PriceCalculationResponse,
)
from app.modules.pricing.repository import PricingRepository
from app.modules.pricing.service import PricingService

router = APIRouter(prefix="/pricing", tags=["Pricing"])


def get_pricing_service(session: Optional[AsyncSession] = Depends(get_optional_db)) -> PricingService:
    return PricingService(PricingRepository(session))


# ── Admin Global Pricing Rules (in Sri Lankan Rupees - Rs.) ───────────


@router.get("/rules", response_model=AdminPricingRules)
async def get_pricing_rules(
    service: PricingService = Depends(get_pricing_service),
) -> AdminPricingRules:
    """
    Get current platform delivery pricing rules (base fare, per-km rate, surcharges in Rs.).
    """
    return await service.get_admin_rules()


@router.put("/rules", response_model=AdminPricingRules)
@router.patch("/rules", response_model=AdminPricingRules)
async def update_pricing_rules(
    payload: AdminPricingRulesUpdate,
    service: PricingService = Depends(get_pricing_service),
) -> AdminPricingRules:
    """
    Update platform delivery pricing rules (base fare, per-km rate, surcharges in Rs.).
    """
    return await service.update_admin_rules(payload)


# ── Pricing Tiers (Standard, Express, SameDay in Rs.) ────────────────


@router.get("/tiers", response_model=List[PricingTierResponse])
async def list_pricing_tiers(
    service: PricingService = Depends(get_pricing_service),
) -> List[PricingTierResponse]:
    """
    List all active delivery pricing tiers.
    """
    return await service.list_active_tiers()


@router.get("/tiers/{tier_id}", response_model=PricingTierResponse)
async def get_pricing_tier(
    tier_id: int,
    service: PricingService = Depends(get_pricing_service),
) -> PricingTierResponse:
    """
    Get a single pricing tier by ID.
    """
    tier = await service.get_tier_by_id(tier_id)
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pricing tier with ID {tier_id} not found",
        )
    return tier


@router.post("/tiers", response_model=PricingTierResponse, status_code=status.HTTP_201_CREATED)
async def create_pricing_tier(
    payload: PricingTierCreate,
    service: PricingService = Depends(get_pricing_service),
) -> PricingTierResponse:
    """
    Create a new delivery pricing tier.
    """
    return await service.create_tier(payload)


@router.patch("/tiers/{tier_id}", response_model=PricingTierResponse)
async def update_pricing_tier(
    tier_id: int,
    payload: PricingTierUpdate,
    service: PricingService = Depends(get_pricing_service),
) -> PricingTierResponse:
    """
    Update pricing rates or status for a tier.
    """
    tier = await service.update_tier(tier_id, payload)
    if not tier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Pricing tier with ID {tier_id} not found",
        )
    return tier


# ── Shipping Price Estimation ─────────────────────────────────────────


@router.post("/estimate", response_model=PriceCalculationResponse)
async def calculate_estimate(
    request: PriceCalculationRequest,
    service: PricingService = Depends(get_pricing_service),
) -> PriceCalculationResponse:
    """
    Calculate instant shipping price estimate based on distance (km) and weight (kg) in Rs.
    """
    return await service.calculate_estimate(request)
