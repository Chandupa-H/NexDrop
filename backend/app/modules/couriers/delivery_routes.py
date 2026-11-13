from datetime import date, datetime
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
    DeliveryDetail,
    DeliveryHistoryResponse,
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


@router.get("/deliveries/history", response_model=DeliveryHistoryResponse)
async def get_courier_delivery_history(
    status: Optional[ParcelStatus] = Query(None),
    from_date: Optional[date] = Query(None, alias="from"),
    to_date: Optional[date] = Query(None, alias="to"),
    q: Optional[str] = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> DeliveryHistoryResponse:
    if status is not None and status not in {
        ParcelStatus.DELIVERED,
        ParcelStatus.CANCELLED,
    }:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="History status must be delivered or cancelled.",
        )
    if from_date and to_date and from_date > to_date:
        raise HTTPException(
            status_code=http_status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="'from' date must not be after 'to' date.",
        )
    return await service.get_courier_delivery_history(
        courier.id,
        status,
        from_date,
        to_date,
        q,
        page,
        page_size,
    )


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


@router.get("/deliveries/{delivery_id}", response_model=DeliveryDetail)
async def get_courier_delivery(
    delivery_id: int,
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> DeliveryDetail:
    delivery = await service.get_assigned_delivery_detail(courier.id, delivery_id)
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
        courier.id,
        delivery_id,
        payload.status,
        note=payload.note,
        proof_reference=payload.proof_reference,
        failure_reason=payload.failure_reason,
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
