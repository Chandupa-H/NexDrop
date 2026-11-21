import secrets
import logging
import random
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from uuid import UUID

from fastapi import BackgroundTasks
from sqlalchemy import select, or_, func, cast, String
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.merchants.models import Merchant, ApprovalStatus
from app.modules.parcels.models import Parcel, ParcelStatus, DeliveryMethod, CurrentLocationType
from app.modules.merchants.schemas import (
    MerchantRegisterRequest,
    MerchantCreate,
    MerchantOrderCreate,
    MerchantOrderResponse,
    MerchantOrderStatusUpdate,
    MerchantKpisResponse,
    ApiCredentialsResponse,
    WebhookConfigResponse,
    MerchantDashboardSummaryResponse,
)
from app.modules.merchants.repository import MerchantRepository
from app.modules.users.models import User, UserRole
from app.modules.users.repository import UserRepository
from app.modules.webhooks.service import WebhookService

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Seed / In-Memory Mock Store
# Keeps full functionality working when database is offline or in dev/demo mode.
# ---------------------------------------------------------------------------

_DEFAULT_MERCHANT_RECORD: Dict[str, Any] = {
    "id": 1,
    "user_id": 1,
    "merchant_code": "MER-000001",
    "business_name": "Merchant Account",
    "registration_number": "BR-000001",
    "contact_phone": "+94 77 000 0000",
    "business_address": "Colombo, Sri Lanka",
    "business_type": "retail",
    "website_url": "https://example.com",
    "approval_status": ApprovalStatus.APPROVED,
    "rejection_reason": None,
    "live_key": "nd_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
    "test_key": "nd_test_1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p",
    "client_id": "nexdrop_app_merchant_1",
    "client_secret": "sec_demo_secret_key_12345",
    "rate_limit_per_day": 10000,
    "used_today": 0,
    "created_at": datetime.now(timezone.utc).isoformat(),
    "updated_at": datetime.now(timezone.utc).isoformat(),
}

_MOCK_MERCHANTS: Dict[int, Dict[str, Any]] = {
    1: _DEFAULT_MERCHANT_RECORD,
}

_MOCK_ORDERS: List[Dict[str, Any]] = []


