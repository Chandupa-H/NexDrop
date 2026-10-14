from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class MerchantBase(BaseModel):
    business_name: str
    registration_number: str
    contact_phone: str
    business_address: str


class MerchantCreate(MerchantBase):
    user_id: int


class MerchantUpdate(BaseModel):
    business_name: Optional[str] = None
    contact_phone: Optional[str] = None
    business_address: Optional[str] = None


class MerchantResponse(MerchantBase):
    id: int
    user_id: int
    api_key: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
