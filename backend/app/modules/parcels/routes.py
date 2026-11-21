from typing import List
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.parcels.schemas import ParcelResponse, ParcelCreate, ParcelStatusUpdate
from app.modules.parcels.repository import ParcelRepository
from app.modules.parcels.service import ParcelService
from app.modules.webhooks.service import WebhookService

router = APIRouter(prefix="/parcels", tags=["Parcels"])


def get_parcel_service(session: AsyncSession = Depends(get_db)) -> ParcelService:
    return ParcelService(ParcelRepository(session))


@router.get("", response_model=List[ParcelResponse])
async def list_parcels(
    skip: int = 0,
    limit: int = 50,
    service: ParcelService = Depends(get_parcel_service),
) -> List[ParcelResponse]:
    parcels = await service.list_parcels(skip=skip, limit=limit)
    return [ParcelResponse.model_validate(p) for p in parcels]


@router.post("", response_model=ParcelResponse, status_code=status.HTTP_201_CREATED)
async def create_parcel(
    payload: ParcelCreate,
    background_tasks: BackgroundTasks,
    service: ParcelService = Depends(get_parcel_service),
) -> ParcelResponse:
    parcel = await service.create_parcel(payload)
    await service.repository.session.commit()
    WebhookService.schedule_parcel_event(
        background_tasks=background_tasks,
        merchant_id=parcel.merchant_id,
        tracking_number=parcel.tracking_number,
        status_value="created",
        location=parcel.delivery_city,
        note=parcel.special_instructions,
    )
    return ParcelResponse.model_validate(parcel)


@router.get("/track/{tracking_number}", response_model=ParcelResponse)
async def track_parcel(
    tracking_number: str,
    service: ParcelService = Depends(get_parcel_service),
) -> ParcelResponse:
    parcel = await service.track_parcel(tracking_number)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with tracking number {tracking_number} not found",
        )
    return ParcelResponse.model_validate(parcel)


@router.patch("/{parcel_id}/status", response_model=ParcelResponse)
async def update_parcel_status(
    parcel_id: int,
    payload: ParcelStatusUpdate,
    background_tasks: BackgroundTasks,
    service: ParcelService = Depends(get_parcel_service),
) -> ParcelResponse:
    existing = await service.get_parcel(parcel_id)
    previous_status = existing.status if existing else None
    parcel = await service.update_status(parcel_id, payload)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with ID {parcel_id} not found",
        )
    await service.repository.session.commit()
    if previous_status != parcel.status:
        WebhookService.schedule_parcel_event(
            background_tasks=background_tasks,
            merchant_id=parcel.merchant_id,
            tracking_number=parcel.tracking_number,
            status_value=payload.status.value if hasattr(payload.status, "value") else str(payload.status),
            location=parcel.delivery_city,
            note=parcel.special_instructions,
            failure_reason=parcel.failure_reason,
        )
    return ParcelResponse.model_validate(parcel)
