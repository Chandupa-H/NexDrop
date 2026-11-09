from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field
from app.modules.parcels.models import ParcelStatus


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


# ── Dashboard Schemas ──────────────────────────────────────────────


class CourierMeResponse(BaseModel):
    """GET /courier/me - Courier profile for the authenticated user."""
    id: int
    full_name: str
    role: str = "courier"


class DashboardTotals(BaseModel):
    """Parcel count breakdown for today."""
    assigned: int
    delivered: int
    in_transit: int  # picked_up + in_transit + out_for_delivery
    pending: int
    failed: int


class DashboardKPI(BaseModel):
    """Key performance indicator with delta percentage."""
    key: str
    value: int
    delta_pct: int


class WeeklyDelivery(BaseModel):
    """Daily delivery count for the bar chart."""
    date: str  # ISO 8601 date
    delivered: int


class DashboardSummaryResponse(BaseModel):
    """GET /courier/dashboard/summary - All dashboard metrics computed from in-memory parcels."""
    totals: DashboardTotals
    kpis: List[DashboardKPI]
    weekly_deliveries: List[WeeklyDelivery]


class ParcelListItem(BaseModel):
    """Parcel item for list view."""
    tracking_id: str
    customer_name: str
    destination: str
    status: str
    assigned_at: str  # ISO 8601 with timezone
    eta: Optional[str] = None  # ISO 8601 with timezone


class ParcelListResponse(BaseModel):
    """GET /courier/parcels - Paginated list of assigned parcels."""
    items: List[ParcelListItem]
    total: int


class TimelineEvent(BaseModel):
    """Status change event in the parcel timeline."""
    status: str
    label: str
    occurred_at: str  # ISO 8601 with timezone
    location: Optional[str] = None


class ParcelDetailResponse(BaseModel):
    """GET /courier/parcels/{tracking_id} - Full parcel details."""
    tracking_id: str
    customer_name: str
    customer_phone_masked: str  # e.g., "+94 77 *** 4521"
    destination: str
    address_line: str
    status: str
    assigned_at: str  # ISO 8601 with timezone
    eta: Optional[str] = None
    notes: List[str] = Field(default_factory=list)
    timeline: List[TimelineEvent]


class ParcelStatusUpdateRequest(BaseModel):
    """PATCH /courier/parcels/{tracking_id}/status - Update parcel status."""
    status: str
    note: Optional[str] = None
    failure_reason: Optional[str] = None  # Required when status is "failed"


class DeliveryListItem(BaseModel):
    parcel_id: int
    tracking_number: str
    status: ParcelStatus
    pickup_address: str
    dropoff_address: str
    size: Optional[str] = None
    weight: float
    recipient_name: str
    recipient_phone: str
    assigned_at: datetime
    pickup_lat: Optional[float] = None
    pickup_lng: Optional[float] = None
    dropoff_lat: Optional[float] = None
    dropoff_lng: Optional[float] = None
    delivery_instructions: Optional[str] = None


class CourierLocationUpdateRequest(BaseModel):
    lat: float = Field(strict=True, ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(strict=True, ge=-180, le=180, allow_inf_nan=False)
    accuracy: Optional[float] = Field(
        default=None, strict=True, ge=0, allow_inf_nan=False
    )
    heading: Optional[float] = Field(
        default=None, strict=True, ge=0, le=360, allow_inf_nan=False
    )
    speed: Optional[float] = Field(
        default=None, strict=True, ge=0, allow_inf_nan=False
    )
    delivery_id: Optional[int] = Field(default=None, gt=0, alias="deliveryId")

    model_config = ConfigDict(populate_by_name=True)


class CourierLocationResponse(BaseModel):
    courier_id: int
    lat: float
    lng: float
    accuracy: Optional[float] = None
    heading: Optional[float] = None
    speed: Optional[float] = None
    updated_at: datetime
    active_delivery_id: Optional[int] = None


class CourierLocationUpdateResponse(BaseModel):
    location: CourierLocationResponse
    accepted: bool


class DeliveryDestination(BaseModel):
    address: str
    lat: Optional[float] = None
    lng: Optional[float] = None


class DeliveryTrackingResponse(BaseModel):
    delivery: DeliveryListItem
    courier_location: Optional[CourierLocationResponse] = None
    location_source: str
    next_destination: Optional[DeliveryDestination] = None
    next_action: str


class DeliveryStatusUpdateRequest(BaseModel):
    status: ParcelStatus
