from datetime import datetime
from typing import Optional, List, Literal
from pydantic import BaseModel, ConfigDict, Field, field_validator


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


class DeliveryProof(BaseModel):
    secure_url: str
    public_id: str


class DeliveryResult(BaseModel):
    outcome: Literal["delivered", "failed"]
    recorded_at: str
    recipient_name: Optional[str] = None
    failure_reason: Optional[str] = None
    note: Optional[str] = None


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
    delivery_proof: Optional[DeliveryProof] = None
    delivery_result: Optional[DeliveryResult] = None
    proof_cleanup_pending: bool = False


class SuccessfulDeliveryRequest(BaseModel):
    recipient_name: str = Field(min_length=1, max_length=255)
    confirmed: bool

    @field_validator("recipient_name")
    @classmethod
    def recipient_name_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("recipient_name is required")
        return value


class FailedDeliveryRequest(BaseModel):
    failure_reason: str = Field(min_length=1, max_length=100)
    note: Optional[str] = Field(default=None, max_length=2000)
    confirmed: bool

    @field_validator("failure_reason")
    @classmethod
    def failure_reason_not_blank(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("failure_reason is required")
        return value


class ParcelStatusUpdateRequest(BaseModel):
    """PATCH /courier/parcels/{tracking_id}/status - Update parcel status."""
    status: str
    note: Optional[str] = None
    failure_reason: Optional[str] = None  # Required when status is "failed"


class DeliveryProofResponse(BaseModel):
    secure_url: str
    public_id: str
    parcel: ParcelDetailResponse
