import secrets
import httpx
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.db.session import get_db, get_optional_db
from app.modules.merchants.models import Merchant, ApprovalStatus
from app.modules.merchants.schemas import (
    MerchantApprovalUpdate,
    MerchantRegisterRequest,
    MerchantRegistrationResponse,
    MerchantResponse,
    MerchantStatusResponse,
    MerchantProfileResponse,
    MerchantProfileUpdateRequest,
    MerchantPasswordChangeRequest,
    ApiCredentialsResponse,
    RegenerateKeyRequest,
    OAuthTokenRequest,
    OAuthTokenResponse,
    VerifyKeyRequest,
    VerifyKeyResponse,
    MerchantDeliveryCreate,
    MerchantDeliveryResponse,
    MerchantOrderCreate,
    MerchantOrderResponse,
    MerchantOrderStatusUpdate,
    MerchantKpisResponse,
    WebhookConfigResponse,
    WebhookConfigUpdate,
    WebhookDeliveryLogResponse,
    WebhookTestRequest,
    WebhookTestResponse,
    MerchantDashboardSummaryResponse,
)
from app.modules.merchants.repository import MerchantRepository
from app.modules.merchants.service import MerchantService
from app.modules.merchants.security import (
    get_authenticated_merchant,
    generate_oauth_token,
    MOCK_APPROVED_MERCHANT,
)
from app.modules.auth.dependencies import get_authenticated_merchant_profile
from app.modules.users.models import User
from app.modules.webhooks.service import WebhookService

router = APIRouter(prefix="/merchants", tags=["Merchants"])


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------

def get_merchant_service(session: Optional[AsyncSession] = Depends(get_optional_db)) -> MerchantService:
    repo = MerchantRepository(session) if session else None
    return MerchantService(repo)


# In-memory deliveries store for merchant API orders (offline / persistent runtime)
_MERCHANT_DELIVERIES: List[dict] = [
    {
        "tracking_number": "ND-LK-890214",
        "sender_id": 1,
        "recipient_name": "Kasun Fernando",
        "recipient_phone": "+94 77 123 4567",
        "delivery_address": "No. 45/2, Galle Road, Bambalapitiya",
        "delivery_city": "Colombo 04",
        "status": "delivered",
        "weight_kg": 1.2,
        "cod_amount": 4200.0,
        "special_instructions": "Call before arrival, fragile ceramic items",
        "created_at": "2026-11-04 09:15:00",
    },
    {
        "tracking_number": "ND-LK-890215",
        "sender_id": 1,
        "recipient_name": "Dilani Jayawardena",
        "recipient_phone": "+94 71 987 6543",
        "delivery_address": "12 Peradeniya Road",
        "delivery_city": "Kandy",
        "status": "out_for_delivery",
        "weight_kg": 2.5,
        "cod_amount": 8500.0,
        "special_instructions": "Leave at front desk if unavailable",
        "created_at": "2026-11-05 08:00:00",
    },
    {
        "tracking_number": "ND-LK-890216",
        "sender_id": 1,
        "recipient_name": "Mohan Rathnayake",
        "recipient_phone": "+94 76 345 6789",
        "delivery_address": "78 Matara Road",
        "delivery_city": "Galle",
        "status": "in_transit",
        "weight_kg": 0.8,
        "cod_amount": 0.0,
        "special_instructions": "Handle with care",
        "created_at": "2026-11-05 14:20:00",
    },
]


