from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.zones.schemas import (
    DeliveryZoneResponse,
    DeliveryZoneCreate,
    DeliveryZoneUpdate,
)
from app.modules.zones.repository import ZoneRepository
from app.modules.zones.service import ZoneService

router = APIRouter(prefix="/zones", tags=["Delivery Zones"])


def get_zone_service(session: AsyncSession = Depends(get_db)) -> ZoneService:
    return ZoneService(ZoneRepository(session))


@router.get("", response_model=List[DeliveryZoneResponse])
async def list_zones(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    service: ZoneService = Depends(get_zone_service),
) -> List[DeliveryZoneResponse]:
    zones = await service.list_zones(skip=skip, limit=limit, active_only=active_only)
    return [DeliveryZoneResponse.model_validate(z) for z in zones]


@router.get("/{zone_id}", response_model=DeliveryZoneResponse)
async def get_zone(
    zone_id: int,
    service: ZoneService = Depends(get_zone_service),
) -> DeliveryZoneResponse:
    zone = await service.get_zone(zone_id)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery zone with ID {zone_id} not found",
        )
    return DeliveryZoneResponse.model_validate(zone)


@router.post("", response_model=DeliveryZoneResponse, status_code=status.HTTP_201_CREATED)
async def create_zone(
    payload: DeliveryZoneCreate,
    service: ZoneService = Depends(get_zone_service),
) -> DeliveryZoneResponse:
    existing = await service.get_zone_by_code(payload.code)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Delivery zone with code '{payload.code}' already exists",
        )
    zone = await service.create_zone(payload)
    return DeliveryZoneResponse.model_validate(zone)


@router.patch("/{zone_id}", response_model=DeliveryZoneResponse)
async def update_zone(
    zone_id: int,
    payload: DeliveryZoneUpdate,
    service: ZoneService = Depends(get_zone_service),
) -> DeliveryZoneResponse:
    zone = await service.update_zone(zone_id, payload)
    if not zone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Delivery zone with ID {zone_id} not found",
        )
    return DeliveryZoneResponse.model_validate(zone)

