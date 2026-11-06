from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict


class DeliveryZoneBase(BaseModel):
    name: str
    code: str
    description: Optional[str] = None
    postcodes: List[str] = []
    is_active: bool = True


class DeliveryZoneCreate(DeliveryZoneBase):
    pass


class DeliveryZoneUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    postcodes: Optional[List[str]] = None
    is_active: Optional[bool] = None


class DeliveryZoneResponse(DeliveryZoneBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

