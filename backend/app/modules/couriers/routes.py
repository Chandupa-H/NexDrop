from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.couriers.schemas import CourierResponse, CourierLocationUpdate
from app.modules.couriers.repository import CourierRepository
from app.modules.couriers.service import CourierService

router = APIRouter(prefix="/couriers", tags=["Couriers"])


def get_courier_service(session: AsyncSession = Depends(get_db)) -> CourierService:
    return CourierService(CourierRepository(session))


@router.get("", response_model=List[CourierResponse])
async def list_couriers(
    skip: int = 0,
    limit: int = 50,
    available_only: bool = False,
    service: CourierService = Depends(get_courier_service),
) -> List[CourierResponse]:
    if available_only:
        couriers = await service.list_available()
    else:
        couriers = await service.list_couriers(skip=skip, limit=limit)
    return [CourierResponse.model_validate(c) for c in couriers]


@router.get("/{courier_id}", response_model=CourierResponse)
async def get_courier(
    courier_id: int,
    service: CourierService = Depends(get_courier_service),
) -> CourierResponse:
    courier = await service.get_courier(courier_id)
    if not courier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Courier with ID {courier_id} not found",
        )
    return CourierResponse.model_validate(courier)


@router.patch("/{courier_id}/location", response_model=CourierResponse)
async def update_location(
    courier_id: int,
    payload: CourierLocationUpdate,
    service: CourierService = Depends(get_courier_service),
) -> CourierResponse:
    courier = await service.update_location(courier_id, payload)
    if not courier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Courier with ID {courier_id} not found",
        )
    return CourierResponse.model_validate(courier)
