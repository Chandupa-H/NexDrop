from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CustomerBase(BaseModel):
    phone: str
    default_address: str
    city: str
    postal_code: str
    notes: Optional[str] = None


class CustomerCreate(CustomerBase):
    user_id: int


class CustomerUpdate(BaseModel):
    phone: Optional[str] = None
    default_address: Optional[str] = None
    city: Optional[str] = None
    postal_code: Optional[str] = None
    notes: Optional[str] = None


class CustomerResponse(CustomerBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
