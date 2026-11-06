from typing import Optional, List
from app.modules.warehouses.models import Warehouse
from app.modules.warehouses.schemas import WarehouseCreate, WarehouseUpdate
from app.modules.warehouses.repository import WarehouseRepository


class WarehouseService:
    def __init__(self, repository: WarehouseRepository):
        self.repository = repository

    async def get_warehouse(self, warehouse_id: int) -> Optional[Warehouse]:
        return await self.repository.get_by_id(warehouse_id)

    async def list_warehouses(self, skip: int = 0, limit: int = 100, active_only: bool = False) -> List[Warehouse]:
        return await self.repository.list_all(skip=skip, limit=limit, active_only=active_only)

    async def create_warehouse(self, payload: WarehouseCreate) -> Warehouse:
        warehouse = Warehouse(
            name=payload.name,
            address=payload.address,
            city=payload.city,
            contact_number=payload.contact_number,
            is_active=payload.is_active,
        )
        return await self.repository.create(warehouse)

    async def update_warehouse(self, warehouse_id: int, payload: WarehouseUpdate) -> Optional[Warehouse]:
        warehouse = await self.repository.get_by_id(warehouse_id)
        if not warehouse:
            return None

        if payload.name is not None:
            warehouse.name = payload.name
        if payload.address is not None:
            warehouse.address = payload.address
        if payload.city is not None:
            warehouse.city = payload.city
        if payload.contact_number is not None:
            warehouse.contact_number = payload.contact_number
        if payload.is_active is not None:
            warehouse.is_active = payload.is_active

        return await self.repository.update(warehouse)

