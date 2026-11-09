from datetime import date, datetime, time, timedelta, timezone
from typing import Optional, List
from zoneinfo import ZoneInfo

from sqlalchemy import case, func, or_, select, update
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.models import Customer
from app.modules.couriers.models import Courier, CourierLocation
from app.modules.dispatch.models import DispatchAssignment, DispatchStatus
from app.modules.parcels.models import Parcel, ParcelStatus, ParcelStatusHistory


class CourierRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, courier_id: int) -> Optional[Courier]:
        result = await self.session.execute(select(Courier).where(Courier.id == courier_id))
        return result.scalars().first()

    async def get_by_user_id(self, user_id: int) -> Optional[Courier]:
        result = await self.session.execute(select(Courier).where(Courier.user_id == user_id))
        return result.scalars().first()

    async def list_available(self) -> List[Courier]:
        result = await self.session.execute(
            select(Courier).where(Courier.is_available.is_(True))
        )
        return list(result.scalars().all())

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Courier]:
        result = await self.session.execute(select(Courier).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, courier: Courier) -> Courier:
        self.session.add(courier)
        await self.session.flush()
        await self.session.refresh(courier)
        return courier

    async def get_courier_deliveries(
        self,
        courier_id: int,
        status: Optional[List[ParcelStatus]],
        delivery_date: date,
    ) -> List[RowMapping]:
        day_start = datetime.combine(
            delivery_date, time.min, tzinfo=ZoneInfo("Asia/Colombo")
        )
        day_end = day_start + timedelta(days=1)
        statement = (
            select(
                Parcel.id.label("parcel_id"),
                Parcel.tracking_number,
                Parcel.status,
                Parcel.pickup_address,
                Parcel.pickup_lat,
                Parcel.pickup_lng,
                Parcel.delivery_address,
                Parcel.delivery_city,
                Parcel.dropoff_lat,
                Parcel.dropoff_lng,
                Parcel.dimensions.label("size"),
                Parcel.weight_kg.label("weight"),
                Parcel.recipient_name,
                Parcel.recipient_phone,
                Parcel.special_instructions.label("delivery_instructions"),
                DispatchAssignment.assigned_at,
                Customer.default_address.label("sender_address"),
                Customer.city.label("sender_city"),
            )
            .join(DispatchAssignment, DispatchAssignment.parcel_id == Parcel.id)
            .outerjoin(Customer, Customer.id == Parcel.sender_id)
            .where(
                DispatchAssignment.courier_id == courier_id,
                DispatchAssignment.assigned_at >= day_start,
                DispatchAssignment.assigned_at < day_end,
                DispatchAssignment.status != DispatchStatus.REJECTED,
            )
            .order_by(DispatchAssignment.assigned_at.asc())
        )
        if status:
            statement = statement.where(Parcel.status.in_(status))

        result = await self.session.execute(statement)
        return list(result.mappings().all())

    def _delivery_statement(self, courier_id: int, delivery_id: int):
        completed_at = case(
            (
                Parcel.status.in_(
                    [ParcelStatus.DELIVERED, ParcelStatus.CANCELLED]
                ),
                func.coalesce(DispatchAssignment.completed_at, Parcel.updated_at),
            ),
            else_=None,
        ).label("completed_at")
        return (
            select(
                Parcel.id.label("parcel_id"),
                Parcel.tracking_number,
                Parcel.status,
                Parcel.pickup_address,
                Parcel.pickup_lat,
                Parcel.pickup_lng,
                Parcel.delivery_address,
                Parcel.delivery_city,
                Parcel.dropoff_lat,
                Parcel.dropoff_lng,
                Parcel.dimensions.label("size"),
                Parcel.weight_kg.label("weight"),
                Parcel.recipient_name,
                Parcel.recipient_phone,
                Parcel.special_instructions.label("delivery_instructions"),
                DispatchAssignment.assigned_at,
                Customer.default_address.label("sender_address"),
                Customer.city.label("sender_city"),
                completed_at,
                Parcel.failure_reason,
            )
            .join(DispatchAssignment, DispatchAssignment.parcel_id == Parcel.id)
            .outerjoin(Customer, Customer.id == Parcel.sender_id)
            .where(
                DispatchAssignment.courier_id == courier_id,
                DispatchAssignment.parcel_id == delivery_id,
                DispatchAssignment.status != DispatchStatus.REJECTED,
            )
        )

    async def get_assigned_delivery(
        self, courier_id: int, delivery_id: int
    ) -> Optional[RowMapping]:
        result = await self.session.execute(
            self._delivery_statement(courier_id, delivery_id)
        )
        return result.mappings().first()

    async def parcel_exists(self, delivery_id: int) -> bool:
        result = await self.session.execute(
            select(Parcel.id).where(Parcel.id == delivery_id)
        )
        return result.scalar_one_or_none() is not None

    async def get_status_history(self, delivery_id: int) -> List[ParcelStatusHistory]:
        result = await self.session.execute(
            select(ParcelStatusHistory)
            .where(ParcelStatusHistory.parcel_id == delivery_id)
            .order_by(
                ParcelStatusHistory.occurred_at.asc(),
                ParcelStatusHistory.id.asc(),
            )
        )
        return list(result.scalars().all())

    async def list_delivery_history(
        self,
        courier_id: int,
        statuses: List[ParcelStatus],
        start_at: Optional[datetime],
        end_before: Optional[datetime],
        query: Optional[str],
        page: int,
        page_size: int,
    ) -> tuple[List[RowMapping], int, int, int]:
        completed_at = func.coalesce(
            DispatchAssignment.completed_at, Parcel.updated_at
        ).label("completed_at")
        base_filters = [
            DispatchAssignment.courier_id == courier_id,
            DispatchAssignment.status != DispatchStatus.REJECTED,
            Parcel.status.in_(statuses),
        ]
        if start_at is not None:
            base_filters.append(completed_at >= start_at)
        if end_before is not None:
            base_filters.append(completed_at < end_before)
        if query:
            escaped = query.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            pattern = f"%{escaped}%"
            base_filters.append(
                or_(
                    Parcel.tracking_number.ilike(pattern, escape="\\"),
                    Parcel.recipient_name.ilike(pattern, escape="\\"),
                )
            )

        statement = (
            select(
                Parcel.id.label("parcel_id"),
                Parcel.tracking_number,
                Parcel.status,
                func.coalesce(
                    Parcel.pickup_address,
                    Customer.default_address,
                    "Address unavailable",
                ).label("pickup_address"),
                Parcel.delivery_address,
                Parcel.delivery_city,
                Parcel.recipient_name,
                Parcel.failure_reason,
                completed_at,
            )
            .join(DispatchAssignment, DispatchAssignment.parcel_id == Parcel.id)
            .outerjoin(Customer, Customer.id == Parcel.sender_id)
            .where(*base_filters)
            .order_by(completed_at.desc(), Parcel.id.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
        count_statement = (
            select(
                func.count(Parcel.id).label("total"),
                func.coalesce(
                    func.sum(
                        case((Parcel.status == ParcelStatus.DELIVERED, 1), else_=0)
                    ),
                    0,
                ).label("delivered"),
                func.coalesce(
                    func.sum(
                        case((Parcel.status == ParcelStatus.CANCELLED, 1), else_=0)
                    ),
                    0,
                ).label("cancelled"),
            )
            .join(DispatchAssignment, DispatchAssignment.parcel_id == Parcel.id)
            .where(*base_filters)
        )
        rows_result = await self.session.execute(statement)
        count_result = await self.session.execute(count_statement)
        counts = count_result.mappings().one()
        return (
            list(rows_result.mappings().all()),
            counts["total"],
            counts["delivered"],
            counts["cancelled"],
        )

    async def save_status_history(
        self,
        parcel_id: int,
        status: ParcelStatus,
        actor: str,
        note: Optional[str] = None,
        proof_reference: Optional[str] = None,
    ) -> ParcelStatusHistory:
        entry = ParcelStatusHistory(
            parcel_id=parcel_id,
            status=status,
            occurred_at=datetime.now(timezone.utc),
            actor=actor,
            note=note,
            proof_reference=proof_reference,
        )
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def complete_assignment(
        self, courier_id: int, delivery_id: int, completed_at: datetime
    ) -> None:
        await self.session.execute(
            update(DispatchAssignment)
            .where(
                DispatchAssignment.courier_id == courier_id,
                DispatchAssignment.parcel_id == delivery_id,
                DispatchAssignment.status != DispatchStatus.REJECTED,
            )
            .values(status=DispatchStatus.COMPLETED, completed_at=completed_at)
        )

    async def get_assigned_parcel_for_update(
        self, courier_id: int, delivery_id: int
    ) -> Optional[Parcel]:
        result = await self.session.execute(
            select(Parcel)
            .join(DispatchAssignment, DispatchAssignment.parcel_id == Parcel.id)
            .where(
                DispatchAssignment.courier_id == courier_id,
                DispatchAssignment.parcel_id == delivery_id,
                DispatchAssignment.status != DispatchStatus.REJECTED,
            )
            .with_for_update()
        )
        return result.scalars().first()

    async def get_active_assigned_delivery(
        self, courier_id: int, delivery_id: Optional[int] = None
    ) -> Optional[Parcel]:
        statement = (
            select(Parcel)
            .join(DispatchAssignment, DispatchAssignment.parcel_id == Parcel.id)
            .where(
                DispatchAssignment.courier_id == courier_id,
                DispatchAssignment.status.in_(
                    [DispatchStatus.ASSIGNED, DispatchStatus.ACCEPTED]
                ),
                Parcel.status.in_(
                    [
                        ParcelStatus.PENDING,
                        ParcelStatus.PICKED_UP,
                        ParcelStatus.IN_TRANSIT,
                        ParcelStatus.OUT_FOR_DELIVERY,
                    ]
                ),
            )
            .order_by(DispatchAssignment.assigned_at.asc())
        )
        if delivery_id is not None:
            statement = statement.where(Parcel.id == delivery_id)
        result = await self.session.execute(statement.limit(1))
        return result.scalars().first()

    async def get_latest_location(self, courier_id: int) -> Optional[CourierLocation]:
        result = await self.session.execute(
            select(CourierLocation).where(CourierLocation.courier_id == courier_id)
        )
        return result.scalars().first()

    async def save_location(
        self,
        courier_id: int,
        lat: float,
        lng: float,
        accuracy: Optional[float],
        heading: Optional[float],
        speed: Optional[float],
        delivery_id: int,
    ) -> tuple[CourierLocation, bool]:
        location = await self.get_latest_location(courier_id)
        now = datetime.now(timezone.utc)
        if location is not None:
            updated_at = location.updated_at
            if updated_at.tzinfo is None:
                updated_at = updated_at.replace(tzinfo=timezone.utc)
            if (now - updated_at).total_seconds() < 3:
                return location, False
            location.lat = lat
            location.lng = lng
            location.accuracy = accuracy
            location.heading = heading
            location.speed = speed
            location.active_delivery_id = delivery_id
            location.updated_at = now
        else:
            location = CourierLocation(
                courier_id=courier_id,
                lat=lat,
                lng=lng,
                accuracy=accuracy,
                heading=heading,
                speed=speed,
                active_delivery_id=delivery_id,
                updated_at=now,
            )
            self.session.add(location)
        await self.session.flush()
        return location, True

    async def update_delivery_status(
        self, courier_id: int, delivery_id: int, new_status: ParcelStatus
    ) -> Optional[Parcel]:
        parcel = await self.get_assigned_parcel_for_update(courier_id, delivery_id)
        if parcel is None:
            return None
        parcel.status = new_status
        await self.session.flush()
        return parcel