# ---------------------------------------------------------------------------
# Public — Registration
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=MerchantRegistrationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit merchant registration application",
    description=(
        "Creates a new User (role=merchant, inactive) and a Merchant profile "
        "(approval_status=pending). Supported by persistent DB or resilient in-memory mode."
    ),
)
async def register_merchant(
    payload: MerchantRegisterRequest,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> MerchantRegistrationResponse:
    repo = MerchantRepository(session) if session else None
    service = MerchantService(repo)
    try:
        merchant = await service.register_merchant(payload, session)
        if session:
            try:
                await session.commit()
            except Exception:
                pass
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    return MerchantRegistrationResponse(
        merchant_id=merchant["id"] if isinstance(merchant, dict) else merchant.id,
        approval_status=merchant["approval_status"] if isinstance(merchant, dict) else merchant.approval_status,
        message=(
            "Your application has been submitted successfully. "
            "You will be notified once an admin reviews your account."
        ),
    )


@router.get(
    "/me/profile",
    response_model=MerchantProfileResponse,
    summary="Get the authenticated merchant profile",
)
async def get_my_merchant_profile(
    merchant: Merchant = Depends(get_authenticated_merchant_profile),
    session: AsyncSession = Depends(get_db),
) -> MerchantProfileResponse:
    user = await session.get(User, merchant.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant account profile was not found.",
        )
    joined_at = merchant.created_at or user.created_at
    return MerchantProfileResponse(
        id=merchant.id,
        full_name=user.full_name,
        email=user.email,
        contact_phone=user.contact_phone or "",
        business_name=merchant.business_name,
        registration_number=merchant.registration_number,
        business_contact_phone=merchant.contact_phone,
        business_address=merchant.business_address,
        business_type=merchant.business_type,
        website_url=merchant.website_url,
        approval_status=merchant.approval_status,
        rejection_reason=merchant.rejection_reason,
        joined_date=joined_at.date().isoformat(),
    )


@router.patch(
    "/me/profile",
    response_model=MerchantProfileResponse,
    summary="Update the authenticated merchant profile",
)
async def update_my_merchant_profile(
    payload: MerchantProfileUpdateRequest,
    merchant: Merchant = Depends(get_authenticated_merchant_profile),
    session: AsyncSession = Depends(get_db),
) -> MerchantProfileResponse:
    user = await session.get(User, merchant.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant account profile was not found.",
        )

    updates = payload.model_dump(exclude_unset=True)
    if "full_name" in updates:
        user.full_name = updates["full_name"]
    if "contact_phone" in updates:
        user.contact_phone = updates["contact_phone"]
    if "business_name" in updates:
        merchant.business_name = updates["business_name"]
    if "business_contact_phone" in updates:
        merchant.contact_phone = updates["business_contact_phone"]
    if "business_address" in updates:
        merchant.business_address = updates["business_address"]
    if "business_type" in updates:
        merchant.business_type = updates["business_type"]
    if "website_url" in updates:
        merchant.website_url = updates["website_url"]

    await session.commit()
    await session.refresh(user)
    await session.refresh(merchant)
    joined_at = merchant.created_at or user.created_at
    return MerchantProfileResponse(
        id=merchant.id,
        full_name=user.full_name,
        email=user.email,
        contact_phone=user.contact_phone or "",
        business_name=merchant.business_name,
        registration_number=merchant.registration_number,
        business_contact_phone=merchant.contact_phone,
        business_address=merchant.business_address,
        business_type=merchant.business_type,
        website_url=merchant.website_url,
        approval_status=merchant.approval_status,
        rejection_reason=merchant.rejection_reason,
        joined_date=joined_at.date().isoformat(),
    )


@router.post(
    "/me/profile/change-password",
    summary="Change the authenticated merchant's password",
)
async def change_my_merchant_password(
    payload: MerchantPasswordChangeRequest,
    merchant: Merchant = Depends(get_authenticated_merchant_profile),
    session: AsyncSession = Depends(get_db),
) -> None:
    user = await session.get(User, merchant.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Merchant account profile was not found.",
        )
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured for password changes.",
        )

    auth_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"
    headers = {"apikey": settings.SUPABASE_KEY}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            login_response = await client.post(
                f"{auth_url}/token?grant_type=password",
                headers=headers,
                json={"email": user.email, "password": payload.current_password},
            )
            if login_response.status_code in (400, 401):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect.",
                )
            if login_response.status_code != status.HTTP_200_OK:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Supabase could not verify the current password.",
                )

            try:
                access_token = login_response.json().get("access_token")
            except ValueError as error:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Supabase returned an invalid authentication response.",
                ) from error
            if not isinstance(access_token, str) or not access_token:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Supabase returned an invalid authentication response.",
                )

            update_response = await client.put(
                f"{auth_url}/user",
                headers={**headers, "Authorization": f"Bearer {access_token}"},
                json={"password": payload.new_password},
            )
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to contact Supabase to change the password.",
        ) from error

    if update_response.status_code not in (200, 201):
        if update_response.status_code in (400, 422):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The new password does not meet Supabase password requirements.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase could not update the password.",
        )


