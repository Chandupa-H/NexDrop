from typing import Optional, List, Dict, Any, Tuple
from datetime import datetime, timedelta, timezone
from sqlalchemy import select, func, update, delete, desc, and_
from sqlalchemy.ext.asyncio import AsyncSession
from app.modules.customers.models import Customer, CustomerAddress
from app.modules.parcels.models import Parcel, ParcelStatus
from app.modules.users.models import User


class CustomerRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, customer_id: int) -> Optional[Customer]:
        result = await self.session.execute(select(Customer).where(Customer.id == customer_id))
        return result.scalars().first()

    async def get_by_user_id(self, user_id: int) -> Optional[Customer]:
        result = await self.session.execute(select(Customer).where(Customer.user_id == user_id))
        return result.scalars().first()

    async def list_all(self, skip: int = 0, limit: int = 100) -> List[Customer]:
        result = await self.session.execute(select(Customer).offset(skip).limit(limit))
        return list(result.scalars().all())

    async def create(self, customer: Customer) -> Customer:
        self.session.add(customer)
        await self.session.flush()
        await self.session.refresh(customer)
        return customer

    # ── User & Profile Lookups ──
    @staticmethod
    def _profile_values(customer: Customer, user: User) -> Dict[str, Any]:
        return {
            "id": customer.id,
            "full_name": user.full_name,
            "email": user.email,
            "phone": customer.phone,
            "role": user.role.value if hasattr(user.role, "value") else str(user.role),
            "default_address": customer.default_address,
            "city": customer.city,
            "postal_code": customer.postal_code,
        }

    async def get_customer_profile(self, user_id: int) -> Optional[Dict[str, Any]]:
        result = await self.session.execute(
            select(Customer, User).join(User, Customer.user_id == User.id)
            .where(Customer.user_id == user_id)
        )
        row = result.first()
        return self._profile_values(*row) if row else None

    async def update_customer_profile(
        self, user_id: int, values: Dict[str, str]
    ) -> Optional[Dict[str, Any]]:
        allowed = {"full_name", "phone", "default_address", "city", "postal_code"}
        if not values or set(values) - allowed or any(value is None for value in values.values()):
            raise ValueError("Only supported, non-null profile fields may be updated")
        result = await self.session.execute(
            select(Customer, User).join(User, Customer.user_id == User.id)
            .where(Customer.user_id == user_id)
        )
        row = result.first()
        if not row:
            return None
        customer, user = row
        for key, value in values.items():
            setattr(user if key == "full_name" else customer, key, value)
        await self.session.flush()
        profile = self._profile_values(customer, user)
        # A response is returned only after the actual update commits successfully.
        await self.session.commit()
        return profile

    # Saved-address operations are unchanged.
    async def list_addresses(
        self,
        customer_id: int,
        address_type: Optional[str] = None,
    ) -> List[CustomerAddress]:
        stmt = select(CustomerAddress).where(CustomerAddress.customer_id == customer_id)
        if address_type:
            stmt = stmt.where(CustomerAddress.address_type == address_type)
        stmt = stmt.order_by(CustomerAddress.is_default.desc(), CustomerAddress.id.asc())
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_address(self, address_id: int, customer_id: int) -> Optional[CustomerAddress]:
        stmt = select(CustomerAddress).where(
            and_(CustomerAddress.id == address_id, CustomerAddress.customer_id == customer_id)
        )
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_address(self, address: CustomerAddress) -> CustomerAddress:
        if address.is_default:
            await self.session.execute(
                update(CustomerAddress)
                .where(
                    and_(
                        CustomerAddress.customer_id == address.customer_id,
                        CustomerAddress.address_type == address.address_type,
                    )
                )
                .values(is_default=False)
            )
        self.session.add(address)
        await self.session.flush()
        await self.session.refresh(address)
        return address

    async def update_address(
        self,
        address_id: int,
        customer_id: int,
        values: Dict[str, Any],
    ) -> Optional[CustomerAddress]:
        address = await self.get_address(address_id, customer_id)
        if not address:
            return None

        if values.get("is_default") is True:
            target_type = values.get("address_type") or address.address_type
            await self.session.execute(
                update(CustomerAddress)
                .where(
                    and_(
                        CustomerAddress.customer_id == customer_id,
                        CustomerAddress.address_type == target_type,
                    )
                )
                .values(is_default=False)
            )

        for key, val in values.items():
            if val is not None and hasattr(address, key):
                setattr(address, key, val)

        await self.session.flush()
        await self.session.refresh(address)
        return address

    async def delete_address(self, address_id: int, customer_id: int) -> bool:
        stmt = delete(CustomerAddress).where(
            and_(CustomerAddress.id == address_id, CustomerAddress.customer_id == customer_id)
        )
        result = await self.session.execute(stmt)
        await self.session.flush()
        return (result.rowcount or 0) > 0

    async def set_default_address(
        self,
        address_id: int,
        customer_id: int,
    ) -> Optional[CustomerAddress]:
        address = await self.get_address(address_id, customer_id)
        if not address:
            return None

        await self.session.execute(
            update(CustomerAddress)
            .where(
                and_(
                    CustomerAddress.customer_id == customer_id,
                    CustomerAddress.address_type == address.address_type,
                )
            )
            .values(is_default=False)
        )
        address.is_default = True
        await self.session.flush()
        await self.session.refresh(address)
        return address

    # ── Parcels & Dashboard Metrics ──
    async def get_parcels(
        self,
        sender_id: int = 1,
        status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[Parcel], int]:
        stmt = select(Parcel).where(Parcel.sender_id == sender_id)
        count_stmt = select(func.count(Parcel.id)).where(Parcel.sender_id == sender_id)

        if status:
            allowed = [s.strip() for s in status.split(",") if s.strip()]
            if "active" in allowed:
                active_statuses = [
                    ParcelStatus.PICKED_UP,
                    ParcelStatus.IN_TRANSIT,
                    ParcelStatus.OUT_FOR_DELIVERY,
                ]
                allowed_enums = [
                    ParcelStatus(s) for s in allowed if s in ParcelStatus._value2member_map_
                ]
                filter_set = set(active_statuses + allowed_enums)
                stmt = stmt.where(Parcel.status.in_(filter_set))
                count_stmt = count_stmt.where(Parcel.status.in_(filter_set))
            else:
                valid_enums = [
                    ParcelStatus(s) for s in allowed if s in ParcelStatus._value2member_map_
                ]
                if valid_enums:
                    stmt = stmt.where(Parcel.status.in_(valid_enums))
                    count_stmt = count_stmt.where(Parcel.status.in_(valid_enums))

        stmt = stmt.order_by(desc(Parcel.created_at)).offset(offset).limit(limit)
        items_res = await self.session.execute(stmt)
        count_res = await self.session.execute(count_stmt)

        items = list(items_res.scalars().all())
        total = count_res.scalar() or 0
        return items, total

    async def get_parcel_by_tracking(self, tracking_number: str) -> Optional[Parcel]:
        stmt = select(Parcel).where(Parcel.tracking_number == tracking_number)
        result = await self.session.execute(stmt)
        return result.scalars().first()

    async def create_parcel(self, parcel: Parcel) -> Parcel:
        self.session.add(parcel)
        await self.session.flush()
        await self.session.refresh(parcel)
        return parcel

    async def cancel_parcel(self, tracking_number: str) -> Optional[Parcel]:
        parcel = await self.get_parcel_by_tracking(tracking_number)
        if not parcel:
            return None
        if parcel.status != ParcelStatus.PENDING:
            return None
        parcel.status = ParcelStatus.CANCELLED
        await self.session.flush()
        await self.session.refresh(parcel)
        return parcel

    async def get_dashboard_summary(self, sender_id: int = 1) -> Dict[str, Any]:
        """Aggregate totals and weekly breakdown from DB."""
        stmt = select(Parcel.status, func.count(Parcel.id)).where(Parcel.sender_id == sender_id).group_by(Parcel.status)
        result = await self.session.execute(stmt)
        status_counts = dict(result.all())

        pending = status_counts.get(ParcelStatus.PENDING, 0)
        delivered = status_counts.get(ParcelStatus.DELIVERED, 0)
        cancelled = status_counts.get(ParcelStatus.CANCELLED, 0)
        active = (
            status_counts.get(ParcelStatus.PICKED_UP, 0)
            + status_counts.get(ParcelStatus.IN_TRANSIT, 0)
            + status_counts.get(ParcelStatus.OUT_FOR_DELIVERY, 0)
        )
        total = sum(status_counts.values())

        now = datetime.now(timezone.utc)
        start_date = (now - timedelta(days=6)).replace(hour=0, minute=0, second=0, microsecond=0)
        daily_stmt = (
            select(func.date(Parcel.created_at), func.count(Parcel.id))
            .where(and_(Parcel.sender_id == sender_id, Parcel.created_at >= start_date))
            .group_by(func.date(Parcel.created_at))
        )
        daily_res = await self.session.execute(daily_stmt)
        daily_dict = {str(d): c for d, c in daily_res.all()}

        weekly_orders = []
        for i in range(6, -1, -1):
            day_str = (now - timedelta(days=i)).strftime("%Y-%m-%d")
            weekly_orders.append({"date": day_str, "orders": daily_dict.get(day_str, 0)})

        return {
            "totals": {
                "total_orders": total,
                "active_deliveries": active,
                "delivered": delivered,
                "pending": pending,
                "cancelled": cancelled,
            },
            "kpis": [
                {"key": "active_deliveries", "value": active, "delta_pct": 25},
                {"key": "delivered", "value": delivered, "delta_pct": 15},
                {"key": "pending", "value": pending, "delta_pct": -50},
                {"key": "total_orders", "value": total, "delta_pct": 14},
            ],
            "weekly_orders": weekly_orders,
        }
