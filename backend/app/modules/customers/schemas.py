from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class CustomerBase(BaseModel):
    phone: str
    default_address: str
    city: str
    postal_code: str
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    user_id: int


class CustomerUpdate(BaseModel):
    phone: Optional[str] = None
    default_address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(CustomerBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ── Customer Dashboard Schemas ─────────────────────────────────────


class CustomerMeResponse(BaseModel):
    """GET /customer/me - Customer profile for the authenticated user."""
    id: int
    full_name: str
    email: str
    phone: str
    role: str = "customer"
    default_address: str
    city: str
    postal_code: str


class CustomerProfileUpdateRequest(BaseModel):
    """PUT /customer/me - Update profile fields."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=150)
    phone: Optional[str] = Field(None, min_length=7, max_length=30)
    default_address: Optional[str] = Field(None, min_length=3, max_length=255)
    city: Optional[str] = Field(None, min_length=2, max_length=100)
    postal_code: Optional[str] = Field(None, min_length=3, max_length=20)


class CustomerDashboardTotals(BaseModel):
    """Order and delivery counts summary."""
    total_orders: int
    active_deliveries: int  # picked_up + in_transit + out_for_delivery
    delivered: int
    pending: int
    cancelled: int


class CustomerDashboardKPI(BaseModel):
    """Key performance indicator with delta percentage."""
    key: str
    value: int
    delta_pct: int


class CustomerWeeklyOrder(BaseModel):
    """Daily orders count for the bar chart."""
    date: str  # ISO 8601 date
    orders: int


class CustomerDashboardSummaryResponse(BaseModel):
    """GET /customer/dashboard/summary - Dashboard metrics."""
    greeting: Optional[str] = None
    totals: CustomerDashboardTotals
    kpis: List[CustomerDashboardKPI]
    weekly_orders: List[CustomerWeeklyOrder]


class CustomerParcelListItem(BaseModel):
    """Parcel item for customer dashboard list view."""
    tracking_id: str
    recipient_name: str
    destination: str
    status: str
    created_at: str  # ISO 8601 with timezone
    estimated_fee: float
    weight_kg: float
    eta: Optional[str] = None


class CustomerParcelListResponse(BaseModel):
    """GET /customer/parcels - Paginated list of customer parcels."""
    items: List[CustomerParcelListItem]
    total: int


class CustomerTimelineEvent(BaseModel):
    """Timeline event in delivery history."""
    status: str
    label: str
    occurred_at: str  # ISO 8601 with timezone
    location: Optional[str] = None


class CustomerParcelDetailResponse(BaseModel):
    """GET /customer/parcels/{tracking_id} - Full parcel details for customer."""
    tracking_id: str
    recipient_name: str
    recipient_phone_masked: str
    sender_name: str
    delivery_address: str
    delivery_city: str
    pickup_address: str
    pickup_city: str
    status: str
    created_at: str  # ISO 8601 with timezone
    eta: Optional[str] = None
    fee: float
    weight_kg: float
    dimensions: Optional[str] = None
    special_instructions: Optional[str] = None
    notes: List[str] = Field(default_factory=list)
    timeline: List[CustomerTimelineEvent]


class CustomerCancelParcelRequest(BaseModel):
    """POST /customer/parcels/{tracking_id}/cancel - Cancel pending delivery."""
    reason: Optional[str] = None


class CustomerCreateParcelRequest(BaseModel):
    """POST /customer/parcels - Create a new customer shipment."""
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    delivery_city: str
    pickup_address: Optional[str] = None
    pickup_city: Optional[str] = None
    weight_kg: float = 1.0
    dimensions: Optional[str] = None
    special_instructions: Optional[str] = None
    fee: Optional[float] = None


# ── Customer Address Schemas ───────────────────────────────────────


class CustomerAddressBase(BaseModel):
    """Base schema for customer saved addresses."""
    address_type: str = "pickup"  # "pickup" | "dropoff"
    label: str
    custom_name: Optional[str] = None
    address: str
    city: str
    postal_code: str
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    is_default: bool = False


class CustomerAddressCreate(CustomerAddressBase):
    """Payload to create a new saved address."""
    pass


class CustomerAddressUpdate(BaseModel):
    """Payload to update an existing saved address."""
    address_type: Optional[str] = None
    label: Optional[str] = None
    custom_name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    contact_name: Optional[str] = None
    phone: Optional[str] = None
    is_default: Optional[bool] = None


class CustomerAddressResponse(CustomerAddressBase):
    """Full saved address response."""
    id: int
    customer_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

