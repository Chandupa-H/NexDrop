from typing import Optional, List, Dict, Any, Tuple
from sqlalchemy import select, func, and_, or_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.dispatch.models import DispatchAssignment, DispatchStatus
from app.modules.parcels.models import Parcel, ParcelStatus
from app.modules.couriers.models import Courier
from app.modules.warehouses.models import Warehouse
from app.modules.users.models import User


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

    async def get_active_by_parcel(self, parcel_id: int) -> Optional[DispatchAssignment]:
        if not self.session:
            return None
        result = await self.session.execute(
            select(DispatchAssignment).where(
                and_(
                    DispatchAssignment.parcel_id == parcel_id,
                    DispatchAssignment.status.in_([DispatchStatus.ASSIGNED, DispatchStatus.ACCEPTED]),
                )
            ).order_by(DispatchAssignment.id.desc())
        )
        return result.scalars().first()

    async def get_courier(self, courier_id: int) -> Optional[Courier]:
        if not self.session:
            return None
        result = await self.session.execute(
            select(Courier).where(Courier.id == courier_id)
        )
        return result.scalars().first()

    async def get_parcel(self, parcel_id: int) -> Optional[Parcel]:
        if not self.session:
            return None
        result = await self.session.execute(
            select(Parcel).where(Parcel.id == parcel_id)
        )
        return result.scalars().first()

    async def get_warehouse(self, warehouse_id: int) -> Optional[Warehouse]:
        if not self.session:
            return None
        result = await self.session.execute(
            select(Warehouse).where(Warehouse.id == warehouse_id)
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

    async def get_couriers_workload(self) -> List[Dict[str, Any]]:
        """
        Calculate active assignments and courier availability across the fleet.
        """
        if not self.session:
            return []

        # Count active assignments per courier
        active_counts_subquery = (
            select(
                DispatchAssignment.courier_id,
                func.count(DispatchAssignment.id).label("active_count"),
            )
            .where(
                DispatchAssignment.status.in_([DispatchStatus.ASSIGNED, DispatchStatus.ACCEPTED])
            )
            .group_by(DispatchAssignment.courier_id)
            .subquery()
        )

        query = (
            select(
                Courier,
                User.full_name,
                func.coalesce(active_counts_subquery.c.active_count, 0).label("active_assignments"),
            )
            .join(User, Courier.user_id == User.id, isouter=True)
            .join(
                active_counts_subquery,
                Courier.id == active_counts_subquery.c.courier_id,
                isouter=True,
            )
        )

        result = await self.session.execute(query)
        workloads = []
        for row in result.all():
            courier, full_name, active_count = row
            if not courier.is_available:
                status_str = "UNAVAILABLE"
            elif active_count >= 5:
                status_str = "BUSY"
            elif active_count > 0:
                status_str = "OPTIMAL"
            else:
                status_str = "AVAILABLE"

            workloads.append({
                "courier_id": courier.id,
                "user_id": courier.user_id,
                "full_name": full_name or f"Courier #{courier.id}",
                "vehicle_type": courier.vehicle_type,
                "is_available": courier.is_available,
                "active_assignments": int(active_count),
                "workload_status": status_str,
            })
        return workloads

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
                "total_parcels": int(total_parcels),
                "unassigned_parcels": int(unassigned_parcels),
                "active_deliveries": int(active_deliveries),
                "completed_deliveries": int(completed_deliveries),
                "failed_deliveries": int(failed_deliveries),
            }
        except Exception:
            return {
                "total_parcels": 0,
                "unassigned_parcels": 0,
                "active_deliveries": 0,
                "completed_deliveries": 0,
                "failed_deliveries": 0,
            }

    async def get_unassigned_parcels(
        self,
        search: Optional[str] = None,
        city: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
    ) -> Tuple[List[Parcel], int, List[str]]:
        """
        Query unassigned (status == PENDING) parcels with search, city filtering,
        pagination, and the distinct list of unassigned cities.
        """
        if not self.session:
            return [], 0, []

        try:
            query = select(Parcel).where(Parcel.status == ParcelStatus.PENDING)
            count_query = select(func.count(Parcel.id)).where(Parcel.status == ParcelStatus.PENDING)
            cities_query = (
                select(Parcel.delivery_city)
                .where(Parcel.status == ParcelStatus.PENDING)
                .distinct()
            )

            if search:
                term = f"%{search.strip()}%"
                search_filter = or_(
                    Parcel.tracking_number.ilike(term),
                    Parcel.recipient_name.ilike(term),
                    Parcel.delivery_city.ilike(term),
                    Parcel.delivery_address.ilike(term),
                    Parcel.recipient_phone.ilike(term),
                )
                query = query.where(search_filter)
                count_query = count_query.where(search_filter)

            if city and city.strip() and city.lower() != "all":
                query = query.where(Parcel.delivery_city.ilike(city.strip()))
                count_query = count_query.where(Parcel.delivery_city.ilike(city.strip()))

            total = (await self.session.execute(count_query)).scalar() or 0

            query = query.order_by(Parcel.created_at.desc()).offset(offset).limit(limit)
            items = list((await self.session.execute(query)).scalars().all())

            cities_res = (await self.session.execute(cities_query)).scalars().all()
            cities = sorted([c for c in cities_res if c])

            return items, total, cities
        except Exception:
            return [], 0, []

    async def get_unassigned_parcel_by_id(self, parcel_id: int) -> Optional[Parcel]:
        """Fetch full details for an unassigned parcel."""
        if not self.session:
            return None
        try:
            stmt = select(Parcel).where(
                Parcel.id == parcel_id,
                Parcel.status == ParcelStatus.PENDING,
            )
            result = await self.session.execute(stmt)
            return result.scalars().first()
        except Exception:
            return None
