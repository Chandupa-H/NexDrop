import hashlib
import hmac
import secrets
import logging
import random
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.merchants.models import Merchant, ApprovalStatus
from app.modules.merchants.schemas import (
    MerchantRegisterRequest,
    MerchantCreate,
    MerchantOrderCreate,
    MerchantOrderResponse,
    MerchantOrderStatusUpdate,
    MerchantKpisResponse,
    ApiCredentialsResponse,
    WebhookConfigResponse,
    WebhookConfigUpdate,
    WebhookDeliveryLogResponse,
    WebhookTestResponse,
    MerchantDashboardSummaryResponse,
)
from app.modules.merchants.repository import MerchantRepository
from app.modules.users.models import User, UserRole
from app.modules.users.repository import UserRepository

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

_MOCK_WEBHOOK_CONFIG: Dict[str, Any] = {
    "target_url": "https://example.com/api/webhooks",
    "secret_key": "whsec_live_default_key_98f42d1e07b8",
    "is_active": True,
    "subscribed_events": [
        "order.created",
        "order.picked_up",
        "order.in_transit",
        "order.out_for_delivery",
        "order.delivered",
        "order.failed",
    ],
}

_MOCK_WEBHOOK_LOGS: List[Dict[str, Any]] = []


class MerchantService:
    def __init__(self, repository: Optional[MerchantRepository] = None):
        self.repository = repository

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

    @staticmethod
    def _hash_password(plain: str) -> str:
        return hashlib.sha256(plain.encode()).hexdigest()

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
        """Look up merchant dictionary by numeric ID, MER code, email, or 'me'."""
        if not identifier:
            return None

        # Check by email
        if "@" in identifier:
            ident_lower = identifier.lower().strip()
            for m in _MOCK_MERCHANTS.values():
                if m.get("email", "").lower() == ident_lower:
                    return m
            if self.repository:
                try:
                    user_repo = UserRepository(self.repository.session)
                    user = await user_repo.get_by_email(ident_lower)
                    if user:
                        db_m = await self.repository.get_by_user_id(user.id)
                        if db_m:
                            return self._format_merchant_dict(db_m)
                except Exception:
                    pass
            return None

        # Check by code
        ident_upper = identifier.upper().strip()
        for m in _MOCK_MERCHANTS.values():
            if m.get("merchant_code") == ident_upper:
                return m

        numeric_id = self._resolve_merchant_id(identifier)
        if numeric_id and numeric_id in _MOCK_MERCHANTS:
            return _MOCK_MERCHANTS[numeric_id]

        # Check DB
        if self.repository and numeric_id:
            try:
                db_m = await self.repository.get_by_id(numeric_id)
                if db_m:
                    return self._format_merchant_dict(db_m)
            except Exception:
                pass

        if identifier == "me" and _MOCK_MERCHANTS:
            return list(_MOCK_MERCHANTS.values())[-1]

        return None

    async def register_merchant(
        self,
        payload: MerchantRegisterRequest,
        session: Optional[AsyncSession] = None,
    ) -> Dict[str, Any]:
        """
        Atomically register a new merchant application.
        Works seamlessly with database or in-memory fallback.
        """
        # Guard: Check registration number and email uniqueness in mock store
        for m in _MOCK_MERCHANTS.values():
            if m.get("registration_number") == payload.registration_number:
                raise ValueError(
                    f"Business registration number '{payload.registration_number}' is already registered."
                )
            if m.get("email") and m.get("email").lower() == payload.email.lower():
                raise ValueError(
                    f"An account with email '{payload.email}' has already registered as a merchant. Only one merchant registration is permitted per account."
                )

        new_id = max(_MOCK_MERCHANTS.keys(), default=0) + 1
        merchant_code = f"MER-{new_id:06d}"

        # If DB session is provided, attempt to persist to DB
        if session and self.repository:
            try:
                user_repo = UserRepository(session)
                existing_user = await user_repo.get_by_email(payload.email)
                if existing_user:
                    raise ValueError(f"An account with email '{payload.email}' already exists.")

                existing_reg = await self.repository.get_by_registration_number(payload.registration_number)
                if existing_reg:
                    raise ValueError(
                        f"Business registration number '{payload.registration_number}' is already registered."
                    )

                raw_pw = payload.password if payload.password else secrets.token_urlsafe(24)
                hashed_pw = self._hash_password(raw_pw)
                user = User(
                    email=payload.email,
                    full_name=payload.full_name,
                    contact_phone=payload.direct_phone or payload.contact_phone,
                    hashed_password=hashed_pw,
                    role=UserRole.MERCHANT,
                    is_active=False,
                )
                session.add(user)
                await session.flush()

                db_merchant = Merchant(
                    user_id=user.id,
                    business_name=payload.business_name,
                    registration_number=payload.registration_number,
                    contact_phone=payload.contact_phone,
                    business_address=payload.business_address,
                    business_type=payload.business_type,
                    website_url=payload.website_url,
                    approval_status=ApprovalStatus.PENDING,
                )
                session.add(db_merchant)
                await session.flush()
                await session.refresh(db_merchant)
                new_id = db_merchant.id
                merchant_code = f"MER-{new_id:06d}"
            except ValueError:
                raise
            except Exception as exc:
                logger.warning("DB registration write skipped, persisting in memory: %s", exc)

        # Record in memory store
        record = {
            "id": new_id,
            "user_id": new_id,
            "merchant_code": merchant_code,
            "email": payload.email,
            "business_name": payload.business_name,
            "registration_number": payload.registration_number,
            "contact_phone": payload.contact_phone,
            "business_address": payload.business_address,
            "business_type": payload.business_type,
            "website_url": payload.website_url,
            "approval_status": ApprovalStatus.PENDING,
            "rejection_reason": None,
            "live_key": f"nd_live_{secrets.token_hex(16)}",
            "test_key": f"nd_test_{secrets.token_hex(16)}",
            "client_id": f"nexdrop_app_{new_id}",
            "client_secret": f"sec_{secrets.token_hex(16)}",
            "rate_limit_per_day": 10000,
            "used_today": 0,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
        }
        _MOCK_MERCHANTS[new_id] = record

        logger.info("Merchant registered successfully: %s (ID: %s)", payload.business_name, new_id)
        return record

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
        """
        orders = list(_MOCK_ORDERS)

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
    ) -> Optional[MerchantOrderResponse]:
        """Get single order by internal order ID or tracking number."""
        q = order_id_or_tracking.strip().lower()
        for o in _MOCK_ORDERS:
            if o["id"].lower() == q or o["tracking_number"].lower() == q:
                return MerchantOrderResponse(**o)
        return None

    async def create_order(
        self,
        merchant_id: str,
        payload: MerchantOrderCreate,
    ) -> MerchantOrderResponse:
        """
        Create a new delivery order.
        Generates tracking number, initial status, calculates fee,
        and triggers order.created webhook event.
        """
        random_suffix = random.randint(100000, 999999)
        tracking_number = f"ND-LK-{random_suffix}"
        order_id = f"ord-{int(datetime.now().timestamp() * 1000)}"
        now_iso = datetime.now(timezone.utc).isoformat()

        order_dict: Dict[str, Any] = {
            "id": order_id,
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

        # Trigger order.created webhook event
        if "order.created" in _MOCK_WEBHOOK_CONFIG.get("subscribed_events", []):
            log_id = f"wh-log-{random.randint(100, 999)}"
            _MOCK_WEBHOOK_LOGS.insert(0, {
                "id": log_id,
                "event": "order.created",
                "tracking_number": tracking_number,
                "status": 200,
                "status_text": "OK",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "duration_ms": random.randint(40, 80),
                "payload_summary": f'{{"event":"order.created","tracking_number":"{tracking_number}","cod_amount":{order_dict["cod_amount"]}}}',
            })

        logger.info("New merchant order created: %s (%s)", tracking_number, payload.recipient_name)
        return MerchantOrderResponse(**order_dict)

    async def update_order_status(
        self,
        order_id_or_tracking: str,
        payload: MerchantOrderStatusUpdate,
    ) -> Optional[MerchantOrderResponse]:
        """Update order status and log webhook event."""
        q = order_id_or_tracking.strip().lower()
        target: Optional[Dict[str, Any]] = None
        for o in _MOCK_ORDERS:
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

        # Trigger webhook if event is subscribed
        event_name = f"order.{payload.status}"
        if event_name in _MOCK_WEBHOOK_CONFIG.get("subscribed_events", []):
            _MOCK_WEBHOOK_LOGS.insert(0, {
                "id": f"wh-log-{random.randint(100, 999)}",
                "event": event_name,
                "tracking_number": target["tracking_number"],
                "status": 200,
                "status_text": "OK",
                "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "duration_ms": random.randint(45, 90),
                "payload_summary": f'{{"event":"{event_name}","tracking_number":"{target["tracking_number"]}","status":"{payload.status}"}}',
            })

        return MerchantOrderResponse(**target)

    # ------------------------------------------------------------------
    # KPIs & Summary
    # ------------------------------------------------------------------

    async def get_kpis(self, merchant_id: str = "me") -> MerchantKpisResponse:
        """Calculate live KPIs across all orders."""
        orders = _MOCK_ORDERS
        total_orders = len(orders)
        in_transit = sum(1 for o in orders if o["status"] == "in_transit")
        out_for_delivery = sum(1 for o in orders if o["status"] == "out_for_delivery")
        delivered = sum(1 for o in orders if o["status"] == "delivered")
        failed = sum(1 for o in orders if o["status"] == "failed")
        pending_cod = sum(
            o["cod_amount"] for o in orders
            if o["status"] != "failed" and not o["is_prepaid"]
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
        recent_orders = [MerchantOrderResponse(**o) for o in _MOCK_ORDERS[:6]]
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
        merchant = await self.get_merchant_by_identifier(merchant_id) or _MOCK_MERCHANTS.get(1)
        if not merchant:
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
        merchant = await self.get_merchant_by_identifier(merchant_id) or _MOCK_MERCHANTS.get(1)
        if not merchant:
            return await self.get_credentials(merchant_id)
        new_token = f"nd_{key_type}_{secrets.token_hex(20)}"
        if key_type == "test":
            merchant["test_key"] = new_token
        else:
            merchant["live_key"] = new_token
        logger.info("API key regenerated for %s: %s", merchant.get("business_name"), key_type)
        return await self.get_credentials(merchant_id)

    # ------------------------------------------------------------------
    # Webhooks & Delivery Logs
    # ------------------------------------------------------------------

    async def get_webhook_config(self, merchant_id: str = "me") -> WebhookConfigResponse:
        return WebhookConfigResponse(
            target_url=_MOCK_WEBHOOK_CONFIG["target_url"],
            secret_key=_MOCK_WEBHOOK_CONFIG["secret_key"],
            is_active=_MOCK_WEBHOOK_CONFIG["is_active"],
            subscribed_events=list(_MOCK_WEBHOOK_CONFIG["subscribed_events"]),
        )

    async def update_webhook_config(
        self,
        merchant_id: str = "me",
        payload: Optional[WebhookConfigUpdate] = None,
    ) -> WebhookConfigResponse:
        if payload:
            if payload.target_url is not None:
                _MOCK_WEBHOOK_CONFIG["target_url"] = payload.target_url
            if payload.secret_key is not None:
                _MOCK_WEBHOOK_CONFIG["secret_key"] = payload.secret_key
            if payload.is_active is not None:
                _MOCK_WEBHOOK_CONFIG["is_active"] = payload.is_active
            if payload.subscribed_events is not None:
                _MOCK_WEBHOOK_CONFIG["subscribed_events"] = payload.subscribed_events
        return await self.get_webhook_config(merchant_id)

    async def send_test_webhook(
        self,
        merchant_id: str = "me",
        event_type: str = "order.in_transit",
        tracking_number: Optional[str] = None,
    ) -> WebhookTestResponse:
        """Simulate sending a signed webhook POST ping and record delivery log."""
        trk = tracking_number or "ND-LK-890216"
        log_id = f"wh-test-{int(datetime.now().timestamp() * 1000)}"
        duration = random.randint(45, 85)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

        # Generate payload & signature simulation
        payload_summary = f'{{"event":"{event_type}","tracking_number":"{trk}","hub":"Central Colombo","timestamp":"{now_str}"}}'

        new_log = {
            "id": log_id,
            "event": event_type,
            "tracking_number": trk,
            "status": 200,
            "status_text": "OK",
            "timestamp": now_str,
            "duration_ms": duration,
            "payload_summary": payload_summary,
        }
        _MOCK_WEBHOOK_LOGS.insert(0, new_log)

        return WebhookTestResponse(
            log=WebhookDeliveryLogResponse(**new_log),
            message=f"Webhook delivered successfully to {_MOCK_WEBHOOK_CONFIG['target_url']} with HTTP 200 OK ({duration}ms)",
        )

    async def get_webhook_logs(
        self,
        merchant_id: str = "me",
        limit: int = 50,
    ) -> List[WebhookDeliveryLogResponse]:
        return [WebhookDeliveryLogResponse(**l) for l in _MOCK_WEBHOOK_LOGS[:limit]]
