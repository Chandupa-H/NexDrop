from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db, get_optional_db
from app.modules.dispatch.schemas import (
    DispatchResponse,
    DispatchCreate,
    DispatchStatusUpdate,
    DispatcherDashboardStats,
    DispatcherMeResponse,
    CourierReassignRequest,
    WarehouseReceiveRequest,
    WarehouseHandoverRequest,
    CourierWorkloadItem,
    UnassignedParcelItem,
    UnassignedParcelListResponse,
    UnassignedParcelDetailResponse,
    DispatchCourierSummary,
    DispatchHistoryItem,
    DispatchHistoryResponse,
    DispatchHistoryDetailResponse,
)
from app.modules.dispatch.repository import DispatchRepository
from app.modules.dispatch.service import DispatchService

router = APIRouter(prefix="/dispatch", tags=["Dispatch"])


def get_dispatch_service(session: Optional[AsyncSession] = Depends(get_optional_db)) -> DispatchService:
    return DispatchService(DispatchRepository(session))


@router.get("/dispatcher/me", response_model=DispatcherMeResponse)
async def get_dispatcher_me() -> DispatcherMeResponse:
    """Return dispatcher profile for authenticated user / user chip."""
    return DispatcherMeResponse(id=1, full_name="Nuwan Bandara", role="dispatcher")


@router.get("/dashboard/stats", response_model=DispatcherDashboardStats)
async def get_dashboard_stats(
    service: DispatchService = Depends(get_dispatch_service),
) -> DispatcherDashboardStats:
    """Strictly read-only delivery statistics for dispatcher dashboard."""
    stats = await service.get_dashboard_stats()
    return DispatcherDashboardStats(**stats)


@router.get("/unassigned-parcels", response_model=UnassignedParcelListResponse)
async def list_unassigned_parcels(
    search: Optional[str] = None,
    city: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
    service: DispatchService = Depends(get_dispatch_service),
) -> UnassignedParcelListResponse:
    """List unassigned parcels with search, city filtering, and pagination."""
    items, total, cities = await service.get_unassigned_parcels(
        search=search, city=city, limit=limit, offset=offset
    )
    return UnassignedParcelListResponse(
        items=[UnassignedParcelItem.model_validate(p) for p in items],
        total=total,
        limit=limit,
        offset=offset,
        cities=cities,
    )


@router.get("/unassigned-parcels/{parcel_id}", response_model=UnassignedParcelDetailResponse)
async def get_unassigned_parcel(
    parcel_id: int,
    service: DispatchService = Depends(get_dispatch_service),
) -> UnassignedParcelDetailResponse:
    """Fetch complete details for a specific unassigned parcel."""
    parcel = await service.get_unassigned_parcel_by_id(parcel_id)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unassigned parcel {parcel_id} not found",
        )
    return UnassignedParcelDetailResponse.model_validate(parcel)


@router.get("/couriers/workload", response_model=List[CourierWorkloadItem])
async def get_courier_workload(
    service: DispatchService = Depends(get_dispatch_service),
) -> List[CourierWorkloadItem]:
    """
    Courier Workload Management:
    Calculate active assignments, availability, and capacity status across the fleet.
    """
    return await service.get_courier_workload()


@router.get("/history", response_model=DispatchHistoryResponse)
async def get_dispatch_history(
    status: Optional[str] = None,
    courier_id: Optional[int] = None,
    search: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    limit: int = 10,
    offset: int = 0,
    service: DispatchService = Depends(get_dispatch_service),
) -> DispatchHistoryResponse:
    """
    List completed, failed, and previous courier assignments with filtering by
    status, courier, date range, search query, and pagination.
    """
    items, total, statuses, couriers = await service.get_dispatch_history(
        status=status,
        courier_id=courier_id,
        search=search,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )
    return DispatchHistoryResponse(
        items=[DispatchHistoryItem.model_validate(it) for it in items],
        total=total,
        limit=limit,
        offset=offset,
        statuses=statuses,
        couriers=[DispatchCourierSummary.model_validate(c) for c in couriers],
    )


@router.get("/history/{assignment_id}", response_model=DispatchHistoryDetailResponse)
async def get_dispatch_history_detail(
    assignment_id: int,
    service: DispatchService = Depends(get_dispatch_service),
) -> DispatchHistoryDetailResponse:
    """Fetch complete details for a historical dispatch assignment."""
    detail = await service.get_dispatch_history_detail(assignment_id)
    if not detail:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Dispatch assignment {assignment_id} not found",
        )
    return DispatchHistoryDetailResponse.model_validate(detail)



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
@router.post("/assign", response_model=DispatchResponse, status_code=status.HTTP_201_CREATED)
async def assign_parcel(
    payload: DispatchCreate,
    service: DispatchService = Depends(get_dispatch_service),
) -> DispatchResponse:
    """
    Courier Assignment:
    Assign courier to a parcel, validate courier availability and parcel status,
    save assignment, and publish CourierAssigned event.
    """
    assignment = await service.assign_parcel(payload)
    return DispatchResponse.model_validate(assignment)


@router.post("/{assignment_id}/reassign", response_model=DispatchResponse)
async def reassign_courier(
    assignment_id: int,
    payload: CourierReassignRequest,
    service: DispatchService = Depends(get_dispatch_service),
) -> DispatchResponse:
    """
    Courier Reassignment:
    Handle courier changes, update assignments, validate new courier availability,
    and publish CourierReassigned event.
    """
    new_assignment = await service.reassign_courier(assignment_id, payload)
    return DispatchResponse.model_validate(new_assignment)


@router.post("/warehouse/receive", response_model=Dict[str, Any])
async def warehouse_receive_parcel(
    payload: WarehouseReceiveRequest,
    service: DispatchService = Depends(get_dispatch_service),
) -> Dict[str, Any]:
    """
    Warehouse Dispatch:
    Receive parcel into a warehouse hub, update delivery method / location,
    and publish WarehouseParcelReceived event.
    """
    return await service.warehouse_receive_parcel(payload)


@router.post("/warehouse/handover", response_model=DispatchResponse)
async def warehouse_handover_parcel(
    payload: WarehouseHandoverRequest,
    service: DispatchService = Depends(get_dispatch_service),
) -> DispatchResponse:
    """
    Warehouse Dispatch:
    Handover parcel from warehouse to a courier for last-mile delivery,
    and publish handover / assignment events.
    """
    assignment = await service.warehouse_handover_parcel(payload)
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
