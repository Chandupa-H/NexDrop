from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class WarehouseBase(BaseModel):
    name: str
    address: str
    city: str
    contact_number: str
    is_active: bool = True


class WarehouseCreate(WarehouseBase):
    pass


class WarehouseUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    contact_number: Optional[str] = None
    is_active: Optional[bool] = None


class WarehouseResponse(WarehouseBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

