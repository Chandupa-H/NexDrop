from typing import Optional, List
from app.modules.zones.models import DeliveryZone
from app.modules.zones.schemas import DeliveryZoneCreate, DeliveryZoneUpdate
from app.modules.zones.repository import ZoneRepository


class ZoneService:
    def __init__(self, repository: ZoneRepository):
        self.repository = repository

    async def get_zone(self, zone_id: int) -> Optional[DeliveryZone]:
        return await self.repository.get_by_id(zone_id)

    async def get_zone_by_code(self, code: str) -> Optional[DeliveryZone]:
        return await self.repository.get_by_code(code)

    async def list_zones(self, skip: int = 0, limit: int = 100, active_only: bool = False) -> List[DeliveryZone]:
        return await self.repository.list_all(skip=skip, limit=limit, active_only=active_only)

    async def create_zone(self, payload: DeliveryZoneCreate) -> DeliveryZone:
        zone = DeliveryZone(
            name=payload.name,
            code=payload.code,
            postcodes=payload.postcodes,
            hub_name=payload.hub_name,
            base_fee=payload.base_fee,
            currency=payload.currency,
            avg_delivery_time_mins=payload.avg_delivery_time_mins,
            active_couriers=payload.active_couriers,
            status=payload.status,
            surge_multiplier=payload.surge_multiplier,
            is_active=payload.is_active,
        )
        return await self.repository.create(zone)

    async def update_zone(self, zone_id: int, payload: DeliveryZoneUpdate) -> Optional[DeliveryZone]:
        zone = await self.repository.get_by_id(zone_id)
        if not zone:
            return None

        if payload.name is not None:
            zone.name = payload.name
        if payload.code is not None:
            zone.code = payload.code
        if payload.postcodes is not None:
            zone.postcodes = payload.postcodes
        if payload.hub_name is not None:
            zone.hub_name = payload.hub_name
        if payload.base_fee is not None:
            zone.base_fee = payload.base_fee
        if payload.currency is not None:
            zone.currency = payload.currency
        if payload.avg_delivery_time_mins is not None:
            zone.avg_delivery_time_mins = payload.avg_delivery_time_mins
        if payload.active_couriers is not None:
            zone.active_couriers = payload.active_couriers
        if payload.status is not None:
            zone.status = payload.status
        if payload.surge_multiplier is not None:
            zone.surge_multiplier = payload.surge_multiplier
        if payload.is_active is not None:
            zone.is_active = payload.is_active

        return await self.repository.update(zone)


DeliveryZoneService = ZoneService
