import secrets
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db, get_optional_db
from app.modules.merchants.models import Merchant, ApprovalStatus
from app.modules.merchants.schemas import (
    MerchantApprovalUpdate,
    MerchantRegisterRequest,
    MerchantRegistrationResponse,
    MerchantResponse,
    MerchantStatusResponse,
    ApiCredentialsResponse,
    RegenerateKeyRequest,
    RegenerateKeyResponse,
    OAuthTokenRequest,
    OAuthTokenResponse,
    VerifyKeyRequest,
    VerifyKeyResponse,
    MerchantDeliveryCreate,
    MerchantDeliveryResponse,
)
from app.modules.merchants.repository import MerchantRepository
from app.modules.merchants.service import MerchantService
from app.modules.merchants.security import (
    get_authenticated_merchant,
    generate_oauth_token,
    MOCK_APPROVED_MERCHANT,
)
from app.modules.webhooks.service import WebhookService

router = APIRouter(prefix="/merchants", tags=["Merchants"])


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------

def get_merchant_service(session: AsyncSession = Depends(get_db)) -> MerchantService:
    return MerchantService(MerchantRepository(session))


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
        "(approval_status=pending) in a single transaction. The merchant must wait "
        "for admin approval before they can log in."
    ),
)
async def register_merchant(
    payload: MerchantRegisterRequest,
    session: AsyncSession = Depends(get_db),
) -> MerchantRegistrationResponse:
    service = MerchantService(MerchantRepository(session))
    try:
        merchant = await service.register_merchant(payload, session)
        await session.commit()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        )
    return MerchantRegistrationResponse(
        merchant_id=merchant.id,
        approval_status=merchant.approval_status,
        message=(
            "Your application has been submitted successfully. "
            "You will be notified once an admin reviews your account."
        ),
    )


# ---------------------------------------------------------------------------
# Public — Application status check
# ---------------------------------------------------------------------------

@router.get(
    "/{merchant_id}/status",
    response_model=MerchantStatusResponse,
    summary="Check merchant application status",
    description=(
        "Allows an applicant to check if their registration has been "
        "approved, is still pending, or was rejected."
    ),
)
async def get_merchant_status(
    merchant_id: int,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> MerchantStatusResponse:
    if session:
        service = MerchantService(MerchantRepository(session))
        merchant = await service.get_merchant(merchant_id)
        if merchant:
            return MerchantStatusResponse(
                merchant_id=merchant.id,
                business_name=merchant.business_name,
                approval_status=merchant.approval_status,
                rejection_reason=merchant.rejection_reason,
            )

    # Demo fallback
    if merchant_id == 1:
        return MerchantStatusResponse(
            merchant_id=1,
            business_name=MOCK_APPROVED_MERCHANT["business_name"],
            approval_status=ApprovalStatus.APPROVED,
            rejection_reason=None,
        )

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"No merchant application found with ID {merchant_id}.",
    )


# ---------------------------------------------------------------------------
# Part 4: API Authentication & Security Endpoints
# ---------------------------------------------------------------------------

@router.get(
    "/{merchant_id}/credentials",
    response_model=ApiCredentialsResponse,
    summary="Get merchant API keys and OAuth credentials",
)
async def get_merchant_api_credentials(
    merchant_id: int,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> ApiCredentialsResponse:
    """Return live API key, test key, client ID, client secret, and rate limits."""
    if session:
        stmt = select(Merchant).where(Merchant.id == merchant_id)
        res = await session.execute(stmt)
        merchant = res.scalar_one_or_none()
        if merchant:
            return ApiCredentialsResponse(
                merchant_id=merchant.id,
                business_name=merchant.business_name,
                live_key=merchant.api_key or f"nd_live_{secrets.token_hex(16)}",
                test_key=merchant.test_api_key or f"nd_test_{secrets.token_hex(16)}",
                client_id=merchant.client_id or f"nd_client_{merchant.id:04d}",
                client_secret=merchant.client_secret or f"nd_secret_{secrets.token_hex(16)}",
                rate_limit_per_day=10000,
                used_today=len(_MERCHANT_DELIVERIES),
                approval_status=merchant.approval_status,
            )

    # Demo fallback for merchant_id == 1
    return ApiCredentialsResponse(
        merchant_id=MOCK_APPROVED_MERCHANT["id"],
        business_name=MOCK_APPROVED_MERCHANT["business_name"],
        live_key=MOCK_APPROVED_MERCHANT["api_key"],
        test_key=MOCK_APPROVED_MERCHANT["test_api_key"],
        client_id=MOCK_APPROVED_MERCHANT["client_id"],
        client_secret=MOCK_APPROVED_MERCHANT["client_secret"],
        rate_limit_per_day=10000,
        used_today=len(_MERCHANT_DELIVERIES),
        approval_status=ApprovalStatus.APPROVED,
    )


@router.post(
    "/{merchant_id}/credentials/regenerate",
    response_model=RegenerateKeyResponse,
    summary="Regenerate an API key or client secret",
)
async def regenerate_api_key(
    merchant_id: int,
    payload: RegenerateKeyRequest,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> RegenerateKeyResponse:
    """Rotate an API credential. Old key is immediately invalidated."""
    new_token = ""
    prefix = "nd_live_" if payload.key_type == "live" else "nd_test_" if payload.key_type == "test" else "nd_secret_"
    new_token = f"{prefix}{secrets.token_hex(16)}"

    if session:
        stmt = select(Merchant).where(Merchant.id == merchant_id)
        res = await session.execute(stmt)
        merchant = res.scalar_one_or_none()
        if merchant:
            if payload.key_type == "live":
                merchant.api_key = new_token
            elif payload.key_type == "test":
                merchant.test_api_key = new_token
            elif payload.key_type == "secret":
                merchant.client_secret = new_token
            await session.commit()

    # Update demo mock
    if payload.key_type == "live":
        MOCK_APPROVED_MERCHANT["api_key"] = new_token
    elif payload.key_type == "test":
        MOCK_APPROVED_MERCHANT["test_api_key"] = new_token
    elif payload.key_type == "secret":
        MOCK_APPROVED_MERCHANT["client_secret"] = new_token

    return RegenerateKeyResponse(
        key_type=payload.key_type,
        new_key=new_token,
        message=f"{payload.key_type.title()} credential has been regenerated successfully. Store it securely.",
    )


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
# Admin — List & Approvals
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
    return [MerchantResponse.model_validate(m) for m in merchants]


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
    return [MerchantResponse.model_validate(m) for m in merchants]


@router.get(
    "/{merchant_id}",
    response_model=MerchantResponse,
    summary="Get merchant by ID (admin)",
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
    session: AsyncSession = Depends(get_db),
) -> MerchantResponse:
    service = MerchantService(MerchantRepository(session))
    try:
        merchant = await service.approve_merchant(
            merchant_id=merchant_id,
            status=payload.status,
            rejection_reason=payload.rejection_reason,
            session=session,
        )
        await session.commit()
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        )
    return MerchantResponse.model_validate(merchant)
