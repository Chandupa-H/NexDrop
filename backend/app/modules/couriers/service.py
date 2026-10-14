from typing import Optional, List
from app.modules.couriers.models import Courier
from app.modules.couriers.schemas import CourierCreate, CourierLocationUpdate
from app.modules.couriers.repository import CourierRepository


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
