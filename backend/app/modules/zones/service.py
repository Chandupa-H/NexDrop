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
            description=payload.description,
            postcodes=payload.postcodes,
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
        if payload.description is not None:
            zone.description = payload.description
        if payload.postcodes is not None:
            zone.postcodes = payload.postcodes
        if payload.is_active is not None:
            zone.is_active = payload.is_active

        return await self.repository.update(zone)


DeliveryZoneService = ZoneService