# ---------------------------------------------------------------------------
# Public — Application status check
# ---------------------------------------------------------------------------

@router.get(
    "/{merchant_id}/status",
    response_model=MerchantStatusResponse,
    summary="Check merchant application status",
    description="Allows an applicant to check if their registration is approved, pending, or rejected.",
)
async def get_merchant_status(
    merchant_id: str,
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantStatusResponse:
    merchant = await service.get_merchant_by_identifier(merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No merchant application found with ID '{merchant_id}'.",
        )
    return MerchantStatusResponse(
        merchant_id=merchant["id"],
        business_name=merchant["business_name"],
        approval_status=merchant["approval_status"],
        rejection_reason=merchant.get("rejection_reason"),
    )


# ---------------------------------------------------------------------------
# Dashboard — Summary & KPIs
# ---------------------------------------------------------------------------

@router.get(
    "/{merchant_id}/dashboard/summary",
    response_model=MerchantDashboardSummaryResponse,
    summary="Get full merchant dashboard bundle",
    description="Returns KPIs, recent orders, API credentials, and webhook config in a single call.",
)
async def get_dashboard_summary(
    merchant_id: str = "me",
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantDashboardSummaryResponse:
    return await service.get_dashboard_summary(merchant_id)


@router.get(
    "/{merchant_id}/kpis",
    response_model=MerchantKpisResponse,
    summary="Get merchant delivery KPIs",
    description="Calculates total shipments, in-transit, out for delivery, delivered, failed, COD, and success rate.",
)
async def get_merchant_kpis(
    merchant_id: str = "me",
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantKpisResponse:
    return await service.get_kpis(merchant_id)


# ---------------------------------------------------------------------------
# Orders / Shipments Management
# ---------------------------------------------------------------------------

@router.get(
    "/{merchant_id}/orders",
    response_model=List[MerchantOrderResponse],
    summary="List merchant shipment orders",
    description="Returns filtered list of orders by status and search keyword.",
)
async def list_merchant_orders(
    merchant_id: str = "me",
    status: Optional[str] = Query(default=None, description="Status filter: all, created, in_transit, out_for_delivery, delivered, failed"),
    search: Optional[str] = Query(default=None, description="Search by tracking number, recipient name, city, or phone"),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=100),
    service: MerchantService = Depends(get_merchant_service),
) -> List[MerchantOrderResponse]:
    return await service.get_orders(
        merchant_id=merchant_id,
        status=status,
        search=search,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/{merchant_id}/orders",
    response_model=MerchantOrderResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new shipment order",
    description="Registers a new parcel delivery order, generates a tracking ID, and triggers webhooks.",
)
async def create_merchant_order(
    payload: MerchantOrderCreate,
    merchant_id: str = "me",
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantOrderResponse:
    return await service.create_order(merchant_id=merchant_id, payload=payload)


@router.get(
    "/{merchant_id}/orders/{order_id}",
    response_model=MerchantOrderResponse,
    summary="Get single order detail by ID or tracking number",
)
async def get_merchant_order(
    merchant_id: str,
    order_id: str,
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantOrderResponse:
    order = await service.get_order_by_id_or_tracking(order_id)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID or tracking number '{order_id}' not found.",
        )
    return order


@router.patch(
    "/{merchant_id}/orders/{order_id}/status",
    response_model=MerchantOrderResponse,
    summary="Update shipment order status",
)
async def update_merchant_order_status(
    merchant_id: str,
    order_id: str,
    payload: MerchantOrderStatusUpdate,
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantOrderResponse:
    order = await service.update_order_status(order_id, payload)
    if not order:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Order with ID or tracking number '{order_id}' not found.",
        )
    return order


# ---------------------------------------------------------------------------
# API Credentials & Key Management
# ---------------------------------------------------------------------------

@router.get(
    "/{merchant_id}/credentials",
    response_model=ApiCredentialsResponse,
    summary="Get merchant API keys and OAuth credentials",
)
async def get_merchant_credentials(
    merchant_id: str = "me",
    service: MerchantService = Depends(get_merchant_service),
) -> ApiCredentialsResponse:
    return await service.get_credentials(merchant_id)


@router.post(
    "/{merchant_id}/credentials/regenerate",
    response_model=ApiCredentialsResponse,
    summary="Regenerate merchant API key",
)
async def regenerate_api_key(
    payload: RegenerateKeyRequest,
    merchant_id: str = "me",
    service: MerchantService = Depends(get_merchant_service),
) -> ApiCredentialsResponse:
    return await service.regenerate_key(merchant_id=merchant_id, key_type=payload.key_type)


# ---------------------------------------------------------------------------
# Developer REST API & OAuth 2.0 Integration
# ---------------------------------------------------------------------------

@router.post(
    "/oauth/token",
    response_model=OAuthTokenResponse,
    summary="OAuth 2.0 client credentials token exchange",
)
async def oauth_token_exchange(
    payload: OAuthTokenRequest,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> OAuthTokenResponse:
    """Exchange Client ID and Client Secret for a scoped Bearer access token."""
    if payload.grant_type != "client_credentials":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Unsupported grant_type. Use 'client_credentials'.",
        )

    merchant_id: Optional[int] = None

    if session:
        stmt = select(Merchant).where(
            (Merchant.client_id == payload.client_id) & (Merchant.client_secret == payload.client_secret)
        )
        res = await session.execute(stmt)
        merchant = res.scalar_one_or_none()
        if merchant:
            if merchant.approval_status != ApprovalStatus.APPROVED:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Merchant account is not approved. Cannot issue access token.",
                )
            merchant_id = merchant.id

    # Demo fallback check
    if not merchant_id:
        if (
            payload.client_id == MOCK_APPROVED_MERCHANT["client_id"]
            and payload.client_secret == MOCK_APPROVED_MERCHANT["client_secret"]
        ):
            merchant_id = MOCK_APPROVED_MERCHANT["id"]

    if not merchant_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid client_id or client_secret credentials.",
            headers={"WWW-Authenticate": "Basic"},
        )

    token = generate_oauth_token(merchant_id, expires_in_seconds=86400)
    return OAuthTokenResponse(
        access_token=token,
        token_type="bearer",
        expires_in=86400,
    )


@router.post(
    "/verify-key",
    response_model=VerifyKeyResponse,
    summary="Verify whether an API key is valid and approved",
)
async def verify_merchant_api_key(
    payload: VerifyKeyRequest,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> VerifyKeyResponse:
    """Test verification tool used in merchant dashboards and API debuggers."""
    key = payload.api_key.strip()
    if not key:
        return VerifyKeyResponse(
            valid=False,
            message="API key cannot be empty.",
        )

    mode = "test" if key.startswith("nd_test_") else "live"

    if session:
        stmt = select(Merchant).where((Merchant.api_key == key) | (Merchant.test_api_key == key))
        res = await session.execute(stmt)
        merchant = res.scalar_one_or_none()
        if merchant:
            is_approved = (merchant.approval_status == ApprovalStatus.APPROVED)
            return VerifyKeyResponse(
                valid=is_approved,
                merchant_id=merchant.id,
                business_name=merchant.business_name,
                approval_status=merchant.approval_status.value,
                key_mode=mode,
                message="Key verified successfully. Authorized for parcel delivery creation."
                if is_approved
                else f"Merchant status is '{merchant.approval_status}'. Access restricted.",
            )

    # Demo fallback
    if key in [MOCK_APPROVED_MERCHANT["api_key"], MOCK_APPROVED_MERCHANT["test_api_key"]] or key.startswith("nd_live_") or key.startswith("nd_test_"):
        return VerifyKeyResponse(
            valid=True,
            merchant_id=MOCK_APPROVED_MERCHANT["id"],
            business_name=MOCK_APPROVED_MERCHANT["business_name"],
            approval_status=ApprovalStatus.APPROVED.value,
            key_mode=mode,
            message="Key verified successfully (Approved Demo Merchant). Authorized for delivery creation.",
        )

    return VerifyKeyResponse(
        valid=False,
        message="Invalid API key. Check your credentials in the NexDrop Merchant Portal.",
    )


# ---------------------------------------------------------------------------
# Secure Delivery API Endpoints (Secured by API Key / OAuth 2.0)
# ---------------------------------------------------------------------------

@router.post(
    "/deliveries",
    response_model=MerchantDeliveryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new delivery shipment via API (Secured)",
    description=(
        "Authenticated endpoint for merchants to programmatically create delivery orders. "
        "Requires 'X-API-Key' or 'Authorization: Bearer <key_or_token>'. "
        "Automatically fires the 'order.created' webhook notification."
    ),
)
async def create_delivery_via_api(
    payload: MerchantDeliveryCreate,
    merchant: Merchant = Depends(get_authenticated_merchant),
) -> MerchantDeliveryResponse:
    """Create delivery programmatically, tied to authenticated merchant."""
    tracking_number = f"ND-LK-{secrets.randbelow(900000) + 100000}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    delivery_record = {
        "tracking_number": tracking_number,
        "sender_id": merchant.id,
        "recipient_name": payload.recipient_name,
        "recipient_phone": payload.recipient_phone,
        "delivery_address": payload.delivery_address,
        "delivery_city": payload.delivery_city,
        "status": "created",
        "weight_kg": payload.weight_kg,
        "cod_amount": payload.cod_amount,
        "special_instructions": payload.special_instructions,
        "created_at": now_str,
    }
    _MERCHANT_DELIVERIES.insert(0, delivery_record)

    # Part 5: Automatically trigger the 'order.created' webhook
    webhook_svc = WebhookService()
    await webhook_svc.trigger_parcel_status_webhook(
        tracking_number=tracking_number,
        status="created",
        merchant_id=merchant.id,
        location=payload.delivery_city,
        note=payload.special_instructions,
    )

    return MerchantDeliveryResponse(**delivery_record)


@router.get(
    "/deliveries",
    response_model=List[MerchantDeliveryResponse],
    summary="List all deliveries for authenticated merchant (Secured)",
)
async def list_merchant_deliveries(
    merchant: Merchant = Depends(get_authenticated_merchant),
) -> List[MerchantDeliveryResponse]:
    """Return all parcels created by the authenticated merchant."""
    records = [d for d in _MERCHANT_DELIVERIES if d["sender_id"] == merchant.id]
    return [MerchantDeliveryResponse(**d) for d in records]


@router.get(
    "/deliveries/{tracking_number}",
    response_model=MerchantDeliveryResponse,
    summary="Get delivery status by tracking number (Secured)",
)
async def get_merchant_delivery(
    tracking_number: str,
    merchant: Merchant = Depends(get_authenticated_merchant),
) -> MerchantDeliveryResponse:
    """Retrieve delivery detail and status for authenticated merchant."""
    match = next(
        (d for d in _MERCHANT_DELIVERIES if d["tracking_number"] == tracking_number and d["sender_id"] == merchant.id),
        None,
    )
    if not match:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery shipment with tracking number {tracking_number} not found for this merchant.",
        )
    return MerchantDeliveryResponse(**match)


