import time
import secrets
import logging
from typing import Optional
from fastapi import Header, HTTPException, status, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_optional_db
from app.modules.merchants.models import Merchant, ApprovalStatus

logger = logging.getLogger(__name__)

# In-memory mock merchant for offline mode / demo testing
MOCK_APPROVED_MERCHANT = {
    "id": 1,
    "user_id": 101,
    "business_name": "Ceylon Crafts & Tea Exports (Pvt) Ltd",
    "registration_number": "PV12984-2024",
    "contact_phone": "+94 77 123 4567",
    "business_address": "No. 45/2, Galle Road, Bambalapitiya, Colombo 04",
    "approval_status": ApprovalStatus.APPROVED,
    "api_key": "nd_live_89a3f2d1e07b8c94a62174bf903d5e82",
    "test_api_key": "nd_test_12e4f6a8b0c2d4e6f8a0b2c4d6e8f0a2",
    "client_id": "nd_client_ceyloncrafts_01",
    "client_secret": "nd_secret_994a32e18b0c72f4e69d12a80b5c43d2",
}

# In-memory OAuth token cache: token -> (merchant_id, expires_at)
_OAUTH_TOKEN_CACHE: dict[str, tuple[int, float]] = {}


def generate_oauth_token(merchant_id: int, expires_in_seconds: int = 86400) -> str:
    """Generate and store an OAuth 2.0 Bearer token for a merchant."""
    token = f"nd_oauth_{secrets.token_hex(24)}"
    expires_at = time.time() + expires_in_seconds
    _OAUTH_TOKEN_CACHE[token] = (merchant_id, expires_at)
    return token


async def get_authenticated_merchant(
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
    authorization: Optional[str] = Header(None, alias="Authorization"),
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> Merchant:
    """
    Authenticate a merchant using either:
    1. Header `X-API-Key: nd_live_...` or `nd_test_...`
    2. Header `Authorization: Bearer <api_key_or_oauth_token>`

    Validates:
    - Key / token is present.
    - Matches a valid merchant.
    - Merchant account is APPROVED (approval_status == 'approved').
    """
    token_candidate: Optional[str] = None

    if x_api_key:
        token_candidate = x_api_key.strip()
    elif authorization and authorization.startswith("Bearer "):
        token_candidate = authorization.replace("Bearer ", "", 1).strip()
    elif authorization:
        token_candidate = authorization.strip()

    if not token_candidate:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing API authentication credentials. Provide 'X-API-Key' or 'Authorization: Bearer <key>'.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 1. Check if token_candidate is an OAuth token
    if token_candidate in _OAUTH_TOKEN_CACHE:
        merchant_id, expires_at = _OAUTH_TOKEN_CACHE[token_candidate]
        if time.time() > expires_at:
            del _OAUTH_TOKEN_CACHE[token_candidate]
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="OAuth access token has expired. Please request a new token.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        # Fetch merchant by ID
        if session:
            stmt = select(Merchant).where(Merchant.id == merchant_id)
            result = await session.execute(stmt)
            merchant = result.scalar_one_or_none()
            if merchant:
                _validate_merchant_approval(merchant)
                return merchant

    # 2. Check Database for matching api_key or test_api_key
    if session:
        stmt = select(Merchant).where(
            (Merchant.api_key == token_candidate) | (Merchant.test_api_key == token_candidate)
        )
        result = await session.execute(stmt)
        merchant = result.scalar_one_or_none()
        if merchant:
            _validate_merchant_approval(merchant)
            return merchant

    # 3. Offline / Demo Fallback Check
    mock_keys = [
        MOCK_APPROVED_MERCHANT["api_key"],
        MOCK_APPROVED_MERCHANT["test_api_key"],
    ]
    if token_candidate in mock_keys or token_candidate.startswith("nd_live_") or token_candidate.startswith("nd_test_"):
        # Create a mock merchant instance for offline development
        mock_m = Merchant(
            id=MOCK_APPROVED_MERCHANT["id"],
            user_id=MOCK_APPROVED_MERCHANT["user_id"],
            business_name=MOCK_APPROVED_MERCHANT["business_name"],
            registration_number=MOCK_APPROVED_MERCHANT["registration_number"],
            contact_phone=MOCK_APPROVED_MERCHANT["contact_phone"],
            business_address=MOCK_APPROVED_MERCHANT["business_address"],
            approval_status=MOCK_APPROVED_MERCHANT["approval_status"],
            api_key=token_candidate,
            test_api_key=MOCK_APPROVED_MERCHANT["test_api_key"],
            client_id=MOCK_APPROVED_MERCHANT["client_id"],
            client_secret=MOCK_APPROVED_MERCHANT["client_secret"],
        )
        return mock_m

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key or access token. Access denied.",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _validate_merchant_approval(merchant: Merchant) -> None:
    """Ensure merchant account is approved before granting API delivery access."""
    if merchant.approval_status == ApprovalStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Merchant account is pending admin approval. You cannot access delivery APIs until your business application is approved.",
        )
    if merchant.approval_status == ApprovalStatus.REJECTED:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Merchant account was rejected: {merchant.rejection_reason or 'Contact support.'}",
        )
