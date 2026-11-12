from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, ConfigDict, field_validator
from app.modules.merchants.models import ApprovalStatus


# ---------------------------------------------------------------------------
# Base / shared fields
# ---------------------------------------------------------------------------

class MerchantBase(BaseModel):
    business_name: str
    registration_number: str
    contact_phone: str
    business_address: str
    business_type: Optional[str] = None
    website_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Public registration — one payload creates User + Merchant together
# ---------------------------------------------------------------------------

class MerchantRegisterRequest(MerchantBase):
    """Submitted by a new merchant on the public registration form."""
    email: EmailStr
    full_name: str
    password: str
    confirm_password: str

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class MerchantRegistrationResponse(BaseModel):
    """Returned immediately after a successful registration submission."""
    merchant_id: int
    message: str
    approval_status: ApprovalStatus

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Internal create (used by service, not exposed directly)
# ---------------------------------------------------------------------------

class MerchantCreate(MerchantBase):
    user_id: int


# ---------------------------------------------------------------------------
# Admin approval / rejection
# ---------------------------------------------------------------------------

class MerchantApprovalUpdate(BaseModel):
    status: ApprovalStatus
    rejection_reason: Optional[str] = None


# ---------------------------------------------------------------------------
# Partial update
# ---------------------------------------------------------------------------

class MerchantUpdate(BaseModel):
    business_name: Optional[str] = None
    contact_phone: Optional[str] = None
    business_address: Optional[str] = None
    business_type: Optional[str] = None
    website_url: Optional[str] = None


# ---------------------------------------------------------------------------
# Full response (returned to authenticated callers)
# ---------------------------------------------------------------------------

class MerchantResponse(MerchantBase):
    id: int
    user_id: int
    approval_status: ApprovalStatus
    rejection_reason: Optional[str] = None
    api_key: Optional[str] = None
    test_api_key: Optional[str] = None
    client_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Minimal status response (public — for applicants checking their status)
# ---------------------------------------------------------------------------

class MerchantStatusResponse(BaseModel):
    merchant_id: int
    business_name: str
    approval_status: ApprovalStatus
    rejection_reason: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# API Credentials & Security (Part 4)
# ---------------------------------------------------------------------------

class ApiCredentialsResponse(BaseModel):
    merchant_id: int
    business_name: str
    live_key: str
    test_key: str
    client_id: str
    client_secret: str
    rate_limit_per_day: int = 10000
    used_today: int = 42
    approval_status: ApprovalStatus

    model_config = ConfigDict(from_attributes=True)


class RegenerateKeyRequest(BaseModel):
    key_type: str = "live"  # "live", "test", or "secret"


class RegenerateKeyResponse(BaseModel):
    key_type: str
    new_key: str
    message: str


class OAuthTokenRequest(BaseModel):
    grant_type: str = "client_credentials"
    client_id: str
    client_secret: str


class OAuthTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int = 86400


class VerifyKeyRequest(BaseModel):
    api_key: str


class VerifyKeyResponse(BaseModel):
    valid: bool
    merchant_id: Optional[int] = None
    business_name: Optional[str] = None
    approval_status: Optional[str] = None
    key_mode: str = "live"
    message: str


# ---------------------------------------------------------------------------
# Deliveries / Orders created via secure API
# ---------------------------------------------------------------------------

class MerchantDeliveryCreate(BaseModel):
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    delivery_city: str
    weight_kg: float = 1.0
    dimensions: Optional[str] = None
    cod_amount: float = 0.0
    special_instructions: Optional[str] = None


class MerchantDeliveryResponse(BaseModel):
    tracking_number: str
    status: str
    recipient_name: str
    recipient_phone: str
    delivery_address: str
    delivery_city: str
    weight_kg: float
    cod_amount: float
    special_instructions: Optional[str] = None
    created_at: str