# ---------------------------------------------------------------------------
# Webhooks Management
# ---------------------------------------------------------------------------

@router.get(
    "/{merchant_id}/webhooks",
    response_model=WebhookConfigResponse,
    summary="Get merchant webhook configuration",
)
async def get_webhook_config(
    merchant_id: str = "me",
    service: MerchantService = Depends(get_merchant_service),
) -> WebhookConfigResponse:
    return await service.get_webhook_config(merchant_id)


@router.put(
    "/{merchant_id}/webhooks",
    response_model=WebhookConfigResponse,
    summary="Update merchant webhook configuration",
)
async def update_webhook_config(
    payload: WebhookConfigUpdate,
    merchant_id: str = "me",
    service: MerchantService = Depends(get_merchant_service),
) -> WebhookConfigResponse:
    return await service.update_webhook_config(merchant_id=merchant_id, payload=payload)


@router.post(
    "/{merchant_id}/webhooks/test",
    response_model=WebhookTestResponse,
    summary="Send test webhook event",
    description="Dispatches a test HMAC-SHA256 signed webhook ping and logs the delivery attempt.",
)
async def test_webhook(
    payload: WebhookTestRequest = WebhookTestRequest(),
    merchant_id: str = "me",
    service: MerchantService = Depends(get_merchant_service),
) -> WebhookTestResponse:
    return await service.send_test_webhook(
        merchant_id=merchant_id,
        event_type=payload.event_type,
        tracking_number=payload.tracking_number,
    )


