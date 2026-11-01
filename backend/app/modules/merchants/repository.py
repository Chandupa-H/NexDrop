from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.merchants.models import Merchant, ApprovalStatus


class MerchantRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    # ------------------------------------------------------------------
    # Basic lookups
    # ------------------------------------------------------------------

    async def get_by_id(self, merchant_id: int) -> Optional[Merchant]:
        result = await self.session.execute(
            select(Merchant).where(Merchant.id == merchant_id)
        )
        return result.scalars().first()

    async def get_by_user_id(self, user_id: int) -> Optional[Merchant]:
        result = await self.session.execute(
            select(Merchant).where(Merchant.user_id == user_id)
        )
        return result.scalars().first()

    async def get_by_registration_number(self, reg_number: str) -> Optional[Merchant]:
        """Used to prevent duplicate registration number submissions."""
        result = await self.session.execute(
            select(Merchant).where(Merchant.registration_number == reg_number)
        )
        return result.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Merchant]:
        result = await self.session.execute(
            select(Merchant).offset(skip).limit(limit)
        )
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # Approval workflow queries
    # ------------------------------------------------------------------

    async def get_by_approval_status(
        self,
        status: ApprovalStatus,
        skip: int = 0,
        limit: int = 100,
    ) -> List[Merchant]:
        """Return merchants filtered by approval status (e.g. all pending)."""
        result = await self.session.execute(
            select(Merchant)
            .where(Merchant.approval_status == status)
            .offset(skip)
            .limit(limit)
        )
        return list(result.scalars().all())

    async def update_approval(
        self,
        merchant: Merchant,
        status: ApprovalStatus,
        rejection_reason: Optional[str] = None,
    ) -> Merchant:
        """Apply an approval decision and persist it."""
        merchant.approval_status = status
        if rejection_reason is not None:
            merchant.rejection_reason = rejection_reason
        self.session.add(merchant)
        await self.session.flush()
        await self.session.refresh(merchant)
        return merchant

    # ------------------------------------------------------------------
    # Write operations
    # ------------------------------------------------------------------

    async def create(self, merchant: Merchant) -> Merchant:
        self.session.add(merchant)
        await self.session.flush()
        await self.session.refresh(merchant)
        return merchant
