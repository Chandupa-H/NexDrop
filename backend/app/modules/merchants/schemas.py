from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, EmailStr, ConfigDict, Field, field_validator
from app.modules.merchants.models import ApprovalStatus


# ---------------------------------------------------------------------------
# Base / shared merchant fields
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
    password: Optional[str] = None
    confirm_password: Optional[str] = None
    role_designation: Optional[str] = None
    direct_phone: Optional[str] = None

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: Optional[str], info) -> Optional[str]:
        pwd = info.data.get("password")
        if v and pwd and v != pwd:
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


# ===========================================================================
# Merchant Portal Dashboard & Orders Schemas
# ===========================================================================

class MerchantOrderBase(BaseModel):
    recipient_name: str = Field(..., alias="recipientName")
    recipient_phone: str = Field(..., alias="recipientPhone")
    delivery_address: str = Field(..., alias="deliveryAddress")
    delivery_city: str = Field(..., alias="deliveryCity")
    weight_kg: float = Field(default=1.0, alias="weightKg")
    dimensions: Optional[str] = "20x15x10 cm"
    cod_amount: float = Field(default=0.0, alias="codAmount")
    is_prepaid: bool = Field(default=False, alias="isPrepaid")
    special_instructions: Optional[str] = Field(default=None, alias="specialInstructions")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class MerchantOrderCreate(MerchantOrderBase):
    """Payload to create a new delivery order from the merchant dashboard."""
    sender_id: Optional[int] = None


class MerchantOrderResponse(BaseModel):
    """Full order object matching frontend MerchantOrder interface."""
    id: str
    tracking_number: str = Field(..., alias="trackingNumber", serialization_alias="trackingNumber")
    recipient_name: str = Field(..., alias="recipientName", serialization_alias="recipientName")
    recipient_phone: str = Field(..., alias="recipientPhone", serialization_alias="recipientPhone")
    delivery_address: str = Field(..., alias="deliveryAddress", serialization_alias="deliveryAddress")
    delivery_city: str = Field(..., alias="deliveryCity", serialization_alias="deliveryCity")
    status: str
    weight_kg: float = Field(..., alias="weightKg", serialization_alias="weightKg")
    dimensions: Optional[str] = None
    cod_amount: float = Field(default=0.0, alias="codAmount", serialization_alias="codAmount")
    is_prepaid: bool = Field(default=False, alias="isPrepaid", serialization_alias="isPrepaid")
    estimated_delivery: str = Field(..., alias="estimatedDelivery", serialization_alias="estimatedDelivery")
    created_at: str = Field(..., alias="createdAt", serialization_alias="createdAt")
    special_instructions: Optional[str] = Field(default=None, alias="specialInstructions", serialization_alias="specialInstructions")
    failure_reason: Optional[str] = Field(default=None, alias="failureReason", serialization_alias="failureReason")
    courier_name: Optional[str] = Field(default=None, alias="courierName", serialization_alias="courierName")
    courier_phone: Optional[str] = Field(default=None, alias="courierPhone", serialization_alias="courierPhone")

    model_config = ConfigDict(populate_by_name=True, from_attributes=True)


class MerchantOrderStatusUpdate(BaseModel):
    status: str
    failure_reason: Optional[str] = None
    courier_name: Optional[str] = None
    courier_phone: Optional[str] = None


class MerchantKpisResponse(BaseModel):
    """KPI summary matching frontend MerchantKpis interface."""
    total_orders: int = Field(..., alias="totalOrders", serialization_alias="totalOrders")
    in_transit: int = Field(..., alias="inTransit", serialization_alias="inTransit")
    out_for_delivery: int = Field(..., alias="outForDelivery", serialization_alias="outForDelivery")
    delivered: int = Field(..., alias="delivered", serialization_alias="delivered")
    failed: int = Field(..., alias="failed", serialization_alias="failed")
    pending_cod: float = Field(..., alias="pendingCod", serialization_alias="pendingCod")
    success_rate: int = Field(..., alias="successRate", serialization_alias="successRate")

    model_config = ConfigDict(populate_by_name=True)


class ApiCredentialsResponse(BaseModel):
    """API & OAuth credentials matching frontend ApiCredentials interface."""
    merchant_id: str = Field(..., alias="merchantId", serialization_alias="merchantId")
    business_name: str = Field(..., alias="businessName", serialization_alias="businessName")
    live_key: str = Field(..., alias="liveKey", serialization_alias="liveKey")
    test_key: str = Field(..., alias="testKey", serialization_alias="testKey")
    client_id: str = Field(..., alias="clientId", serialization_alias="clientId")
    client_secret: str = Field(..., alias="clientSecret", serialization_alias="clientSecret")
    rate_limit_per_day: int = Field(..., alias="rateLimitPerDay", serialization_alias="rateLimitPerDay")
    used_today: int = Field(..., alias="usedToday", serialization_alias="usedToday")

    model_config = ConfigDict(populate_by_name=True)


class RegenerateKeyRequest(BaseModel):
    key_type: str = "live"  # "live" | "test"


class WebhookConfigResponse(BaseModel):
    """Webhook config matching frontend WebhookConfig interface."""
    target_url: str = Field(..., alias="targetUrl", serialization_alias="targetUrl")
    secret_key: str = Field(..., alias="secretKey", serialization_alias="secretKey")
    is_active: bool = Field(..., alias="isActive", serialization_alias="isActive")
    subscribed_events: List[str] = Field(..., alias="subscribedEvents", serialization_alias="subscribedEvents")

    model_config = ConfigDict(populate_by_name=True)


class WebhookConfigUpdate(BaseModel):
    target_url: Optional[str] = Field(default=None, alias="targetUrl")
    secret_key: Optional[str] = Field(default=None, alias="secretKey")
    is_active: Optional[bool] = Field(default=None, alias="isActive")
    subscribed_events: Optional[List[str]] = Field(default=None, alias="subscribedEvents")

    model_config = ConfigDict(populate_by_name=True)


class WebhookDeliveryLogResponse(BaseModel):
    """Webhook delivery attempt log matching frontend WebhookDeliveryLog interface."""
    id: str
    event: str
    tracking_number: str = Field(..., alias="trackingNumber", serialization_alias="trackingNumber")
    status: int
    status_text: str = Field(..., alias="statusText", serialization_alias="statusText")
    timestamp: str
    duration_ms: int = Field(..., alias="durationMs", serialization_alias="durationMs")
    payload_summary: str = Field(..., alias="payloadSummary", serialization_alias="payloadSummary")

    model_config = ConfigDict(populate_by_name=True)


class WebhookTestRequest(BaseModel):
    event_type: str = "order.in_transit"
    tracking_number: Optional[str] = None


class WebhookTestResponse(BaseModel):
    log: WebhookDeliveryLogResponse
    message: str


class MerchantDashboardSummaryResponse(BaseModel):
    merchant_id: str = Field(..., alias="merchantId", serialization_alias="merchantId")
    business_name: str = Field(..., alias="businessName", serialization_alias="businessName")
    kpis: MerchantKpisResponse
    recent_orders: List[MerchantOrderResponse] = Field(..., alias="recentOrders", serialization_alias="recentOrders")
    credentials: ApiCredentialsResponse
    webhook_config: WebhookConfigResponse = Field(..., alias="webhookConfig", serialization_alias="webhookConfig")

    model_config = ConfigDict(populate_by_name=True)
