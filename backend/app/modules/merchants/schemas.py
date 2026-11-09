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
