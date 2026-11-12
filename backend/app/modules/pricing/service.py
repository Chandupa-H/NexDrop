from typing import List, Optional
from app.modules.pricing.models import PricingTier
from app.modules.pricing.schemas import (
    PricingTierCreate,
    PricingTierUpdate,
    PriceCalculationRequest,
    PriceCalculationResponse,
)
from app.modules.pricing.repository import PricingRepository


class PricingService:
    def __init__(self, repository: PricingRepository):
        self.repository = repository

    async def list_active_tiers(self) -> List[PricingTier]:
        return await self.repository.list_active()

    async def list_all_tiers(self) -> List[PricingTier]:
        return await self.repository.list_all()

    async def get_tier(self, tier_id: int) -> Optional[PricingTier]:
        return await self.repository.get_by_id(tier_id)

    async def calculate_estimate(self, request: PriceCalculationRequest) -> PriceCalculationResponse:
        tier_name = request.tier_name or "Standard"
        tier = await self.repository.get_by_name(tier_name)

        # Fallback default constants if DB tier not found
        base_rate = tier.base_rate if tier else 5.0
        per_km = tier.per_km_rate if tier else 1.5
        per_kg = tier.per_kg_rate if tier else 0.8

        distance_cost = round(request.distance_km * per_km, 2)
        weight_cost = round(request.weight_kg * per_kg, 2)
        total = round(base_rate + distance_cost + weight_cost, 2)

        return PriceCalculationResponse(
            tier_name=tier_name,
            distance_km=request.distance_km,
            weight_kg=request.weight_kg,
            base_rate=base_rate,
            distance_cost=distance_cost,
            weight_cost=weight_cost,
            total_price=total,
        )

    async def create_tier(self, payload: PricingTierCreate) -> PricingTier:
        tier = PricingTier(
            name=payload.name,
            base_rate=payload.base_rate,
            per_km_rate=payload.per_km_rate,
            per_kg_rate=payload.per_kg_rate,
            is_active=payload.is_active,
        )
        return await self.repository.create(tier)

    async def update_tier(self, tier_id: int, payload: PricingTierUpdate) -> Optional[PricingTier]:
        tier = await self.repository.get_by_id(tier_id)
        if not tier:
            return None

        if payload.name is not None:
            tier.name = payload.name
        if payload.base_rate is not None:
            tier.base_rate = payload.base_rate
        if payload.per_km_rate is not None:
            tier.per_km_rate = payload.per_km_rate
        if payload.per_kg_rate is not None:
            tier.per_kg_rate = payload.per_kg_rate
        if payload.is_active is not None:
            tier.is_active = payload.is_active

        return await self.repository.update(tier)
