from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from app.modules.dispatch.models import DispatchAssignment, DispatchStatus
from app.modules.dispatch.schemas import (
    DispatchCreate,
    DispatchStatusUpdate,
    CourierReassignRequest,
    WarehouseReceiveRequest,
    WarehouseHandoverRequest,
    CourierWorkloadItem,
)
from app.modules.dispatch.repository import DispatchRepository
from app.modules.parcels.models import ParcelStatus, CurrentLocationType, DeliveryMethod
from app.integrations.rabbitmq.client import rabbitmq_client


class DispatchService:
    def __init__(self, repository: DispatchRepository):
        self.repository = repository

    async def get_assignment(self, assignment_id: int) -> Optional[DispatchAssignment]:
        return await self.repository.get_by_id(assignment_id)

    async def list_by_courier(self, courier_id: int) -> List[DispatchAssignment]:
        return await self.repository.list_by_courier(courier_id)

    async def list_assignments(self, skip: int = 0, limit: int = 100) -> List[DispatchAssignment]:
        return await self.repository.list_all(skip=skip, limit=limit)

    async def assign_parcel(self, payload: DispatchCreate) -> DispatchAssignment:
        """
        Assign courier to parcel with courier availability validation.
        Publishes CourierAssigned event.
        """
        # 1. Validate parcel
        parcel = await self.repository.get_parcel(payload.parcel_id)
        if not parcel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parcel with ID {payload.parcel_id} not found",
            )
        if parcel.status in [ParcelStatus.DELIVERED, ParcelStatus.CANCELLED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign parcel with status '{parcel.status.value}'",
            )

        # 2. Validate courier availability
        courier = await self.repository.get_courier(payload.courier_id)
        if not courier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Courier with ID {payload.courier_id} not found",
            )
        if not courier.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Courier with ID {payload.courier_id} is currently unavailable",
            )

        # 3. Create assignment record
        assignment = DispatchAssignment(
            parcel_id=payload.parcel_id,
            courier_id=payload.courier_id,
            status=DispatchStatus.ASSIGNED,
            assigned_at=datetime.now(timezone.utc),
            notes=payload.notes,
        )
        saved = await self.repository.create(assignment)

        # 4. Update parcel state
        if parcel.status == ParcelStatus.PENDING:
            parcel.status = ParcelStatus.PICKED_UP
        parcel.current_location_type = CurrentLocationType.COURIER

        if self.repository.session:
            await self.repository.session.flush()

        # 5. Publish CourierAssigned event
        await rabbitmq_client.publish_message(
            "dispatch.courier.assigned",
            {
                "event": "CourierAssigned",
                "assignment_id": saved.id,
                "parcel_id": saved.parcel_id,
                "courier_id": saved.courier_id,
                "assigned_at": saved.assigned_at.isoformat(),
            },
        )

        return saved

    async def reassign_courier(
        self, assignment_id: int, payload: CourierReassignRequest
    ) -> DispatchAssignment:
        """
        Reassign parcel to a different courier.
        Validates new courier availability and publishes CourierReassigned event.
        """
        current_assignment = await self.repository.get_by_id(assignment_id)
        if not current_assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Dispatch assignment {assignment_id} not found",
            )

        if current_assignment.status == DispatchStatus.COMPLETED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot reassign an already completed assignment",
            )

        # Validate new courier availability
        new_courier = await self.repository.get_courier(payload.new_courier_id)
        if not new_courier:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"New courier with ID {payload.new_courier_id} not found",
            )
        if not new_courier.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"New courier with ID {payload.new_courier_id} is currently unavailable",
            )

        # Close/reject previous assignment
        previous_courier_id = current_assignment.courier_id
        current_assignment.status = DispatchStatus.REJECTED
        current_assignment.notes = (
            f"Reassigned to courier {payload.new_courier_id}. Reason: {payload.reason or 'N/A'}"
        )
        current_assignment.completed_at = datetime.now(timezone.utc)

        # Create new assignment
        new_assignment = DispatchAssignment(
            parcel_id=current_assignment.parcel_id,
            courier_id=payload.new_courier_id,
            status=DispatchStatus.ASSIGNED,
            assigned_at=datetime.now(timezone.utc),
            notes=f"Reassigned from courier {previous_courier_id}",
        )
        saved = await self.repository.create(new_assignment)

        # Publish CourierReassigned event
        await rabbitmq_client.publish_message(
            "dispatch.courier.reassigned",
            {
                "event": "CourierReassigned",
                "previous_assignment_id": current_assignment.id,
                "previous_courier_id": previous_courier_id,
                "new_assignment_id": saved.id,
                "new_courier_id": saved.courier_id,
                "parcel_id": saved.parcel_id,
                "reason": payload.reason,
                "reassigned_at": datetime.now(timezone.utc).isoformat(),
            },
        )

        return saved

    async def warehouse_receive_parcel(self, payload: WarehouseReceiveRequest) -> Dict[str, Any]:
        """
        Warehouse dispatch: record parcel receipt into a warehouse hub.
        Updates parcel location/method and publishes WarehouseParcelReceived event.
        """
        parcel = await self.repository.get_parcel(payload.parcel_id)
        if not parcel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parcel with ID {payload.parcel_id} not found",
            )

        warehouse = await self.repository.get_warehouse(payload.warehouse_id)
        if not warehouse:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Warehouse with ID {payload.warehouse_id} not found",
            )
        if not warehouse.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Warehouse '{warehouse.name}' is inactive",
            )

        # Mark active transit assignment as completed
        active_assignment = await self.repository.get_active_by_parcel(payload.parcel_id)
        if active_assignment:
            active_assignment.status = DispatchStatus.COMPLETED
            active_assignment.completed_at = datetime.now(timezone.utc)

        # Update parcel warehouse routing & location
        parcel.delivery_method = DeliveryMethod.VIA_WAREHOUSE
        parcel.current_location_type = CurrentLocationType.WAREHOUSE
        parcel.current_warehouse_id = payload.warehouse_id
        parcel.status = ParcelStatus.IN_TRANSIT

        if self.repository.session:
            await self.repository.session.flush()

        # Publish WarehouseParcelReceived event
        await rabbitmq_client.publish_message(
            "dispatch.warehouse.received",
            {
                "event": "WarehouseParcelReceived",
                "parcel_id": payload.parcel_id,
                "warehouse_id": payload.warehouse_id,
                "received_at": datetime.now(timezone.utc).isoformat(),
                "notes": payload.notes,
            },
        )

        return {
            "status": "success",
            "message": f"Parcel {parcel.tracking_number} received at warehouse {warehouse.name}",
            "parcel_id": parcel.id,
            "warehouse_id": warehouse.id,
            "current_location_type": parcel.current_location_type.value,
        }

    async def warehouse_handover_parcel(
        self, payload: WarehouseHandoverRequest
    ) -> DispatchAssignment:
        """
        Warehouse dispatch: Handover parcel from warehouse to delivery courier for last-mile delivery.
        """
        parcel = await self.repository.get_parcel(payload.parcel_id)
        if not parcel:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Parcel with ID {payload.parcel_id} not found",
            )

        courier = await self.repository.get_courier(payload.courier_id)
        if not courier or not courier.is_available:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Courier with ID {payload.courier_id} is unavailable for warehouse handover",
            )

        # Assign courier for delivery leg
        assignment = DispatchAssignment(
            parcel_id=payload.parcel_id,
            courier_id=payload.courier_id,
            status=DispatchStatus.ASSIGNED,
            assigned_at=datetime.now(timezone.utc),
            notes=f"Warehouse {payload.warehouse_id} handover. {payload.notes or ''}".strip(),
        )
        saved = await self.repository.create(assignment)

        # Update parcel state
        parcel.current_location_type = CurrentLocationType.COURIER
        parcel.status = ParcelStatus.OUT_FOR_DELIVERY

        if self.repository.session:
            await self.repository.session.flush()

        # Publish event
        await rabbitmq_client.publish_message(
            "dispatch.courier.assigned",
            {
                "event": "CourierAssigned",
                "assignment_id": saved.id,
                "parcel_id": saved.parcel_id,
                "courier_id": saved.courier_id,
                "warehouse_id": payload.warehouse_id,
                "handover": True,
                "assigned_at": saved.assigned_at.isoformat(),
            },
        )

        return saved

    async def get_courier_workload(self) -> List[CourierWorkloadItem]:
        """
        Calculate active assignments and courier availability across the fleet.
        """
        workloads = await self.repository.get_couriers_workload()
        return [CourierWorkloadItem(**w) for w in workloads]

    async def update_status(
        self, assignment_id: int, payload: DispatchStatusUpdate
    ) -> Optional[DispatchAssignment]:
        assignment = await self.repository.get_by_id(assignment_id)
        if not assignment:
            return None
        assignment.status = payload.status
        if payload.notes:
            assignment.notes = payload.notes
        if payload.status == DispatchStatus.COMPLETED:
            assignment.completed_at = datetime.now(timezone.utc)
        if self.repository.session:
            await self.repository.session.flush()
        return assignment

    async def get_dashboard_stats(self) -> Dict[str, int]:
        return await self.repository.get_dashboard_stats()
