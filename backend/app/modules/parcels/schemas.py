from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.modules.parcels.models import (
    ParcelStatus,
    DeliveryMethod,
    CurrentLocationType,
)


class ParcelBase(BaseModel):
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    delivery_city: str
    weight_kg: float = 1.0
    dimensions: Optional[str] = None
    special_instructions: Optional[str] = None
    delivery_method: DeliveryMethod = DeliveryMethod.DIRECT
    current_location_type: CurrentLocationType = CurrentLocationType.SENDER
    current_warehouse_id: Optional[int] = None
    cod_amount: Optional[float] = 0.0
    is_prepaid: Optional[bool] = False


class ParcelCreate(ParcelBase):
    sender_id: int


class ParcelStatusUpdate(BaseModel):
    status: ParcelStatus
    current_location_type: Optional[CurrentLocationType] = None
    current_warehouse_id: Optional[int] = None


class ParcelResponse(ParcelBase):
    id: int
    tracking_number: str
    sender_id: int
    status: ParcelStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
