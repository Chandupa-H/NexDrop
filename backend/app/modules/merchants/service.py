import hashlib
import secrets
import logging
from typing import Optional, List

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.merchants.models import Merchant, ApprovalStatus
from app.modules.merchants.schemas import MerchantRegisterRequest, MerchantCreate
from app.modules.merchants.repository import MerchantRepository
from app.modules.users.models import User, UserRole
from app.modules.users.repository import UserRepository

logger = logging.getLogger(__name__)


class MerchantService:
    def __init__(self, repository: MerchantRepository):
        self.repository = repository

    # ------------------------------------------------------------------
    # Read helpers
    # ------------------------------------------------------------------

    async def get_merchant(self, merchant_id: int) -> Optional[Merchant]:
        return await self.repository.get_by_id(merchant_id)

    async def list_merchants(self, skip: int = 0, limit: int = 100) -> List[Merchant]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def get_pending_merchants(
        self, skip: int = 0, limit: int = 100
    ) -> List[Merchant]:
        """Return all merchants whose application is still pending admin review."""
        return await self.repository.get_by_approval_status(
            ApprovalStatus.PENDING, skip=skip, limit=limit
        )

    # ------------------------------------------------------------------
    # Registration (public)
    # ------------------------------------------------------------------

    @staticmethod
    def _hash_password(plain: str) -> str:
        """
        Placeholder password hashing using SHA-256.
        This MUST be replaced with Argon2 / Passlib in the auth milestone.
        """
        return hashlib.sha256(plain.encode()).hexdigest()

    async def register_merchant(
        self,
        payload: MerchantRegisterRequest,
        session: AsyncSession,
    ) -> Merchant:
        """
        Atomically create a User (role=merchant, is_active=False) and a
        corresponding Merchant (approval_status=pending) in a single
        database transaction.

        Raises ValueError when the email or registration number is already taken.
        """
        user_repo = UserRepository(session)

        # Guard: duplicate email
        existing_user = await user_repo.get_by_email(payload.email)
        if existing_user:
            raise ValueError(f"An account with email '{payload.email}' already exists.")

        # Guard: duplicate registration number
        existing_merchant = await self.repository.get_by_registration_number(
            payload.registration_number
        )
        if existing_merchant:
            raise ValueError(
                f"Business registration number '{payload.registration_number}' is already registered."
            )

        # 1. Create the user account (inactive until approved)
        hashed_pw = self._hash_password(payload.password)
        user = User(
            email=payload.email,
            full_name=payload.full_name,
            hashed_password=hashed_pw,
            role=UserRole.MERCHANT,
            is_active=False,  # Activated only after admin approval
        )
        session.add(user)
        await session.flush()  # Gets user.id without committing

        # 2. Create the merchant profile linked to that user
        merchant = Merchant(
            user_id=user.id,
            business_name=payload.business_name,
            registration_number=payload.registration_number,
            contact_phone=payload.contact_phone,
            business_address=payload.business_address,
            business_type=payload.business_type,
            website_url=payload.website_url,
            approval_status=ApprovalStatus.PENDING,
        )
        session.add(merchant)
        await session.flush()
        await session.refresh(merchant)

        logger.info(
            "New merchant registration submitted: business='%s' email='%s' merchant_id=%s",
            payload.business_name,
            payload.email,
            merchant.id,
        )
        return merchant

    # ------------------------------------------------------------------
    # Admin approval workflow
    # ------------------------------------------------------------------

    async def approve_merchant(
        self,
        merchant_id: int,
        status: ApprovalStatus,
        rejection_reason: Optional[str],
        session: AsyncSession,
    ) -> Merchant:
        """
        Set approval_status on a merchant. On approval, activate the linked
        user account and issue an API key. On rejection, store the reason.
        """
        merchant = await self.repository.get_by_id(merchant_id)
        if not merchant:
            raise ValueError(f"Merchant {merchant_id} not found.")

        if status == ApprovalStatus.APPROVED:
            # Activate the merchant's user account
            user_repo = UserRepository(session)
            user = await user_repo.get_by_id(merchant.user_id)
            if user:
                user.is_active = True
                session.add(user)

            # Issue an API key on first approval
            if not merchant.api_key:
                merchant.api_key = f"nd_live_{secrets.token_hex(16)}"
                session.add(merchant)
                await session.flush()

            logger.info("Merchant %s approved.", merchant_id)
        else:
            logger.info("Merchant %s rejected. Reason: %s", merchant_id, rejection_reason)

        return await self.repository.update_approval(merchant, status, rejection_reason)

    # ------------------------------------------------------------------
    # Legacy create (kept for backward compat)
    # ------------------------------------------------------------------

    async def create_merchant(self, payload: MerchantCreate) -> Merchant:
        merchant = Merchant(
            user_id=payload.user_id,
            business_name=payload.business_name,
            registration_number=payload.registration_number,
            contact_phone=payload.contact_phone,
            business_address=payload.business_address,
            business_type=payload.business_type,
            website_url=payload.website_url,
            api_key=f"nd_live_{secrets.token_hex(16)}",
        )
        return await self.repository.create(merchant)
