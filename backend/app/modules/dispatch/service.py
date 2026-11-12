from datetime import datetime, timezone
from typing import Optional, List, Dict, Tuple
from app.modules.dispatch.models import DispatchAssignment, DispatchStatus
from app.modules.dispatch.schemas import DispatchCreate, DispatchStatusUpdate
from app.modules.dispatch.repository import DispatchRepository
from app.modules.parcels.models import Parcel


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

    async def get_dashboard_stats(self) -> Dict[str, int]:
        return await self.repository.get_dashboard_stats()

    async def get_unassigned_parcels(
        self,
        search: Optional[str] = None,
        city: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
    ) -> Tuple[List[Parcel], int, List[str]]:
        return await self.repository.get_unassigned_parcels(
            search=search, city=city, limit=limit, offset=offset
        )

    async def get_unassigned_parcel_by_id(self, parcel_id: int) -> Optional[Parcel]:
        return await self.repository.get_unassigned_parcel_by_id(parcel_id)
