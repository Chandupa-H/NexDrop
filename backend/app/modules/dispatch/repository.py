from typing import Optional, List, Dict, Any
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.dispatch.models import DispatchAssignment
from app.modules.parcels.models import Parcel, ParcelStatus


class DispatchRepository:
    def __init__(self, session: Optional[AsyncSession]):
        self.session = session

    async def get_by_id(self, assignment_id: int) -> Optional[DispatchAssignment]:
        if not self.session:
            return None
        result = await self.session.execute(
            select(DispatchAssignment).where(DispatchAssignment.id == assignment_id)
        )
        return result.scalars().first()

    async def list_by_courier(self, courier_id: int) -> List[DispatchAssignment]:
        if not self.session:
            return []
        result = await self.session.execute(
            select(DispatchAssignment).where(DispatchAssignment.courier_id == courier_id)
        )
        return list(result.scalars().all())

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[DispatchAssignment]:
        if not self.session:
            return []
        result = await self.session.execute(select(DispatchAssignment).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, assignment: DispatchAssignment) -> DispatchAssignment:
        if not self.session:
            raise RuntimeError("Database session unavailable")
        self.session.add(assignment)
        await self.session.flush()
        await self.session.refresh(assignment)
        return assignment

    async def get_dashboard_stats(self) -> Dict[str, int]:
        """Strictly read-only aggregation of parcel delivery metrics."""
        if not self.session:
            return {
                "total_parcels": 0,
                "unassigned_parcels": 0,
                "active_deliveries": 0,
                "completed_deliveries": 0,
                "failed_deliveries": 0,
            }
        try:
            total_stmt = select(func.count(Parcel.id))
            total_parcels = (await self.session.execute(total_stmt)).scalar() or 0

            unassigned_stmt = select(func.count(Parcel.id)).where(Parcel.status == ParcelStatus.PENDING)
            unassigned_parcels = (await self.session.execute(unassigned_stmt)).scalar() or 0

            active_stmt = select(func.count(Parcel.id)).where(
                Parcel.status.in_([
                    ParcelStatus.PICKED_UP,
                    ParcelStatus.IN_TRANSIT,
                    ParcelStatus.OUT_FOR_DELIVERY,
                ])
            )
            active_deliveries = (await self.session.execute(active_stmt)).scalar() or 0

            completed_stmt = select(func.count(Parcel.id)).where(Parcel.status == ParcelStatus.DELIVERED)
            completed_deliveries = (await self.session.execute(completed_stmt)).scalar() or 0

            failed_stmt = select(func.count(Parcel.id)).where(Parcel.status == ParcelStatus.CANCELLED)
            failed_deliveries = (await self.session.execute(failed_stmt)).scalar() or 0

            return {
                "total_parcels": total_parcels,
                "unassigned_parcels": unassigned_parcels,
                "active_deliveries": active_deliveries,
                "completed_deliveries": completed_deliveries,
                "failed_deliveries": failed_deliveries,
            }
        except Exception:
            return {
                "total_parcels": 0,
                "unassigned_parcels": 0,
                "active_deliveries": 0,
                "completed_deliveries": 0,
                "failed_deliveries": 0,
            }
