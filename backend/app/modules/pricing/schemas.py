from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class PricingTierBase(BaseModel):
    name: str
    base_rate: float  # in Rs.
    per_km_rate: float  # in Rs./km
    per_kg_rate: float  # in Rs./kg
    currency: str = "Rs."
    is_active: bool = True


class PricingTierCreate(PricingTierBase):
    pass


class PricingTierUpdate(BaseModel):
    name: Optional[str] = None
    base_rate: Optional[float] = None
    per_km_rate: Optional[float] = None
    per_kg_rate: Optional[float] = None
    currency: Optional[str] = None
    is_active: Optional[bool] = None


class PricingTierResponse(PricingTierBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class AdminPricingRules(BaseModel):
    """
    Global delivery pricing rules for Admin Pricing Management (in Sri Lankan Rupees).
    """
    currency: str = "LKR"
    currency_symbol: str = "Rs."
    base_fare: float = 350.0  # Base delivery fee covering first 2.0 km (Rs. 350.00)
    per_km_rate: float = 120.0  # Per-kilometer standard distance rate (Rs. 120.00/km)
    express_surcharge: float = 250.0  # Express priority addon surcharge (Rs. 250.00)
    peak_surge_max: float = 1.50  # Max peak dynamic surge multiplier (1.50x)
    rain_surge: float = 1.30  # Inclement weather / rain surge multiplier (1.30x)
    base_distance_km: float = 2.0
    algorithmic_surge_active: bool = True
    updated_at: Optional[datetime] = None


class AdminPricingRulesUpdate(BaseModel):
    currency: Optional[str] = None
    currency_symbol: Optional[str] = None
    base_fare: Optional[float] = None
    per_km_rate: Optional[float] = None
    express_surcharge: Optional[float] = None
    peak_surge_max: Optional[float] = None
    rain_surge: Optional[float] = None
    base_distance_km: Optional[float] = None
    algorithmic_surge_active: Optional[bool] = None


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
    currency: str = "Rs."
