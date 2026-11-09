from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.warehouses.schemas import (
    WarehouseResponse,
    WarehouseCreate,
    WarehouseUpdate,
)
from app.modules.warehouses.repository import WarehouseRepository
from app.modules.warehouses.service import WarehouseService

router = APIRouter(prefix="/warehouses", tags=["Warehouses"])


def get_warehouse_service(session: AsyncSession = Depends(get_db)) -> WarehouseService:
    return WarehouseService(WarehouseRepository(session))


@router.get("", response_model=List[WarehouseResponse])
async def list_warehouses(
    skip: int = 0,
    limit: int = 100,
    active_only: bool = False,
    service: WarehouseService = Depends(get_warehouse_service),
) -> List[WarehouseResponse]:
    warehouses = await service.list_warehouses(skip=skip, limit=limit, active_only=active_only)
    return [WarehouseResponse.model_validate(w) for w in warehouses]


@router.get("/{warehouse_id}", response_model=WarehouseResponse)
async def get_warehouse(
    warehouse_id: int,
    service: WarehouseService = Depends(get_warehouse_service),
) -> WarehouseResponse:
    warehouse = await service.get_warehouse(warehouse_id)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse with ID {warehouse_id} not found",
        )
    return WarehouseResponse.model_validate(warehouse)


@router.post("", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    payload: WarehouseCreate,
    service: WarehouseService = Depends(get_warehouse_service),
) -> WarehouseResponse:
    warehouse = await service.create_warehouse(payload)
    return WarehouseResponse.model_validate(warehouse)


@router.patch("/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: int,
    payload: WarehouseUpdate,
    service: WarehouseService = Depends(get_warehouse_service),
) -> WarehouseResponse:
    warehouse = await service.update_warehouse(warehouse_id, payload)
    if not warehouse:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Warehouse with ID {warehouse_id} not found",
        )
    return WarehouseResponse.model_validate(warehouse)

