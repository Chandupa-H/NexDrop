from datetime import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.dependencies import get_authenticated_courier
from app.modules.couriers.models import Courier
from app.modules.couriers.repository import CourierRepository
from app.modules.couriers.schemas import DeliveryListItem
from app.modules.couriers.service import CourierService
from app.modules.parcels.models import ParcelStatus

router = APIRouter(prefix="/courier", tags=["Courier Deliveries"])


def get_courier_service(session: AsyncSession = Depends(get_db)) -> CourierService:
    return CourierService(CourierRepository(session))


@router.get("/deliveries", response_model=List[DeliveryListItem])
async def get_today_courier_deliveries(
    status: Optional[List[ParcelStatus]] = Query(
        None, description="Repeat to filter by multiple parcel statuses."
    ),
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> List[DeliveryListItem]:
    today = datetime.now(ZoneInfo("Asia/Colombo")).date()
    return await service.get_courier_deliveries(courier.id, status, today)
