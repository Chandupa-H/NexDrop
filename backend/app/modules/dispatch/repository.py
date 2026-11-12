from datetime import datetime
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

    async def get_dispatch_history(
        self,
        status: Optional[str] = None,
        courier_id: Optional[int] = None,
        search: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
        limit: int = 10,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int, List[str], List[Dict[str, Any]]]:
        """
        Query completed, failed, and historical courier assignments with filtering,
        search, pagination, and available filter metadata.
        """
        statuses = ["completed", "rejected", "assigned", "accepted"]
        if not self.session:
            return [], 0, statuses, []

        try:
            query = (
                select(DispatchAssignment, Parcel, Courier, User)
                .join(Parcel, DispatchAssignment.parcel_id == Parcel.id)
                .outerjoin(Courier, DispatchAssignment.courier_id == Courier.id)
                .outerjoin(User, Courier.user_id == User.id)
            )
            count_query = (
                select(func.count(DispatchAssignment.id))
                .join(Parcel, DispatchAssignment.parcel_id == Parcel.id)
                .outerjoin(Courier, DispatchAssignment.courier_id == Courier.id)
                .outerjoin(User, Courier.user_id == User.id)
            )

            # 1. Filter by assignment status (completed, failed/rejected, assigned, accepted)
            if status and status.strip() and status.lower() != "all":
                st = status.strip().lower()
                if st == "failed":
                    query = query.where(DispatchAssignment.status == DispatchStatus.REJECTED)
                    count_query = count_query.where(DispatchAssignment.status == DispatchStatus.REJECTED)
                elif st in [s.value for s in DispatchStatus]:
                    query = query.where(DispatchAssignment.status == DispatchStatus(st))
                    count_query = count_query.where(DispatchAssignment.status == DispatchStatus(st))

            # 2. Filter by courier ID
            if courier_id and courier_id > 0:
                query = query.where(DispatchAssignment.courier_id == courier_id)
                count_query = count_query.where(DispatchAssignment.courier_id == courier_id)

            # 3. Search across parcel tracking, recipient, city, address, courier name, and notes
            if search and search.strip():
                term = f"%{search.strip()}%"
                search_expr = or_(
                    Parcel.tracking_number.ilike(term),
                    Parcel.recipient_name.ilike(term),
                    Parcel.recipient_phone.ilike(term),
                    Parcel.delivery_city.ilike(term),
                    Parcel.delivery_address.ilike(term),
                    User.full_name.ilike(term),
                    DispatchAssignment.notes.ilike(term),
                )
                query = query.where(search_expr)
                count_query = count_query.where(search_expr)

            # 4. Date range filters
            if start_date:
                query = query.where(DispatchAssignment.assigned_at >= start_date)
                count_query = count_query.where(DispatchAssignment.assigned_at >= start_date)

            if end_date:
                query = query.where(DispatchAssignment.assigned_at <= end_date)
                count_query = count_query.where(DispatchAssignment.assigned_at <= end_date)

            total = (await self.session.execute(count_query)).scalar() or 0

            query = (
                query.order_by(DispatchAssignment.assigned_at.desc())
                .offset(offset)
                .limit(limit)
            )
            rows = (await self.session.execute(query)).all()

            items: List[Dict[str, Any]] = []
            for assignment, parcel, courier, user in rows:
                items.append({
                    "id": assignment.id,
                    "parcel_id": parcel.id,
                    "tracking_number": parcel.tracking_number,
                    "recipient_name": parcel.recipient_name,
                    "recipient_phone": parcel.recipient_phone,
                    "delivery_address": parcel.delivery_address,
                    "delivery_city": parcel.delivery_city,
                    "weight_kg": parcel.weight_kg,
                    "parcel_status": parcel.status.value if hasattr(parcel.status, "value") else str(parcel.status),
                    "courier_id": assignment.courier_id,
                    "courier_name": user.full_name if user else None,
                    "vehicle_type": courier.vehicle_type if courier else None,
                    "license_plate": courier.license_plate if courier else None,
                    "status": assignment.status.value if hasattr(assignment.status, "value") else str(assignment.status),
                    "assigned_at": assignment.assigned_at,
                    "completed_at": assignment.completed_at,
                    "notes": assignment.notes,
                })

            # Fetch active couriers for filtering dropdown
            couriers_stmt = (
                select(Courier.id, User.full_name, Courier.vehicle_type, Courier.license_plate)
                .join(User, Courier.user_id == User.id)
                .order_by(User.full_name.asc())
            )
            courier_rows = (await self.session.execute(couriers_stmt)).all()
            courier_list = [
                {
                    "id": cid,
                    "name": name,
                    "vehicle_type": vtype,
                    "license_plate": plate,
                }
                for cid, name, vtype, plate in courier_rows
            ]

            return items, total, statuses, courier_list
        except Exception:
            return [], 0, statuses, []

    async def get_dispatch_history_detail(self, assignment_id: int) -> Optional[Dict[str, Any]]:
        """Fetch full details for a single dispatch history assignment."""
        if not self.session:
            return None
        try:
            stmt = (
                select(DispatchAssignment, Parcel, Courier, User)
                .join(Parcel, DispatchAssignment.parcel_id == Parcel.id)
                .outerjoin(Courier, DispatchAssignment.courier_id == Courier.id)
                .outerjoin(User, Courier.user_id == User.id)
                .where(DispatchAssignment.id == assignment_id)
            )
            row = (await self.session.execute(stmt)).first()
            if not row:
                return None
            assignment, parcel, courier, user = row
            return {
                "id": assignment.id,
                "parcel_id": parcel.id,
                "tracking_number": parcel.tracking_number,
                "recipient_name": parcel.recipient_name,
                "recipient_phone": parcel.recipient_phone,
                "delivery_address": parcel.delivery_address,
                "delivery_city": parcel.delivery_city,
                "weight_kg": parcel.weight_kg,
                "dimensions": parcel.dimensions,
                "parcel_status": parcel.status.value if hasattr(parcel.status, "value") else str(parcel.status),
                "special_instructions": parcel.special_instructions,
                "courier_id": assignment.courier_id,
                "courier_name": user.full_name if user else None,
                "vehicle_type": courier.vehicle_type if courier else None,
                "license_plate": courier.license_plate if courier else None,
                "status": assignment.status.value if hasattr(assignment.status, "value") else str(assignment.status),
                "assigned_at": assignment.assigned_at,
                "completed_at": assignment.completed_at,
                "notes": assignment.notes,
                "created_at": assignment.created_at,
                "updated_at": assignment.updated_at,
            }
        except Exception:
            return None

    async def get_active_deliveries(
        self,
        city: Optional[str] = None,
        status: Optional[str] = None,
        courier_id: Optional[int] = None,
        search: Optional[str] = None,
        limit: int = 10,
        offset: int = 0,
    ) -> Tuple[List[Dict[str, Any]], int, int, int, int]:
        """
        Active Delivery Monitoring Query:
        Returns all active parcels (PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY)
        with their active courier assignment, live coordinates, and status breakdown.
        """
        if not self.session:
            return [], 0, 0, 0, 0

        active_statuses = [
            ParcelStatus.PICKED_UP,
            ParcelStatus.IN_TRANSIT,
            ParcelStatus.OUT_FOR_DELIVERY,
        ]

        try:
            # Breakdown counts
            in_transit_stmt = select(func.count(Parcel.id)).where(Parcel.status == ParcelStatus.IN_TRANSIT)
            in_transit_count = (await self.session.execute(in_transit_stmt)).scalar() or 0

            out_for_delivery_stmt = select(func.count(Parcel.id)).where(
                Parcel.status == ParcelStatus.OUT_FOR_DELIVERY
            )
            out_for_delivery_count = (await self.session.execute(out_for_delivery_stmt)).scalar() or 0

            picked_up_stmt = select(func.count(Parcel.id)).where(Parcel.status == ParcelStatus.PICKED_UP)
            picked_up_count = (await self.session.execute(picked_up_stmt)).scalar() or 0

            # Active delivery query
            query = (
                select(Parcel, DispatchAssignment, Courier, User)
                .outerjoin(
                    DispatchAssignment,
                    and_(
                        DispatchAssignment.parcel_id == Parcel.id,
                        DispatchAssignment.status.in_([DispatchStatus.ASSIGNED, DispatchStatus.ACCEPTED]),
                    ),
                )
                .outerjoin(Courier, DispatchAssignment.courier_id == Courier.id)
                .outerjoin(User, Courier.user_id == User.id)
                .where(Parcel.status.in_(active_statuses))
            )

            count_query = (
                select(func.count(Parcel.id))
                .outerjoin(
                    DispatchAssignment,
                    and_(
                        DispatchAssignment.parcel_id == Parcel.id,
                        DispatchAssignment.status.in_([DispatchStatus.ASSIGNED, DispatchStatus.ACCEPTED]),
                    ),
                )
                .outerjoin(Courier, DispatchAssignment.courier_id == Courier.id)
                .outerjoin(User, Courier.user_id == User.id)
                .where(Parcel.status.in_(active_statuses))
            )

            # Filtering by status
            if status and status.strip() and status.lower() != "all":
                st = status.strip().lower()
                query = query.where(Parcel.status == st)
                count_query = count_query.where(Parcel.status == st)

            # Filtering by city
            if city and city.strip() and city.lower() != "all":
                query = query.where(Parcel.delivery_city.ilike(city.strip()))
                count_query = count_query.where(Parcel.delivery_city.ilike(city.strip()))

            # Filtering by courier
            if courier_id and courier_id > 0:
                query = query.where(DispatchAssignment.courier_id == courier_id)
                count_query = count_query.where(DispatchAssignment.courier_id == courier_id)

            # Search query
            if search and search.strip():
                term = f"%{search.strip()}%"
                search_expr = or_(
                    Parcel.tracking_number.ilike(term),
                    Parcel.recipient_name.ilike(term),
                    Parcel.recipient_phone.ilike(term),
                    Parcel.delivery_city.ilike(term),
                    Parcel.delivery_address.ilike(term),
                    User.full_name.ilike(term),
                )
                query = query.where(search_expr)
                count_query = count_query.where(search_expr)

            total = (await self.session.execute(count_query)).scalar() or 0

            query = query.order_by(Parcel.updated_at.desc()).offset(offset).limit(limit)
            rows = (await self.session.execute(query)).all()

            items: List[Dict[str, Any]] = []
            for parcel, assignment, courier, user in rows:
                items.append({
                    "id": parcel.id,
                    "tracking_number": parcel.tracking_number,
                    "recipient_name": parcel.recipient_name,
                    "recipient_phone": parcel.recipient_phone,
                    "delivery_address": parcel.delivery_address,
                    "delivery_city": parcel.delivery_city,
                    "weight_kg": parcel.weight_kg,
                    "status": parcel.status.value if hasattr(parcel.status, "value") else str(parcel.status),
                    "current_location_type": (
                        parcel.current_location_type.value
                        if hasattr(parcel.current_location_type, "value")
                        else str(parcel.current_location_type)
                    ),
                    "delivery_method": (
                        parcel.delivery_method.value
                        if hasattr(parcel.delivery_method, "value")
                        else str(parcel.delivery_method)
                    ),
                    "current_warehouse_id": parcel.current_warehouse_id,
                    "assignment_id": assignment.id if assignment else None,
                    "courier_id": assignment.courier_id if assignment else None,
                    "courier_name": user.full_name if user else None,
                    "vehicle_type": courier.vehicle_type if courier else None,
                    "license_plate": courier.license_plate if courier else None,
                    "current_latitude": courier.current_latitude if courier else None,
                    "current_longitude": courier.current_longitude if courier else None,
                    "assigned_at": assignment.assigned_at if assignment else None,
                    "updated_at": parcel.updated_at,
                })

            return items, total, in_transit_count, out_for_delivery_count, picked_up_count
        except Exception:
            return [], 0, 0, 0, 0

    async def update_active_delivery_status(
        self,
        parcel_id: int,
        status_value: str,
        current_latitude: Optional[float] = None,
        current_longitude: Optional[float] = None,
        notes: Optional[str] = None,
    ) -> Optional[Dict[str, Any]]:
        """
        Update parcel delivery status and optionally update courier coordinates.
        """
        if not self.session:
            return None

        parcel = await self.get_parcel(parcel_id)
        if not parcel:
            return None

        # Normalize status to ParcelStatus enum
        try:
            target_status = ParcelStatus(status_value.lower())
        except ValueError:
            return None

        parcel.status = target_status

        # If delivered or cancelled, close active assignment
        active_assignment = await self.get_active_by_parcel(parcel_id)
        if active_assignment:
            if target_status == ParcelStatus.DELIVERED:
                active_assignment.status = DispatchStatus.COMPLETED
                active_assignment.completed_at = datetime.now(timezone.utc)
            elif target_status == ParcelStatus.CANCELLED:
                active_assignment.status = DispatchStatus.REJECTED
                active_assignment.completed_at = datetime.now(timezone.utc)
            if notes:
                active_assignment.notes = notes

            # Update courier location if provided
            if current_latitude is not None or current_longitude is not None:
                courier = await self.get_courier(active_assignment.courier_id)
                if courier:
                    if current_latitude is not None:
                        courier.current_latitude = current_latitude
                    if current_longitude is not None:
                        courier.current_longitude = current_longitude

        await self.session.flush()

        return {
            "parcel_id": parcel.id,
            "tracking_number": parcel.tracking_number,
            "status": parcel.status.value,
            "delivery_city": parcel.delivery_city,
            "current_location_type": (
                parcel.current_location_type.value
                if hasattr(parcel.current_location_type, "value")
                else str(parcel.current_location_type)
            ),
            "courier_id": active_assignment.courier_id if active_assignment else None,
            "current_latitude": current_latitude,
            "current_longitude": current_longitude,
            "notes": notes,
            "updated_at": parcel.updated_at.isoformat() if parcel.updated_at else datetime.now(timezone.utc).isoformat(),
        }

