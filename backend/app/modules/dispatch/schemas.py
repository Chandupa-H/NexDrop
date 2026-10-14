from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.modules.dispatch.models import DispatchStatus


class DispatchCreate(BaseModel):
    parcel_id: int
    courier_id: int
    notes: Optional[str] = None


class DispatchStatusUpdate(BaseModel):
    status: DispatchStatus
    notes: Optional[str] = None


class DispatchResponse(BaseModel):
    id: int
    parcel_id: int
    courier_id: int
    status: DispatchStatus
    assigned_at: datetime
    completed_at: Optional[datetime] = None
    notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
