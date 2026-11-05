from datetime import date, datetime, time, timedelta
from typing import Optional, List
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.engine import RowMapping
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.customers.models import Customer
from app.modules.couriers.models import Courier
from app.modules.dispatch.models import DispatchAssignment
from app.modules.parcels.models import Parcel, ParcelStatus


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
                Parcel.delivery_address,
                Parcel.delivery_city,
                Parcel.dimensions.label("size"),
                Parcel.weight_kg.label("weight"),
                Parcel.recipient_name,
                Parcel.recipient_phone,
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
            )
            .order_by(DispatchAssignment.assigned_at.asc())
        )
        if status:
            statement = statement.where(Parcel.status.in_(status))

        result = await self.session.execute(statement)
        return list(result.mappings().all())
