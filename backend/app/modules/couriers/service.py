from datetime import date, datetime, time, timedelta, timezone
from typing import Optional, List
from zoneinfo import ZoneInfo
from fastapi import HTTPException, status as http_status
from app.modules.couriers.models import Courier
from app.modules.couriers.schemas import (
    CourierCreate,
    CourierLocationUpdate,
    CourierLocationResponse,
    CourierLocationUpdateRequest,
    DeliveryDestination,
    DeliveryDetail,
    DeliveryHistoryItem,
    DeliveryHistoryResponse,
    DeliveryHistorySummary,
    DeliveryListItem,
    DeliveryTrackingResponse,
    StatusHistoryEntry,
)
from app.modules.couriers.repository import CourierRepository
from app.modules.parcels.models import ParcelStatus

ACTIVE_DELIVERY_STATUSES = {
    ParcelStatus.PENDING,
    ParcelStatus.PICKED_UP,
    ParcelStatus.IN_TRANSIT,
    ParcelStatus.OUT_FOR_DELIVERY,
}

VALID_STATUS_TRANSITIONS = {
    ParcelStatus.PENDING: {ParcelStatus.PICKED_UP, ParcelStatus.CANCELLED},
    ParcelStatus.PICKED_UP: {ParcelStatus.IN_TRANSIT, ParcelStatus.CANCELLED},
    ParcelStatus.IN_TRANSIT: {ParcelStatus.OUT_FOR_DELIVERY, ParcelStatus.CANCELLED},
    ParcelStatus.OUT_FOR_DELIVERY: {ParcelStatus.DELIVERED, ParcelStatus.CANCELLED},
    ParcelStatus.DELIVERED: set(),
    ParcelStatus.CANCELLED: set(),
}