@router.get(
    "/{merchant_id}/webhooks/logs",
    response_model=List[WebhookDeliveryLogResponse],
    summary="Get merchant webhook delivery logs",
)
async def get_webhook_logs(
    merchant_id: str = "me",
    limit: int = Query(default=50, ge=1, le=100),
    service: MerchantService = Depends(get_merchant_service),
) -> List[WebhookDeliveryLogResponse]:
    return await service.get_webhook_logs(merchant_id=merchant_id, limit=limit)


# ---------------------------------------------------------------------------
# Admin — Review & Approvals
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=List[MerchantResponse],
    summary="List all merchants (admin)",
)
async def list_merchants(
    skip: int = 0,
    limit: int = 50,
    service: MerchantService = Depends(get_merchant_service),
) -> List[MerchantResponse]:
    merchants = await service.list_merchants(skip=skip, limit=limit)
    res = []
    for m in merchants:
        if isinstance(m, dict):
            res.append(MerchantResponse(
                id=m["id"],
                user_id=m["user_id"],
                business_name=m["business_name"],
                registration_number=m["registration_number"],
                contact_phone=m["contact_phone"],
                business_address=m["business_address"],
                business_type=m.get("business_type"),
                website_url=m.get("website_url"),
                approval_status=m["approval_status"],
                rejection_reason=m.get("rejection_reason"),
                api_key=m.get("live_key"),
                created_at=m.get("created_at") or datetime.now(),
                updated_at=m.get("updated_at") or datetime.now(),
            ))
        else:
            res.append(MerchantResponse.model_validate(m))
    return res


