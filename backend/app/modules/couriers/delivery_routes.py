from datetime import datetime
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.modules.auth.dependencies import get_authenticated_courier
from app.modules.couriers.models import Courier
from app.modules.couriers.repository import CourierRepository
from app.modules.couriers.schemas import (
    CourierLocationResponse,
    CourierLocationUpdateRequest,
    CourierLocationUpdateResponse,
    DeliveryListItem,
    DeliveryStatusUpdateRequest,
    DeliveryTrackingResponse,
)
from app.modules.couriers.service import CourierService
from app.modules.parcels.models import ParcelStatus

router = APIRouter(prefix="/courier", tags=["Courier Deliveries"])
tracking_router = APIRouter(prefix="/deliveries", tags=["Delivery Tracking"])


def get_courier_service(session: AsyncSession = Depends(get_db)) -> CourierService:
    return CourierService(CourierRepository(session))


@router.get("/deliveries", response_model=List[DeliveryListItem])
@router.get("/deliveries/today", response_model=List[DeliveryListItem])
async def get_today_courier_deliveries(
    status: Optional[List[ParcelStatus]] = Query(
        None, description="Repeat to filter by multiple parcel statuses."
    ),
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> List[DeliveryListItem]:
    today = datetime.now(ZoneInfo("Asia/Colombo")).date()
    return await service.get_courier_deliveries(courier.id, status, today)


@router.get("/deliveries/{delivery_id}", response_model=DeliveryListItem)
async def get_courier_delivery(
    delivery_id: int,
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> DeliveryListItem:
    delivery = await service.get_assigned_delivery(courier.id, delivery_id)
    if delivery is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Delivery not found.",
        )
    return delivery


@router.patch("/deliveries/{delivery_id}/status", response_model=DeliveryListItem)
async def update_courier_delivery_status(
    delivery_id: int,
    payload: DeliveryStatusUpdateRequest,
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> DeliveryListItem:
    delivery = await service.update_assigned_delivery_status(
        courier.id, delivery_id, payload.status
    )
    if delivery is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Delivery not found.",
        )
    return delivery


@router.post("/location", response_model=CourierLocationUpdateResponse)
async def update_courier_location(
    payload: CourierLocationUpdateRequest,
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> CourierLocationUpdateResponse:
    location, accepted = await service.post_courier_location(courier, payload)
    return CourierLocationUpdateResponse(location=location, accepted=accepted)


@router.get("/location/me", response_model=Optional[CourierLocationResponse])
async def get_my_courier_location(
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> Optional[CourierLocationResponse]:
    return await service.get_courier_location(courier.id)


@tracking_router.get("/{delivery_id}/tracking", response_model=DeliveryTrackingResponse)
async def get_delivery_tracking(
    delivery_id: int,
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> DeliveryTrackingResponse:
    tracking = await service.get_delivery_tracking(courier.id, delivery_id)
    if tracking is None:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="Delivery not found.",
        )
    return tracking
