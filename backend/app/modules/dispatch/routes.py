from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db, get_optional_db
from app.modules.dispatch.schemas import (
    DispatchResponse,
    DispatchCreate,
    DispatchStatusUpdate,
    DispatcherDashboardStats,
)
from app.modules.dispatch.repository import DispatchRepository
from app.modules.dispatch.service import DispatchService

router = APIRouter(prefix="/dispatch", tags=["Dispatch"])


def get_dispatch_service(session: Optional[AsyncSession] = Depends(get_optional_db)) -> DispatchService:
    return DispatchService(DispatchRepository(session))


@router.get("/dashboard/stats", response_model=DispatcherDashboardStats)
async def get_dashboard_stats(
    service: DispatchService = Depends(get_dispatch_service),
) -> DispatcherDashboardStats:
    """Strictly read-only delivery statistics for dispatcher dashboard."""
    stats = await service.get_dashboard_stats()
    return DispatcherDashboardStats(**stats)


@router.get("", response_model=List[DispatchResponse])
async def list_assignments(
    skip: int = 0,
    limit: int = 50,
    courier_id: int = None,
    service: DispatchService = Depends(get_dispatch_service),
) -> List[DispatchResponse]:
    if courier_id:
        assignments = await service.list_by_courier(courier_id)
    else:
        assignments = await service.list_assignments(skip=skip, limit=limit)
    return [DispatchResponse.model_validate(a) for a in assignments]


@router.post("", response_model=DispatchResponse, status_code=status.HTTP_201_CREATED)
async def assign_parcel(
    payload: DispatchCreate,
    service: DispatchService = Depends(get_dispatch_service),
) -> DispatchResponse:
    assignment = await service.assign_parcel(payload)
    return DispatchResponse.model_validate(assignment)


@router.patch("/{assignment_id}/status", response_model=DispatchResponse)
async def update_dispatch_status(
    assignment_id: int,
    payload: DispatchStatusUpdate,
    service: DispatchService = Depends(get_dispatch_service),
) -> DispatchResponse:
    assignment = await service.update_status(assignment_id, payload)
    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispatch assignment {assignment_id} not found",
        )
    return DispatchResponse.model_validate(assignment)
