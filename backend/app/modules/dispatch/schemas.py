from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.modules.dispatch.models import DispatchStatus


class DispatchCreate(BaseModel):
    parcel_id: int
    courier_id: int
    notes: Optional[str] = None


class DispatchStatusUpdate(BaseModel):
    status: DispatchStatus
    notes: Optional[str] = None


class DispatchResponse(BaseModel):
    id: int
    parcel_id: int
    courier_id: int
    status: DispatchStatus
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DispatcherDashboardStats(BaseModel):
    total_parcels: int
    unassigned_parcels: int
    active_deliveries: int
    completed_deliveries: int
    failed_deliveries: int


class DispatcherMeResponse(BaseModel):
    id: int
    full_name: str
    role: str = "dispatcher"


class UnassignedParcelItem(BaseModel):
    id: int
    tracking_number: str
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    delivery_city: str
    weight_kg: float
    dimensions: Optional[str] = None
    status: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UnassignedParcelListResponse(BaseModel):
    items: list[UnassignedParcelItem]
    total: int
    limit: int
    offset: int
    cities: list[str]


class UnassignedParcelDetailResponse(BaseModel):
    id: int
    tracking_number: str
    sender_id: int
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    delivery_city: str
    weight_kg: float
    dimensions: Optional[str] = None
    status: str
    special_instructions: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)



