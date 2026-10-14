from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CourierBase(BaseModel):
    vehicle_type: str
    license_plate: Optional[str] = None
    is_available: bool = True


class CourierCreate(CourierBase):
    user_id: int


class CourierLocationUpdate(BaseModel):
    current_latitude: float
    current_longitude: float


class CourierResponse(CourierBase):
    id: int
    user_id: int
    current_latitude: Optional[float] = None
    current_longitude: Optional[float] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
