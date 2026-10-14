from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PricingTierBase(BaseModel):
    name: str
    base_rate: float
    per_km_rate: float
    per_kg_rate: float
    is_active: bool = True


class PricingTierCreate(PricingTierBase):
    pass


class PricingTierResponse(PricingTierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PriceCalculationRequest(BaseModel):
    tier_name: Optional[str] = "Standard"
    distance_km: float
    weight_kg: float


class PriceCalculationResponse(BaseModel):
    tier_name: str
    distance_km: float
    weight_kg: float
    base_rate: float
    distance_cost: float
    weight_cost: float
    total_price: float