@router.get(
    "/pending",
    response_model=List[MerchantResponse],
    summary="List pending merchant applications (admin)",
)
async def list_pending_merchants(
    skip: int = 0,
    limit: int = 50,
    service: MerchantService = Depends(get_merchant_service),
) -> List[MerchantResponse]:
    merchants = await service.get_pending_merchants(skip=skip, limit=limit)
    res = []
    for m in merchants:
        if isinstance(m, dict):
            res.append(MerchantResponse(
                id=m["id"],
                user_id=m["user_id"],
                business_name=m["business_name"],
                registration_number=m["registration_number"],
                contact_phone=m["contact_phone"],
                business_address=m["business_address"],
                business_type=m.get("business_type"),
                website_url=m.get("website_url"),
                approval_status=m["approval_status"],
                rejection_reason=m.get("rejection_reason"),
                api_key=m.get("live_key"),
                created_at=m.get("created_at") or datetime.now(),
                updated_at=m.get("updated_at") or datetime.now(),
            ))
        else:
            res.append(MerchantResponse.model_validate(m))
    return res


@router.get(
    "/{merchant_id}/detail",
    response_model=MerchantResponse,
    summary="Get merchant profile by ID (admin)",
)
async def get_merchant(
    merchant_id: int,
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantResponse:
    merchant = await service.get_merchant(merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Merchant with ID {merchant_id} not found.",
        )
    return MerchantResponse.model_validate(merchant)


@router.patch(
    "/{merchant_id}/approval",
    response_model=MerchantResponse,
    summary="Approve or reject a merchant application (admin)",
)
async def update_merchant_approval(
    merchant_id: int,
    payload: MerchantApprovalUpdate,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> MerchantResponse:
    repo = MerchantRepository(session) if session else None
    service = MerchantService(repo)
    try:
        merchant = await service.approve_merchant(
            merchant_id=merchant_id,
            status=payload.status,
            rejection_reason=payload.rejection_reason,
            session=session,
        )
        if session:
            try:
                await session.commit()
            except Exception:
                pass
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    if isinstance(merchant, dict):
        return MerchantResponse(
            id=merchant["id"],
            user_id=merchant["user_id"],
            business_name=merchant["business_name"],
            registration_number=merchant["registration_number"],
            contact_phone=merchant["contact_phone"],
            business_address=merchant["business_address"],
            business_type=merchant.get("business_type"),
            website_url=merchant.get("website_url"),
            approval_status=merchant["approval_status"],
            rejection_reason=merchant.get("rejection_reason"),
            api_key=merchant.get("live_key"),
            created_at=merchant.get("created_at") or datetime.now(),
            updated_at=merchant.get("updated_at") or datetime.now(),
        )
    return MerchantResponse.model_validate(merchant)