class MerchantService:
    def __init__(
        self,
        repository: Optional[MerchantRepository] = None,
        current_user_email: Optional[str] = None,
    ):
        self.repository = repository
        # Only ever set from a *verified* token's claims, never from a raw header.
        self.current_user_email = current_user_email

    # ------------------------------------------------------------------
    # ID Resolution Helper
    # ------------------------------------------------------------------

    @staticmethod
    def _resolve_merchant_id(merchant_id_str: str) -> Optional[int]:
        """Resolve 'me', 'MER-000002', or plain integer string into numeric ID."""
        if not merchant_id_str:
            return None
        if merchant_id_str == "me":
            if _MOCK_MERCHANTS:
                return list(_MOCK_MERCHANTS.keys())[-1]
            return 1
        clean = merchant_id_str.upper().replace("MER-", "").lstrip("0")
        try:
            return int(clean) if clean else None
        except ValueError:
            return None

    @staticmethod
    def _format_merchant_dict(db_m: Merchant) -> Dict[str, Any]:
        return {
            "id": db_m.id,
            "user_id": db_m.user_id,
            "merchant_code": f"MER-{db_m.id:06d}",
            "business_name": db_m.business_name,
            "registration_number": db_m.registration_number,
            "contact_phone": db_m.contact_phone,
            "business_address": db_m.business_address,
            "business_type": db_m.business_type,
            "website_url": db_m.website_url,
            "approval_status": db_m.approval_status,
            "rejection_reason": db_m.rejection_reason,
            "live_key": db_m.api_key or "",
            "test_key": getattr(db_m, "test_api_key", None) or "",
            "client_id": getattr(db_m, "client_id", None) or f"nexdrop_app_{db_m.id}",
            "client_secret": getattr(db_m, "client_secret", None) or "",
            "rate_limit_per_day": 10000,
            "used_today": 0,
        }

    # ------------------------------------------------------------------
    # Merchant Profile & Registration
    # ------------------------------------------------------------------

    async def get_merchant(self, merchant_id: int) -> Optional[Merchant]:
        if self.repository:
            try:
                db_m = await self.repository.get_by_id(merchant_id)
                if db_m:
                    return db_m
            except Exception as exc:
                logger.warning("DB query failed, checking in-memory store: %s", exc)

        # Fallback to in-memory store
        mock = _MOCK_MERCHANTS.get(merchant_id)
        if mock:
            m = Merchant(
                id=mock["id"],
                user_id=mock["user_id"],
                business_name=mock["business_name"],
                registration_number=mock["registration_number"],
                contact_phone=mock["contact_phone"],
                business_address=mock["business_address"],
                business_type=mock.get("business_type"),
                website_url=mock.get("website_url"),
                approval_status=mock["approval_status"],
                rejection_reason=mock.get("rejection_reason"),
                api_key=mock.get("live_key"),
            )
            return m
        return None

    async def get_merchant_by_identifier(self, identifier: str) -> Optional[Dict[str, Any]]:
        """Look up a merchant dict by numeric ID, MER code, email, or 'me'.

        Order of resolution: database first (the mock store may hold stale or
        fake IDs), then the in-memory store as an offline/demo fallback.
        'me' resolves to the authenticated user's own merchant only; it never
        falls back to "the latest merchant in the DB".
        """
        if not identifier:
            return None
        identifier = identifier.strip()

        # --- By email ---------------------------------------------------
        if "@" in identifier:
            ident_lower = identifier.lower()
            for m in _MOCK_MERCHANTS.values():
                if (m.get("email") or "").lower() == ident_lower:
                    return m
            if self.repository:
                return await self._find_db_merchant_by_email(ident_lower)
            return None

        # --- By MER code (in-memory) -----------------------------------
        ident_upper = identifier.upper()
        for m in _MOCK_MERCHANTS.values():
            if m.get("merchant_code") == ident_upper:
                return m

        # --- "me": the authenticated user's own merchant ---------------
        if identifier == "me":
            if self.current_user_email:
                email = self.current_user_email.strip().lower()
                if self.repository:
                    db_dict = await self._find_db_merchant_by_email(email)
                    if db_dict:
                        return db_dict
                for m in _MOCK_MERCHANTS.values():
                    if (m.get("email") or "").lower() == email:
                        return m
                return None
            # No authenticated identity: only allowed in offline/demo mode.
            if self.repository is None and _MOCK_MERCHANTS:
                return list(_MOCK_MERCHANTS.values())[-1]
            return None

        # --- By numeric ID: DB first, then mock -------------------------
        numeric_id = self._resolve_merchant_id(identifier)
        if numeric_id is None:
            return None
        if self.repository:
            try:
                db_m = await self.repository.get_by_id(numeric_id)
                if db_m:
                    return self._format_merchant_dict(db_m)
            except Exception as exc:
                logger.warning("DB merchant lookup failed, checking in-memory store: %s", exc)
        return _MOCK_MERCHANTS.get(numeric_id)

    async def _find_db_merchant_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Find a merchant via its owning user's email (case-insensitive)."""
        if not self.repository:
            return None
        try:
            user = await UserRepository(self.repository.session).get_by_email(email)
            if user:
                db_m = await self.repository.get_by_user_id(user.id)
                if db_m:
                    return self._format_merchant_dict(db_m)
        except Exception as exc:
            logger.warning("Merchant lookup by user email failed: %s", exc)
        # Fallback: direct JOIN merchants -> users (covers inactive users or
        # differently-cased stored emails).
        try:
            stmt = (
                select(Merchant)
                .join(User, Merchant.user_id == User.id)
                .where(func.lower(User.email) == email)
            )
            res = await self.repository.session.execute(stmt)
            db_m = res.scalars().first()
            if db_m:
                return self._format_merchant_dict(db_m)
        except Exception as exc:
            logger.warning("Merchant JOIN lookup by email failed: %s", exc)
        return None

    async def register_merchant(
        self,
        payload: MerchantRegisterRequest,
        *,
        supabase_user_id: UUID,
        authenticated_email: str,
    ) -> Merchant:
        if self.repository is None:
            raise RuntimeError("Merchant registration requires a database session.")

        email = str(payload.email).strip().lower()
        verified_email = authenticated_email.strip().lower()
        if not verified_email or email != verified_email:
            raise ValueError("Registration email must match the authenticated Supabase account.")

        session = self.repository.session
        user_repo = UserRepository(session)
        merchant_repo = self.repository

        user = await user_repo.get_by_supabase_user_id(
            supabase_user_id, for_update=True
        )
        if user is None:
            matching_users = await user_repo.list_by_normalized_email(email)
            if len(matching_users) > 1:
                raise ValueError("Multiple backend users match this account; contact support.")
            if matching_users:
                candidate = matching_users[0]
                is_imported_unassigned = (
                    candidate.supabase_user_id is None
                    and candidate.role == UserRole.UNASSIGNED
                    and candidate.hashed_password.startswith("supabase-managed:")
                )
                if not is_imported_unassigned:
                    raise ValueError(
                        "This email is already linked to a different or unmanaged backend account."
                    )
                candidate.supabase_user_id = supabase_user_id
                user = candidate

        if user is None:
            user = User(
                supabase_user_id=supabase_user_id,
                email=email,
                full_name=payload.full_name.strip(),
                contact_phone=payload.direct_phone or payload.contact_phone,
                hashed_password=f"supabase-managed:{secrets.token_urlsafe(32)}",
                role=UserRole.MERCHANT,
                is_active=False,
            )
            session.add(user)
            await session.flush()
        elif user.email.strip().lower() != verified_email:
            raise ValueError("The authenticated Supabase subject is linked to another email.")
        elif user.role not in {UserRole.UNASSIGNED, UserRole.MERCHANT}:
            raise ValueError("This backend account cannot be registered as a merchant.")

        existing_application = await merchant_repo.get_by_user_id(user.id)
        if existing_application is not None:
            same_application = (
                existing_application.business_name == payload.business_name.strip()
                and existing_application.registration_number
                == payload.registration_number.strip()
                and existing_application.contact_phone == payload.contact_phone.strip()
                and existing_application.business_address == payload.business_address.strip()
                and existing_application.business_type == payload.business_type
                and existing_application.website_url == payload.website_url
            )
            if not same_application:
                raise ValueError("A merchant application already exists for this account.")
            user.role = UserRole.MERCHANT
            user.is_active = existing_application.approval_status == ApprovalStatus.APPROVED
            await session.flush()
            return existing_application

        registration_number = payload.registration_number.strip()
        registration_owner = await merchant_repo.get_by_registration_number(
            registration_number
        )
        if registration_owner is not None:
            raise ValueError("This business registration number is already in use.")

        user.role = UserRole.MERCHANT
        user.is_active = False
        application = Merchant(
            user_id=user.id,
            business_name=payload.business_name.strip(),
            registration_number=registration_number,
            contact_phone=payload.contact_phone.strip(),
            business_address=payload.business_address.strip(),
            business_type=payload.business_type,
            website_url=payload.website_url,
            approval_status=ApprovalStatus.PENDING,
        )
        session.add(application)
        await session.flush()
        await session.refresh(application)
        return application

    async def list_merchants(self, skip: int = 0, limit: int = 100) -> List[Any]:
        if self.repository:
            try:
                db_list = await self.repository.list_all(skip=skip, limit=limit)
                if db_list:
                    return db_list
            except Exception:
                pass
        return list(_MOCK_MERCHANTS.values())[skip : skip + limit]

    async def get_pending_merchants(self, skip: int = 0, limit: int = 100) -> List[Any]:
        if self.repository:
            try:
                db_list = await self.repository.get_by_approval_status(ApprovalStatus.PENDING, skip=skip, limit=limit)
                if db_list:
                    return db_list
            except Exception:
                pass
        return [
            m for m in _MOCK_MERCHANTS.values()
            if m.get("approval_status") == ApprovalStatus.PENDING
        ][skip : skip + limit]

    async def approve_merchant(
        self,
        merchant_id: int,
        status: ApprovalStatus,
        rejection_reason: Optional[str] = None,
        session: Optional[AsyncSession] = None,
    ) -> Any:
        # Update in-memory record
        if merchant_id in _MOCK_MERCHANTS:
            _MOCK_MERCHANTS[merchant_id]["approval_status"] = status
            if rejection_reason:
                _MOCK_MERCHANTS[merchant_id]["rejection_reason"] = rejection_reason
            if status == ApprovalStatus.APPROVED and not _MOCK_MERCHANTS[merchant_id].get("live_key"):
                _MOCK_MERCHANTS[merchant_id]["live_key"] = f"nd_live_{secrets.token_hex(16)}"

        # If DB session is provided, also update DB
        if session and self.repository:
            try:
                db_m = await self.repository.get_by_id(merchant_id)
                if db_m:
                    if status == ApprovalStatus.APPROVED:
                        user_repo = UserRepository(session)
                        user = await user_repo.get_by_id(db_m.user_id)
                        if user:
                            user.is_active = True
                            session.add(user)
                        if not db_m.api_key:
                            db_m.api_key = f"nd_live_{secrets.token_hex(16)}"
                    return await self.repository.update_approval(db_m, status, rejection_reason)
            except Exception as exc:
                logger.warning("DB approval update skipped: %s", exc)

        return await self.get_merchant(merchant_id)

    # ------------------------------------------------------------------
    # Orders Management
    # ------------------------------------------------------------------

    @staticmethod
    def _parcel_to_order_response(p: Parcel) -> MerchantOrderResponse:
        st_val = p.status.value if hasattr(p.status, "value") else str(p.status)
        order_status = "created" if p.status == ParcelStatus.PENDING else st_val
        created_str = (
            p.created_at.isoformat()
            if hasattr(p, "created_at") and p.created_at
            else datetime.now(timezone.utc).isoformat()
        )
        return MerchantOrderResponse(
            id=str(p.id),
            trackingNumber=p.tracking_number,
            recipientName=p.recipient_name,
            recipientPhone=p.recipient_phone,
            deliveryAddress=p.delivery_address,
            deliveryCity=p.delivery_city,
            status=order_status,
            weightKg=float(p.weight_kg),
            dimensions=p.dimensions or "20x15x10 cm",
            codAmount=float(getattr(p, "cod_amount", 0.0) or 0.0),
            isPrepaid=bool(getattr(p, "is_prepaid", True)),
            estimatedDelivery="Pending Dispatch" if p.status == ParcelStatus.PENDING else "In Transit",
            createdAt=created_str,
            specialInstructions=p.special_instructions,
            failureReason=p.failure_reason,
            courierName=None,
            courierPhone=None,
        )

    async def get_orders(
        self,
        merchant_id: str = "me",
        status: Optional[str] = None,
        search: Optional[str] = None,
        skip: int = 0,
        limit: int = 50,
    ) -> List[MerchantOrderResponse]:
        """
        List all orders for a merchant with optional status and search filters.
        Queries PostgreSQL parcels table first when DB session is active,
        falling back to in-memory mock store.
        """
        merchant_record = await self.get_merchant_by_identifier(merchant_id)
        if merchant_record is None:
            # Unknown merchant: never fall through to someone else's orders.
            return []
        numeric_id = merchant_record.get("id")

        if self.repository and self.repository.session:
            try:
                stmt = select(Parcel).where(Parcel.merchant_id == numeric_id)

                if status and status.lower() != "all":
                    st = status.lower()
                    if st == "created":
                        stmt = stmt.where(Parcel.status == ParcelStatus.PENDING)
                    else:
                        stmt = stmt.where(func.lower(cast(Parcel.status, String)) == st)

                if search and search.strip():
                    term = f"%{search.strip().lower()}%"
                    stmt = stmt.where(
                        or_(
                            func.lower(Parcel.tracking_number).like(term),
                            func.lower(Parcel.recipient_name).like(term),
                            func.lower(Parcel.delivery_city).like(term),
                            func.lower(Parcel.recipient_phone).like(term),
                            func.lower(Parcel.delivery_address).like(term),
                        )
                    )

                stmt = stmt.order_by(Parcel.created_at.desc()).offset(skip).limit(limit)
                res = await self.repository.session.execute(stmt)
                db_parcels = res.scalars().all()
                # Authoritative for this merchant, even when the list is empty.
                return [self._parcel_to_order_response(p) for p in db_parcels]
            except Exception as exc:
                logger.warning("DB get_orders query failed, falling back to mock: %s", exc)

        # In-memory fallback (DB offline), still isolated per merchant.
        orders = [o for o in _MOCK_ORDERS if str(o.get("merchant_id")) == str(numeric_id)]

        # Filter by status
        if status and status != "all":
            orders = [o for o in orders if o["status"].lower() == status.lower()]

        # Filter by search string
        if search and search.strip():
            q = search.strip().lower()
            orders = [
                o for o in orders
                if q in o["tracking_number"].lower()
                or q in o["recipient_name"].lower()
                or q in o["delivery_city"].lower()
                or q in o["recipient_phone"].lower()
                or (o.get("delivery_address") and q in o["delivery_address"].lower())
            ]

        sliced = orders[skip : skip + limit]
        return [MerchantOrderResponse(**o) for o in sliced]

    async def get_order_by_id_or_tracking(
        self,
        order_id_or_tracking: str,
        merchant_id: Optional[int] = None,
    ) -> Optional[MerchantOrderResponse]:
        """Get a single order by internal ID or tracking number.

        When merchant_id is given, only that merchant's orders are visible.
        """
        q = order_id_or_tracking.strip()
        if self.repository and self.repository.session:
            try:
                conds = [func.lower(Parcel.tracking_number) == q.lower()]
                if q.isdigit():
                    conds.append(Parcel.id == int(q))
                stmt = select(Parcel).where(or_(*conds))
                if merchant_id is not None:
                    stmt = stmt.where(Parcel.merchant_id == merchant_id)
                res = await self.repository.session.execute(stmt)
                db_p = res.scalars().first()
                if db_p:
                    return self._parcel_to_order_response(db_p)
            except Exception as exc:
                logger.warning("DB get_order_by_id_or_tracking failed: %s", exc)

        q_lower = q.lower()
        for o in _MOCK_ORDERS:
            if merchant_id is not None and str(o.get("merchant_id")) != str(merchant_id):
                continue
            if o["id"].lower() == q_lower or o["tracking_number"].lower() == q_lower:
                return MerchantOrderResponse(**o)
        return None

    async def create_order(
        self,
        merchant_id: str,
        payload: MerchantOrderCreate,
        background_tasks: Optional[BackgroundTasks] = None,
    ) -> MerchantOrderResponse:
        """
        Create a new delivery order.
        Generates tracking number, initial status, calculates fee,
        persists to PostgreSQL parcels table, and schedules order.created after commit.
        """
        random_suffix = random.randint(100000, 999999)
        tracking_number = f"ND-LK-{random_suffix}"
        order_id = f"ord-{int(datetime.now().timestamp() * 1000)}"
        now_iso = datetime.now(timezone.utc).isoformat()

        # Lookup merchant details for sender_id and pickup_address
        merchant_record = await self.get_merchant_by_identifier(merchant_id)
        # Prefer the DB-resolved merchant ID over string-based resolution.
        numeric_merchant_id = (
            merchant_record.get("id")
            if merchant_record
            else self._resolve_merchant_id(merchant_id)
        )

        sender_id = (
            (merchant_record.get("user_id") or numeric_merchant_id or 1)
            if merchant_record
            else (numeric_merchant_id or 1)
        )
        pickup_address = (
            merchant_record.get("business_address")
            if merchant_record
            else "Colombo, Sri Lanka"
        )

        db_parcel = None
        if self.repository and self.repository.session:
            try:
                db_parcel = Parcel(
                    tracking_number=tracking_number,
                    sender_id=sender_id,
                    merchant_id=numeric_merchant_id,
                    recipient_name=payload.recipient_name.strip(),
                    recipient_phone=payload.recipient_phone.strip(),
                    delivery_address=payload.delivery_address.strip(),
                    delivery_city=payload.delivery_city.strip(),
                    pickup_address=pickup_address,
                    weight_kg=float(payload.weight_kg),
                    dimensions=payload.dimensions or "20x15x10 cm",
                    status=ParcelStatus.PENDING,
                    cod_amount=float(payload.cod_amount) if not payload.is_prepaid else 0.0,
                    is_prepaid=bool(payload.is_prepaid),
                    special_instructions=payload.special_instructions,
                    delivery_method=DeliveryMethod.DIRECT,
                    current_location_type=CurrentLocationType.SENDER,
                )
                self.repository.session.add(db_parcel)
                await self.repository.session.commit()
                await self.repository.session.refresh(db_parcel)
                order_id = str(db_parcel.id)
            except SQLAlchemyError:
                await self.repository.session.rollback()
                raise

        order_dict: Dict[str, Any] = {
            "id": order_id,
            "merchant_id": numeric_merchant_id,
            "tracking_number": tracking_number,
            "recipient_name": payload.recipient_name.strip(),
            "recipient_phone": payload.recipient_phone.strip(),
            "delivery_address": payload.delivery_address.strip(),
            "delivery_city": payload.delivery_city.strip(),
            "status": "created",
            "weight_kg": float(payload.weight_kg),
            "dimensions": payload.dimensions or "20x15x10 cm",
            "cod_amount": float(payload.cod_amount) if not payload.is_prepaid else 0.0,
            "is_prepaid": bool(payload.is_prepaid),
            "estimated_delivery": "Pending Dispatch",
            "created_at": now_iso,
            "special_instructions": payload.special_instructions,
            "failure_reason": None,
            "courier_name": None,
            "courier_phone": None,
        }

        # Prepend to in-memory orders
        _MOCK_ORDERS.insert(0, order_dict)

        if db_parcel is not None and background_tasks is not None:
            WebhookService.schedule_parcel_event(
                background_tasks=background_tasks,
                merchant_id=db_parcel.merchant_id,
                tracking_number=db_parcel.tracking_number,
                status_value=db_parcel.status.value,
                location=db_parcel.delivery_city,
                note=db_parcel.special_instructions,
            )

        logger.info("New merchant order created: %s (%s)", tracking_number, payload.recipient_name)
        return MerchantOrderResponse(**order_dict)

    async def update_order_status(
        self,
        order_id_or_tracking: str,
        payload: MerchantOrderStatusUpdate,
        merchant_id: Optional[int] = None,
    ) -> Optional[MerchantOrderResponse]:
        """Update order status (in-memory store), scoped to the owning merchant."""
        q = order_id_or_tracking.strip().lower()
        target: Optional[Dict[str, Any]] = None
        for o in _MOCK_ORDERS:
            if merchant_id is not None and str(o.get("merchant_id")) != str(merchant_id):
                continue
            if o["id"].lower() == q or o["tracking_number"].lower() == q:
                target = o
                break

        if not target:
            return None

        target["status"] = payload.status
        if payload.failure_reason:
            target["failure_reason"] = payload.failure_reason
        if payload.courier_name:
            target["courier_name"] = payload.courier_name
        if payload.courier_phone:
            target["courier_phone"] = payload.courier_phone

        return MerchantOrderResponse(**target)

    # ------------------------------------------------------------------
    # KPIs & Summary
    # ------------------------------------------------------------------

    async def get_kpis(self, merchant_id: str = "me") -> MerchantKpisResponse:
        """Calculate live KPIs across all orders."""
        orders_resp = await self.get_orders(merchant_id=merchant_id, limit=500)
        total_orders = len(orders_resp)
        in_transit = sum(1 for o in orders_resp if o.status == "in_transit")
        out_for_delivery = sum(1 for o in orders_resp if o.status == "out_for_delivery")
        delivered = sum(1 for o in orders_resp if o.status == "delivered")
        failed = sum(1 for o in orders_resp if o.status in ("failed", "cancelled"))
        pending_cod = sum(
            o.cod_amount for o in orders_resp
            if o.status not in ("failed", "cancelled") and not o.is_prepaid
        )
        completed = delivered + failed
        success_rate = round((delivered / completed) * 100) if completed > 0 else 100

        return MerchantKpisResponse(
            total_orders=total_orders,
            in_transit=in_transit,
            out_for_delivery=out_for_delivery,
            delivered=delivered,
            failed=failed,
            pending_cod=float(pending_cod),
            success_rate=success_rate,
        )

    async def get_dashboard_summary(self, merchant_id: str = "me") -> MerchantDashboardSummaryResponse:
        """Get full dashboard bundle: KPIs, recent orders, credentials, webhooks."""
        merchant = await self.get_merchant_by_identifier(merchant_id)
        kpis = await self.get_kpis(merchant_id)
        orders_resp = await self.get_orders(merchant_id=merchant_id, limit=6)
        recent_orders = orders_resp
        credentials = await self.get_credentials(merchant_id)
        webhook_config = await self.get_webhook_config(merchant_id)

        m_code = merchant.get("merchant_code", "") if merchant else ""
        b_name = merchant.get("business_name", "") if merchant else ""

        return MerchantDashboardSummaryResponse(
            merchant_id=m_code,
            business_name=b_name,
            kpis=kpis,
            recent_orders=recent_orders,
            credentials=credentials,
            webhook_config=webhook_config,
        )

    # ------------------------------------------------------------------
    # API Credentials & Key Management
    # ------------------------------------------------------------------

    async def get_credentials(self, merchant_id: str = "me") -> ApiCredentialsResponse:
        merchant = await self.get_merchant_by_identifier(merchant_id)
        if not merchant:
            # Never hand out another merchant's (or the demo merchant's) keys.
            return ApiCredentialsResponse(
                merchant_id="",
                business_name="",
                live_key="",
                test_key="",
                client_id="",
                client_secret="",
                rate_limit_per_day=10000,
                used_today=0,
            )
        return ApiCredentialsResponse(
            merchant_id=merchant.get("merchant_code", f"MER-{merchant.get('id', 1):06d}"),
            business_name=merchant.get("business_name", ""),
            live_key=merchant.get("live_key", f"nd_live_{secrets.token_hex(16)}"),
            test_key=merchant.get("test_key", f"nd_test_{secrets.token_hex(16)}"),
            client_id=merchant.get("client_id", f"nexdrop_app_{merchant.get('id', 1)}"),
            client_secret=merchant.get("client_secret", f"sec_{secrets.token_hex(16)}"),
            rate_limit_per_day=merchant.get("rate_limit_per_day", 10000),
            used_today=merchant.get("used_today", 0),
        )

    async def regenerate_key(self, merchant_id: str = "me", key_type: str = "live") -> ApiCredentialsResponse:
        merchant = await self.get_merchant_by_identifier(merchant_id)
        if not merchant:
            return await self.get_credentials(merchant_id)
        key_type = "test" if key_type == "test" else "live"
        new_token = f"nd_{key_type}_{secrets.token_hex(20)}"

        persisted = False
        if self.repository and self.repository.session:
            try:
                db_m = await self.repository.get_by_id(merchant["id"])
                if db_m:
                    if key_type == "test":
                        db_m.test_api_key = new_token
                    else:
                        db_m.api_key = new_token
                    await self.repository.session.commit()
                    persisted = True
            except SQLAlchemyError as exc:
                await self.repository.session.rollback()
                logger.error("Failed to persist regenerated API key: %s", exc)
                raise

        if not persisted:
            # Offline/demo mode: update the in-memory record.
            mock = _MOCK_MERCHANTS.get(merchant["id"])
            if mock is not None:
                mock["test_key" if key_type == "test" else "live_key"] = new_token

        logger.info("API key regenerated for %s: %s", merchant.get("business_name"), key_type)
        return await self.get_credentials(merchant_id)

    # ------------------------------------------------------------------
    # Webhook config (read-only view for the dashboard bundle).
    # Writes, rotation and logs live in WebhookService / the webhook routes.
    # ------------------------------------------------------------------

    async def get_webhook_config(self, merchant_id: str = "me") -> WebhookConfigResponse:
        merchant = await self.get_merchant_by_identifier(merchant_id)
        if merchant and self.repository and self.repository.session:
            try:
                config = await WebhookService(self.repository.session).get_merchant_config(
                    merchant["id"]
                )
                return WebhookConfigResponse(
                    target_url=config.target_url,
                    is_active=config.is_active,
                    subscribed_events=config.subscribed_events,
                    secret_configured=bool(config.secret_key),
                )
            except Exception as exc:
                logger.warning("Webhook config lookup failed: %s", exc)
        return WebhookConfigResponse(
            target_url="",
            is_active=False,
            subscribed_events=[],
            secret_configured=False,
        )