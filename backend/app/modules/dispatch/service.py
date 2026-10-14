from datetime import datetime, timezone
from typing import Optional, List
from app.modules.dispatch.models import DispatchAssignment, DispatchStatus
from app.modules.dispatch.schemas import DispatchCreate, DispatchStatusUpdate
from app.modules.dispatch.repository import DispatchRepository


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
        assignment = DispatchAssignment(
            parcel_id=payload.parcel_id,
            courier_id=payload.courier_id,
            status=DispatchStatus.ASSIGNED,
            assigned_at=datetime.now(timezone.utc),
            notes=payload.notes,
        )
        return await self.repository.create(assignment)

    async def update_status(self, assignment_id: int, payload: DispatchStatusUpdate) -> Optional[DispatchAssignment]:
        assignment = await self.repository.get_by_id(assignment_id)
        if not assignment:
            return None
        assignment.status = payload.status
        if payload.notes:
            assignment.notes = payload.notes
        if payload.status == DispatchStatus.COMPLETED:
            assignment.completed_at = datetime.now(timezone.utc)
        await self.repository.session.flush()
        return assignment
