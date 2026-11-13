from typing import List, Optional, Any, Dict
from app.modules.pricing.models import PricingTier
from app.modules.pricing.schemas import (
    PricingTierCreate,
    PricingTierUpdate,
    PricingTierResponse,
    AdminPricingRules,
    AdminPricingRulesUpdate,
    PriceCalculationRequest,
    PriceCalculationResponse,
)
from app.modules.pricing.repository import PricingRepository


class PricingService:
    def __init__(self, repository: PricingRepository):
        self.repository = repository

    async def list_active_tiers(self) -> List[PricingTierResponse]:
        raw_tiers = await self.repository.list_active()
        results = []
        for t in raw_tiers:
            if isinstance(t, dict):
                results.append(PricingTierResponse(**t))
            else:
                results.append(PricingTierResponse.model_validate(t))
        return results

    async def get_tier_by_id(self, tier_id: int) -> Optional[PricingTierResponse]:
        tier = await self.repository.get_by_id(tier_id)
        if not tier:
            return None
        if isinstance(tier, dict):
            return PricingTierResponse(**tier)
        return PricingTierResponse.model_validate(tier)

    async def list_all_tiers(self) -> List[PricingTierResponse]:
        raw_tiers = await self.repository.list_all()
        results = []
        for t in raw_tiers:
            if isinstance(t, dict):
                results.append(PricingTierResponse(**t))
            else:
                results.append(PricingTierResponse.model_validate(t))
        return results

    async def get_tier(self, tier_id: int) -> Optional[PricingTier]:
        return await self.repository.get_by_id(tier_id)

    async def calculate_estimate(self, request: PriceCalculationRequest) -> PriceCalculationResponse:
        tier_name = request.tier_name or "Standard"
        tier = await self.repository.get_by_name(tier_name)

        # Fallback default rates in Sri Lankan Rupees (Rs.)
        if tier:
            base_rate = tier["base_rate"] if isinstance(tier, dict) else tier.base_rate
            per_km = tier["per_km_rate"] if isinstance(tier, dict) else tier.per_km_rate
            per_kg = tier["per_kg_rate"] if isinstance(tier, dict) else tier.per_kg_rate
            currency = tier.get("currency", "Rs.") if isinstance(tier, dict) else getattr(tier, "currency", "Rs.")
        else:
            base_rate = 350.0
            per_km = 120.0
            per_kg = 50.0
            currency = "Rs."

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
            currency=currency,
        )

    async def create_tier(self, payload: PricingTierCreate) -> PricingTierResponse:
        tier = PricingTier(
            name=payload.name,
            base_rate=payload.base_rate,
            per_km_rate=payload.per_km_rate,
            per_kg_rate=payload.per_kg_rate,
            currency=payload.currency,
            is_active=payload.is_active,
        )
        created = await self.repository.create(tier)
        if isinstance(created, dict):
            return PricingTierResponse(**created)
        return PricingTierResponse.model_validate(created)

    async def update_tier(self, tier_id: int, payload: PricingTierUpdate) -> Optional[PricingTierResponse]:
        updates = payload.model_dump(exclude_unset=True)
        updated = await self.repository.update_tier(tier_id, updates)
        if not updated:
            return None
        if isinstance(updated, dict):
            return PricingTierResponse(**updated)
        return PricingTierResponse.model_validate(updated)

    async def get_admin_rules(self) -> AdminPricingRules:
        rules_dict = await self.repository.get_admin_rules()
        return AdminPricingRules(**rules_dict)

    async def update_admin_rules(self, payload: AdminPricingRulesUpdate) -> AdminPricingRules:
        updates = payload.model_dump(exclude_unset=True)
        updated = await self.repository.update_admin_rules(updates)
        return AdminPricingRules(**updated)
