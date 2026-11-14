from datetime import date, datetime
import secrets
import time
from typing import List, Optional
from zoneinfo import ZoneInfo

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    WebSocket,
    WebSocketDisconnect,
    status as http_status,
)
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.integrations.websockets.manager import ws_manager
from app.modules.auth.dependencies import get_authenticated_courier
from app.modules.couriers.models import Courier
from app.modules.couriers.repository import CourierRepository
from app.modules.couriers.schemas import (
    CourierLocationResponse,
    CourierLocationUpdateRequest,
    CourierLocationUpdateResponse,
    CourierLocationWebSocketTicketResponse,
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
_location_websocket_tickets: dict[str, tuple[int, float]] = {}


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
    if accepted:
        await ws_manager.broadcast_to_channel(
            f"courier-location:{courier.id}",
            {
                "type": "courier.location.updated",
                "data": location.model_dump(mode="json"),
            },
        )
    return CourierLocationUpdateResponse(location=location, accepted=accepted)


@router.get("/location/me", response_model=Optional[CourierLocationResponse])
async def get_my_courier_location(
    courier: Courier = Depends(get_authenticated_courier),
    service: CourierService = Depends(get_courier_service),
) -> Optional[CourierLocationResponse]:
    return await service.get_courier_location(courier.id)


@router.post(
    "/location/ws-ticket",
    response_model=CourierLocationWebSocketTicketResponse,
)
async def create_courier_location_websocket_ticket(
    courier: Courier = Depends(get_authenticated_courier),
) -> CourierLocationWebSocketTicketResponse:
    now = time.monotonic()
    expired_tickets = [
        ticket
        for ticket, (_, expires_at) in _location_websocket_tickets.items()
        if expires_at <= now
    ]
    for ticket in expired_tickets:
        _location_websocket_tickets.pop(ticket, None)

    ticket = secrets.token_urlsafe(32)
    _location_websocket_tickets[ticket] = (courier.id, now + 30)
    return CourierLocationWebSocketTicketResponse(ticket=ticket)


@router.websocket("/ws/location")
async def courier_location_websocket(websocket: WebSocket) -> None:
    ticket = websocket.query_params.get("ticket")
    ticket_data = _location_websocket_tickets.pop(ticket, None) if ticket else None
    if ticket_data is None or ticket_data[1] <= time.monotonic():
        await websocket.close(code=1008, reason="Authentication is required.")
        return

    channel = f"courier-location:{ticket_data[0]}"
    await ws_manager.connect(websocket, channel)
    try:
        while True:
            message = await websocket.receive_text()
            if message == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        ws_manager.disconnect(websocket, channel)


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
