from datetime import datetime
from typing import Optional, Union, List, Any
from pydantic import BaseModel, ConfigDict


class DeliveryZoneBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    postcodes: Optional[Union[List[str], str, Any]] = None
    hub_name: Optional[str] = None
    base_fee: Optional[float] = 350.0
    currency: Optional[str] = "Rs."
    avg_delivery_time_mins: Optional[int] = 30
    active_couriers: Optional[int] = 0
    status: Optional[str] = "active"
    surge_multiplier: Optional[float] = 1.0
    is_active: bool = True


class DeliveryZoneCreate(DeliveryZoneBase):
    pass


class DeliveryZoneUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    postcodes: Optional[Union[List[str], str, Any]] = None
    hub_name: Optional[str] = None
    base_fee: Optional[float] = None
    currency: Optional[str] = None
    avg_delivery_time_mins: Optional[int] = None
    active_couriers: Optional[int] = None
    status: Optional[str] = None
    surge_multiplier: Optional[float] = None
    is_active: Optional[bool] = None


class DeliveryZoneResponse(DeliveryZoneBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
