from typing import Optional, List
import secrets
from app.modules.merchants.models import Merchant
from app.modules.merchants.schemas import MerchantCreate
from app.modules.merchants.repository import MerchantRepository


class MerchantService:
    def __init__(self, repository: MerchantRepository):
        self.repository = repository

    async def get_merchant(self, merchant_id: int) -> Optional[Merchant]:
        return await self.repository.get_by_id(merchant_id)

    async def list_merchants(self, skip: int = 0, limit: int = 100) -> List[Merchant]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def create_merchant(self, payload: MerchantCreate) -> Merchant:
        merchant = Merchant(
            user_id=payload.user_id,
            business_name=payload.business_name,
            registration_number=payload.registration_number,
            contact_phone=payload.contact_phone,
            business_address=payload.business_address,
            api_key=f"nd_live_{secrets.token_hex(16)}",
        )
        return await self.repository.create(merchant)
