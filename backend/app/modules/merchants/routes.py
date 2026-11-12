from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.merchants.models import ApprovalStatus
from app.modules.merchants.schemas import (
    MerchantApprovalUpdate,
    MerchantRegisterRequest,
    MerchantRegistrationResponse,
    MerchantResponse,
    MerchantStatusResponse,
)
from app.modules.merchants.repository import MerchantRepository
from app.modules.merchants.service import MerchantService

router = APIRouter(prefix="/merchants", tags=["Merchants"])


# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------

def get_merchant_service(session: AsyncSession = Depends(get_db)) -> MerchantService:
    return MerchantService(MerchantRepository(session))


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
    service: MerchantService = Depends(get_merchant_service),
) -> MerchantStatusResponse:
    merchant = await service.get_merchant(merchant_id)
    if not merchant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No merchant application found with ID {merchant_id}.",
        )
    return MerchantStatusResponse(
        merchant_id=merchant.id,
        business_name=merchant.business_name,
        approval_status=merchant.approval_status,
        rejection_reason=merchant.rejection_reason,
    )


# ---------------------------------------------------------------------------
# Admin — List all merchants
# ---------------------------------------------------------------------------

@router.get(
    "",
    response_model=List[MerchantResponse],
    summary="List all merchants (admin)",
    description="Returns all registered merchants. Protected by admin auth in the auth milestone.",
)
async def list_merchants(
    skip: int = 0,
    limit: int = 50,
    service: MerchantService = Depends(get_merchant_service),
) -> List[MerchantResponse]:
    # TODO: guard with admin role dependency once auth milestone is complete
    merchants = await service.list_merchants(skip=skip, limit=limit)
    return [MerchantResponse.model_validate(m) for m in merchants]


# ---------------------------------------------------------------------------
# Admin — List pending applications
# ---------------------------------------------------------------------------

@router.get(
    "/pending",
    response_model=List[MerchantResponse],
    summary="List pending merchant applications (admin)",
    description="Returns only merchants whose approval_status is 'pending'.",
)
async def list_pending_merchants(
    skip: int = 0,
    limit: int = 50,
    service: MerchantService = Depends(get_merchant_service),
) -> List[MerchantResponse]:
    # TODO: guard with admin role dependency once auth milestone is complete
    merchants = await service.get_pending_merchants(skip=skip, limit=limit)
    return [MerchantResponse.model_validate(m) for m in merchants]


# ---------------------------------------------------------------------------
# Admin — Get single merchant
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# Admin — Approve or reject
# ---------------------------------------------------------------------------

@router.patch(
    "/{merchant_id}/approval",
    response_model=MerchantResponse,
    summary="Approve or reject a merchant application (admin)",
    description=(
        "Sets the approval_status to 'approved' or 'rejected'. "
        "On approval, the linked user account is activated and an API key is issued. "
        "On rejection, the rejection_reason is stored."
    ),
)
async def update_merchant_approval(
    merchant_id: int,
    payload: MerchantApprovalUpdate,
    session: AsyncSession = Depends(get_db),
) -> MerchantResponse:
    # TODO: guard with admin role dependency once auth milestone is complete
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
