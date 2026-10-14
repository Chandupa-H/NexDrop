from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.modules.parcels.models import ParcelStatus


class ParcelBase(BaseModel):
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    delivery_city: str
    weight_kg: float = 1.0
    dimensions: Optional[str] = None
    special_instructions: Optional[str] = None


class ParcelCreate(ParcelBase):
    sender_id: int


class ParcelStatusUpdate(BaseModel):
    status: ParcelStatus


class ParcelResponse(ParcelBase):
    id: int
    tracking_number: str
    sender_id: int
    status: ParcelStatus
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
