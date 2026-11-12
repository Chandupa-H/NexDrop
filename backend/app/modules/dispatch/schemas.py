from datetime import datetime
from typing import Optional, List
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


class CourierReassignRequest(BaseModel):
    new_courier_id: int
    reason: Optional[str] = None


class WarehouseReceiveRequest(BaseModel):
    parcel_id: int
    warehouse_id: int
    notes: Optional[str] = None


class WarehouseHandoverRequest(BaseModel):
    parcel_id: int
    warehouse_id: int
    courier_id: int
    notes: Optional[str] = None


class CourierWorkloadItem(BaseModel):
    courier_id: int
    user_id: int
    full_name: Optional[str] = "Unknown Courier"
    vehicle_type: str
    is_available: bool
    active_assignments: int
    workload_status: str  # "AVAILABLE", "OPTIMAL", "BUSY", "UNAVAILABLE"


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


class DispatchCourierSummary(BaseModel):
    id: int
    name: str
    vehicle_type: Optional[str] = None
    license_plate: Optional[str] = None


class DispatchHistoryItem(BaseModel):
    id: int
    parcel_id: int
    tracking_number: str
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    delivery_city: str
    weight_kg: float
    parcel_status: str
    courier_id: int
    courier_name: Optional[str] = None
    vehicle_type: Optional[str] = None
    license_plate: Optional[str] = None
    status: str
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class DispatchHistoryResponse(BaseModel):
    items: list[DispatchHistoryItem]
    total: int
    limit: int
    offset: int
    statuses: list[str]
    couriers: list[DispatchCourierSummary]


class DispatchHistoryDetailResponse(BaseModel):
    id: int
    parcel_id: int
    tracking_number: str
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    delivery_city: str
    weight_kg: float
    dimensions: Optional[str] = None
    parcel_status: str
    special_instructions: Optional[str] = None
    courier_id: int
    courier_name: Optional[str] = None
    courier_phone: Optional[str] = None
    vehicle_type: Optional[str] = None
    license_plate: Optional[str] = None
    status: str
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

