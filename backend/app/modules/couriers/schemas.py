from datetime import date, datetime
from typing import Optional, List
import re
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator
from app.modules.couriers.models import CourierApprovalStatus


class CourierRegistrationRequest(BaseModel):
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    password: str = Field(min_length=10, max_length=128)
    confirm_password: str = Field(min_length=10, max_length=128)
    date_of_birth: date
    gender: str
    nic_number: str
    nationality: str = Field(min_length=2, max_length=80)
    phone: str
    alternative_phone: Optional[str] = None
    residential_address: str = Field(min_length=5, max_length=500)
    city: str = Field(min_length=2, max_length=120)
    district: str
    postal_code: Optional[str] = Field(default=None, max_length=12)
    vehicle_type: str
    license_plate: str = Field(min_length=3, max_length=50)
    vehicle_brand: str = Field(min_length=2, max_length=80)
    vehicle_model: str = Field(min_length=1, max_length=80)
    vehicle_color: str = Field(min_length=2, max_length=50)
    vehicle_year: int = Field(ge=1980, le=date.today().year + 1)
    driving_licence_number: str = Field(min_length=4, max_length=40)
    driving_licence_expiry: date
    emergency_contact_name: str = Field(min_length=2, max_length=255)
    emergency_contact_relationship: str = Field(min_length=2, max_length=80)
    emergency_contact_phone: str
    agree_terms: bool
    agree_privacy: bool
    confirm_accuracy: bool

    @field_validator("full_name", "nationality", "residential_address", "city", "vehicle_brand", "vehicle_model", "vehicle_color", "driving_licence_number", "emergency_contact_name", "emergency_contact_relationship")
    @classmethod
    def trim_text(cls, value: str) -> str:
        return value.strip()

    @field_validator("nic_number")
    @classmethod
    def validate_nic(cls, value: str) -> str:
        normalized = re.sub(r"\s+", "", value).upper()
        if not re.fullmatch(r"(?:\d{9}[VX]|\d{12})", normalized):
            raise ValueError("Enter a valid 9 digit NIC ending in V or X, or a 12 digit NIC.")
        return normalized

    @field_validator("phone", "alternative_phone", "emergency_contact_phone")
    @classmethod
    def validate_sri_lankan_phone(cls, value: Optional[str]) -> Optional[str]:
        if value is None or not value.strip():
            return None
        digits = re.sub(r"[\s()-]", "", value)
        if digits.startswith("+94"):
            digits = "0" + digits[3:]
        if not re.fullmatch(r"07\d{8}", digits):
            raise ValueError("Enter a valid Sri Lankan mobile number, such as 0771234567 or +94771234567.")
        return "+94" + digits[1:]

    @field_validator("gender")
    @classmethod
    def valid_gender(cls, value: str) -> str:
        if value not in {"female", "male", "non_binary", "prefer_not_to_say"}:
            raise ValueError("Choose a valid gender option.")
        return value

    @field_validator("district")
    @classmethod
    def valid_district(cls, value: str) -> str:
        districts = {"Ampara", "Anuradhapura", "Badulla", "Batticaloa", "Colombo", "Galle", "Gampaha", "Hambantota", "Jaffna", "Kalutara", "Kandy", "Kegalle", "Kilinochchi", "Kurunegala", "Mannar", "Matale", "Matara", "Monaragala", "Mullaitivu", "Nuwara Eliya", "Polonnaruwa", "Puttalam", "Ratnapura", "Trincomalee", "Vavuniya"}
        if value not in districts:
            raise ValueError("Choose a district in Sri Lanka.")
        return value

    @field_validator("vehicle_type")
    @classmethod
    def valid_vehicle_type(cls, value: str) -> str:
        if value not in {"motorcycle", "scooter", "three_wheeler", "car", "van"}:
            raise ValueError("Choose a supported vehicle type.")
        return value

    @field_validator("license_plate")
    @classmethod
    def normalize_license_plate(cls, value: str) -> str:
        return re.sub(r"\s+", "", value).upper()

    @model_validator(mode="after")
    def validate_registration(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match.")
        if not (re.search(r"[A-Z]", self.password) and re.search(r"[a-z]", self.password) and re.search(r"\d", self.password) and re.search(r"[^A-Za-z0-9]", self.password)):
            raise ValueError("Password must include uppercase, lowercase, number, and symbol characters.")
        today = date.today()
        age = today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        if age < 18:
            raise ValueError("You must be at least 18 years old to register.")
        if self.driving_licence_expiry <= today:
            raise ValueError("Your driving licence must not be expired.")
        if not (self.agree_terms and self.agree_privacy and self.confirm_accuracy):
            raise ValueError("All acknowledgements must be accepted before applying.")
        return self


class CourierRegistrationResponse(BaseModel):
    courier_id: int
    approval_status: CourierApprovalStatus
    message: str


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