class CourierService:
    def __init__(self, repository: CourierRepository):
        self.repository = repository

    async def get_courier(self, courier_id: int) -> Optional[Courier]:
        return await self.repository.get_by_id(courier_id)

    async def list_available(self) -> List[Courier]:
        return await self.repository.list_available()

    async def list_couriers(self, skip: int = 0, limit: int = 100) -> List[Courier]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def create_courier(self, payload: CourierCreate) -> Courier:
        courier = Courier(
            user_id=payload.user_id,
            vehicle_type=payload.vehicle_type,
            license_plate=payload.license_plate,
            is_available=payload.is_available,
        )
        return await self.repository.create(courier)

    async def update_location(self, courier_id: int, payload: CourierLocationUpdate) -> Optional[Courier]:
        courier = await self.repository.get_by_id(courier_id)
        if not courier:
            return None
        courier.current_latitude = payload.current_latitude
        courier.current_longitude = payload.current_longitude
        await self.repository.session.flush()
        return courier

    async def get_courier_deliveries(
        self,
        courier_id: int,
        status: Optional[List[ParcelStatus]],
        delivery_date: date,
    ) -> List[DeliveryListItem]:
        rows = await self.repository.get_courier_deliveries(
            courier_id, status, delivery_date
        )
        return [self._delivery_from_row(row) for row in rows]

    @staticmethod
    def _delivery_from_row(row) -> DeliveryListItem:
        return DeliveryListItem(
            parcel_id=row["parcel_id"],
            tracking_number=row["tracking_number"],
            status=row["status"],
            pickup_address=row["pickup_address"]
            or ", ".join(
                part for part in (row["sender_address"], row["sender_city"]) if part
            ),
            dropoff_address=", ".join(
                part for part in (row["delivery_address"], row["delivery_city"]) if part
            ),
            size=row["size"],
            weight=row["weight"],
            recipient_name=row["recipient_name"],
            recipient_phone=row["recipient_phone"],
            assigned_at=row["assigned_at"],
            pickup_lat=row["pickup_lat"],
            pickup_lng=row["pickup_lng"],
            dropoff_lat=row["dropoff_lat"],
            dropoff_lng=row["dropoff_lng"],
            delivery_instructions=row["delivery_instructions"],
        )

    async def get_assigned_delivery(
        self, courier_id: int, delivery_id: int
    ) -> Optional[DeliveryListItem]:
        row = await self.repository.get_assigned_delivery(courier_id, delivery_id)
        return self._delivery_from_row(row) if row is not None else None

    async def get_assigned_delivery_detail(
        self, courier_id: int, delivery_id: int
    ) -> Optional[DeliveryDetail]:
        row = await self.repository.get_assigned_delivery(courier_id, delivery_id)
        if row is None:
            if await self.repository.parcel_exists(delivery_id):
                raise HTTPException(
                    status_code=http_status.HTTP_403_FORBIDDEN,
                    detail="Access denied.",
                )
            return None

        entries = await self.repository.get_status_history(delivery_id)
        delivery = self._delivery_from_row(row)
        return DeliveryDetail(
            **delivery.model_dump(),
            completed_at=row["completed_at"],
            failure_reason=row["failure_reason"],
            status_history=[
                StatusHistoryEntry(
                    status=entry.status,
                    timestamp=entry.occurred_at,
                    note=entry.note,
                    proof_reference=entry.proof_reference,
                    actor=entry.actor,
                )
                for entry in entries
            ],
        )

    async def get_courier_delivery_history(
        self,
        courier_id: int,
        status: Optional[ParcelStatus],
        start_date: Optional[date],
        end_date: Optional[date],
        query: Optional[str],
        page: int,
        page_size: int,
    ) -> DeliveryHistoryResponse:
        start_at = (
            datetime.combine(start_date, time.min, tzinfo=ZoneInfo("Asia/Colombo"))
            .astimezone(timezone.utc)
            if start_date
            else None
        )
        end_before = (
            datetime.combine(
                end_date + timedelta(days=1),
                time.min,
                tzinfo=ZoneInfo("Asia/Colombo"),
            ).astimezone(timezone.utc)
            if end_date
            else None
        )
        statuses = [status] if status else [
            ParcelStatus.DELIVERED,
            ParcelStatus.CANCELLED,
        ]
        rows, total, delivered, cancelled = await self.repository.list_delivery_history(
            courier_id,
            statuses,
            start_at,
            end_before,
            query.strip() if query else None,
            page,
            page_size,
        )
        return DeliveryHistoryResponse(
            items=[
                DeliveryHistoryItem(
                    parcel_id=row["parcel_id"],
                    tracking_number=row["tracking_number"],
                    status=row["status"],
                    pickup_address=row["pickup_address"] or "Address unavailable",
                    dropoff_address=", ".join(
                        part
                        for part in (row["delivery_address"], row["delivery_city"])
                        if part
                    ),
                    recipient_name=row["recipient_name"],
                    completed_at=row["completed_at"],
                    failure_reason=row["failure_reason"],
                )
                for row in rows
            ],
            total=total,
            page=page,
            page_size=page_size,
            history_summary=DeliveryHistorySummary(
                delivered=delivered,
                cancelled=cancelled,
                total=total,
            ),
        )

    async def update_assigned_delivery_status(
        self,
        courier_id: int,
        delivery_id: int,
        next_status: ParcelStatus,
        note: Optional[str] = None,
        proof_reference: Optional[str] = None,
        failure_reason: Optional[str] = None,
    ) -> Optional[DeliveryListItem]:
        parcel = await self.repository.get_assigned_parcel_for_update(
            courier_id, delivery_id
        )
        if parcel is None:
            return None
        if next_status not in VALID_STATUS_TRANSITIONS[parcel.status]:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail=f"Invalid transition from '{parcel.status.value}' to '{next_status.value}'",
            )
        parcel.status = next_status
        if failure_reason is not None:
            parcel.failure_reason = failure_reason
        await self.repository.session.flush()
        occurred_at = datetime.now(timezone.utc)
        await self.repository.save_status_history(
            delivery_id,
            next_status,
            actor="courier",
            note=note,
            proof_reference=proof_reference,
        )
        if next_status in {ParcelStatus.DELIVERED, ParcelStatus.CANCELLED}:
            await self.repository.complete_assignment(
                courier_id, delivery_id, occurred_at
            )
        return await self.get_assigned_delivery(courier_id, delivery_id)

    async def post_courier_location(
        self, courier: Courier, payload: CourierLocationUpdateRequest
    ) -> tuple[CourierLocationResponse, bool]:
        active_delivery = None
        if payload.delivery_id is not None:
            active_delivery = await self.repository.get_active_assigned_delivery(
                courier.id, payload.delivery_id
            )
        if payload.delivery_id is not None and active_delivery is None:
            raise HTTPException(
                status_code=http_status.HTTP_409_CONFLICT,
                detail="Location updates require an active delivery assigned to this courier.",
            )
        location, accepted = await self.repository.save_location(
            courier_id=courier.id,
            lat=payload.lat,
            lng=payload.lng,
            accuracy=payload.accuracy,
            heading=payload.heading,
            speed=payload.speed,
            delivery_id=active_delivery.id if active_delivery is not None else None,
        )
        return self._location_response(location), accepted

    async def get_courier_location(
        self, courier_id: int
    ) -> Optional[CourierLocationResponse]:
        location = await self.repository.get_latest_location(courier_id)
        return self._location_response(location) if location is not None else None

    async def get_delivery_tracking(
        self, courier_id: int, delivery_id: int
    ) -> Optional[DeliveryTrackingResponse]:
        delivery = await self.get_assigned_delivery(courier_id, delivery_id)
        if delivery is None:
            return None
        terminal_status = delivery.status in {
            ParcelStatus.DELIVERED,
            ParcelStatus.CANCELLED,
        }
        location = None if terminal_status else await self.get_courier_location(courier_id)
        if delivery.status == ParcelStatus.PENDING:
            destination = DeliveryDestination(
                address=delivery.pickup_address,
                lat=delivery.pickup_lat,
                lng=delivery.pickup_lng,
            )
            next_action = "Navigate to pickup location"
        elif delivery.status in {
            ParcelStatus.PICKED_UP,
            ParcelStatus.IN_TRANSIT,
            ParcelStatus.OUT_FOR_DELIVERY,
        }:
            destination = DeliveryDestination(
                address=delivery.dropoff_address,
                lat=delivery.dropoff_lat,
                lng=delivery.dropoff_lng,
            )
            next_action = "Navigate to delivery location"
        elif delivery.status == ParcelStatus.DELIVERED:
            destination = None
            next_action = "Delivery completed"
        else:
            destination = None
            next_action = "Delivery cancelled"
        return DeliveryTrackingResponse(
            delivery=delivery,
            courier_location=location,
            location_source="live" if location is not None else "unavailable",
            next_destination=destination,
            next_action=next_action,
        )

    @staticmethod
    def _location_response(location) -> CourierLocationResponse:
        return CourierLocationResponse(
            courier_id=location.courier_id,
            lat=location.lat,
            lng=location.lng,
            accuracy=location.accuracy,
            heading=location.heading,
            speed=location.speed,
            updated_at=location.updated_at,
            active_delivery_id=location.active_delivery_id,
        )
