from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from app.modules.users.models import UserRole


class AdminUserUpdate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    role: UserRole
    vehicle_type: str = Field(default="motorcycle", min_length=1, max_length=50)
    license_plate: Optional[str] = Field(default=None, max_length=50)
    business_name: Optional[str] = Field(default=None, max_length=255)
    registration_number: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=32)
    business_address: Optional[str] = Field(default=None, max_length=255)


class AdminUserCreate(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str
    is_active: bool = True
    phone: Optional[str] = None
    vehicle_type: Optional[str] = "motorcycle"
    license_plate: Optional[str] = None
    business_name: Optional[str] = None
    registration_number: Optional[str] = None
    business_address: Optional[str] = None


class AdminStats(BaseModel):
    active_deliveries: int
    total_deliveries: int
    registered_merchants: int
    pending_merchants: int
    active_couriers: int
    total_couriers: int
    total_users: int
    gmv_revenue: float


class RecentActivityItem(BaseModel):
    id: str
    action: str
    subject: str
    time: str
    type: str  # merchant, courier, parcel, zone, dispatcher
    status: str
    tone: str  # success, warning, info, neutral


class AdminZoneLoadItem(BaseModel):
    id: int
    name: str
    code: str
    activeCouriers: int
    pendingParcels: int
    status: str
    surgeMultiplier: float
    baseFee: float
    currency: str


class AdminDashboardResponse(BaseModel):
    stats: AdminStats
    recent_activity: List[RecentActivityItem]
    zone_loads: List[AdminZoneLoadItem]


class AdminUserItem(BaseModel):
    id: int
    display_id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    status: str  # Active, Suspended, Inactive
    is_active: bool
    joined: str
    created_at: datetime
    deliveries: int


class AdminCourierItem(BaseModel):
    id: int
    display_id: str
    name: str
    email: str
    phone: Optional[str] = None
    vehicle_type: str
    license_plate: Optional[str] = None
    zone: str
    status: str  # Available, In Delivery, Offline
    is_available: bool
    rating: float
    completed_trips: int
    active_order: Optional[str] = None


class AdminDispatcherItem(BaseModel):
    id: int
    display_id: str
    name: str
    email: str
    phone: Optional[str] = None
    hub: str
    assigned_couriers: int
    shift: str
    status: str
    incidents_handled: int


class AdminMerchantItem(BaseModel):
    id: int
    display_id: str
    user_id: int
    business_name: str
    owner_name: str
    email: str
    registration_number: str
    contact_phone: str
    business_address: str
    business_type: Optional[str] = None
    website_url: Optional[str] = None
    approval_status: str
    rejection_reason: Optional[str] = None
    api_key: Optional[str] = None
    submitted: str
    created_at: datetime


class AdminAnalyticsResponse(BaseModel):
    total_parcels: int
    delivered_count: int
    in_transit_count: int
    pending_count: int
    cancelled_count: int
    total_revenue: float
    completion_rate: float
    avg_delivery_mins: int
    zone_volume: List[dict]
    status_breakdown: List[dict]

