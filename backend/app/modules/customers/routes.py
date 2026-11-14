from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError, OperationalError
from app.modules.customers.dependencies import (
    VerifiedCustomerProfileIdentity, get_verified_customer_profile_identity, get_customer_profile_service,
)
from app.db.session import get_optional_db
from app.modules.customers.schemas import (
    CustomerResponse,
    CustomerMeResponse,
    CustomerProfileUpdateRequest,
    CustomerDashboardSummaryResponse,
    CustomerDashboardTotals,
    CustomerDashboardKPI,
    CustomerWeeklyOrder,
    CustomerParcelListResponse,
    CustomerParcelListItem,
    CustomerParcelDetailResponse,
    CustomerTimelineEvent,
    CustomerCancelParcelRequest,
    CustomerCreateParcelRequest,
    CustomerAddressResponse,
    CustomerAddressCreate,
    CustomerAddressUpdate,
)
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


def get_customer_service(
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> Optional[CustomerService]:
    if session is None:
        return None
    return CustomerService(CustomerRepository(session))


# ── Existing Customer Management Routes ────────────────────────────


@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    skip: int = 0,
    limit: int = 50,
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> List[CustomerResponse]:
    if service is None:
        return []
    customers = await service.list_customers(skip=skip, limit=limit)
    return [CustomerResponse.model_validate(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> CustomerResponse:
    if service is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not configured.",
        )
    customer = await service.get_customer(customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )
    return CustomerResponse.model_validate(customer)


# ── In-Memory Fallback Data (Customer Dashboard) ───────────────────

_MOCK_CUSTOMER_ME = {
    "id": 1,
    "full_name": "Dihini Kankanamage",
    "email": "dihini.kankanamage@gmail.com",
    "phone": "+94771234567",
    "role": "customer",
    "default_address": "45/2 Temple Road",
    "city": "Colombo 07",
    "postal_code": "00700",
}

_MOCK_CUSTOMER_PARCELS: List[dict] = [
    {
        "tracking_id": "NXD-CUS-101",
        "recipient_name": "Kasun Perera",
        "recipient_phone": "+94779876543",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "12 Peradeniya Road",
        "delivery_city": "Kandy",
        "pickup_address": "45/2 Temple Road",
        "pickup_city": "Colombo 07",
        "status": "delivered",
        "created_at": "2026-11-06T09:30:00Z",
        "eta": "2026-11-08T16:00:00Z",
        "fee": 650.0,
        "weight_kg": 1.5,
        "dimensions": "25x20x10 cm",
        "special_instructions": "Handle with care - fragile electronics",
        "notes": [],
        "timeline": [
            {
                "status": "pending",
                "label": "Order Created",
                "occurred_at": "2026-11-06T09:30:00Z",
                "location": "Colombo Portal",
            },
            {
                "status": "picked_up",
                "label": "Picked Up by Courier",
                "occurred_at": "2026-11-06T14:15:00Z",
                "location": "Colombo 07",
            },
            {
                "status": "in_transit",
                "label": "Sorted at Central Hub",
                "occurred_at": "2026-11-07T03:40:00Z",
                "location": "Peliyagoda Hub",
            },
            {
                "status": "out_for_delivery",
                "label": "Out for Delivery",
                "occurred_at": "2026-11-08T08:20:00Z",
                "location": "Kandy Dispatch Station",
            },
            {
                "status": "delivered",
                "label": "Delivered & Signed",
                "occurred_at": "2026-11-08T15:45:00Z",
                "location": "Kandy Recipient Address",
            },
        ],
    },
    {
        "tracking_id": "NXD-CUS-102",
        "recipient_name": "Nimali Silva",
        "recipient_phone": "+94715554321",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "88 Galle Road",
        "delivery_city": "Galle",
        "pickup_address": "45/2 Temple Road",
        "pickup_city": "Colombo 07",
        "status": "in_transit",
        "created_at": "2026-11-08T04:00:00Z",
        "eta": "2026-11-10T12:00:00Z",
        "fee": 465.0,
        "weight_kg": 2.3,
        "dimensions": "30x20x15 cm",
        "special_instructions": None,
        "notes": [],
        "timeline": [
            {
                "status": "pending",
                "label": "Order Created",
                "occurred_at": "2026-11-08T04:00:00Z",
                "location": "Colombo Portal",
            },
            {
                "status": "picked_up",
                "label": "Picked Up by Courier",
                "occurred_at": "2026-11-08T08:45:00Z",
                "location": "Colombo 07",
            },
            {
                "status": "in_transit",
                "label": "Sorted at Central Hub",
                "occurred_at": "2026-11-09T03:40:00Z",
                "location": "Peliyagoda Hub",
            },
        ],
    },
    {
        "tracking_id": "NXD-CUS-103",
        "recipient_name": "Chaminda Bandara",
        "recipient_phone": "+94763332211",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "45/A High Level Road",
        "delivery_city": "Maharagama",
        "pickup_address": "45/2 Temple Road",
        "pickup_city": "Colombo 07",
        "status": "pending",
        "created_at": "2026-11-09T02:15:00Z",
        "eta": "2026-11-10T18:00:00Z",
        "fee": 390.0,
        "weight_kg": 0.8,
        "dimensions": "15x10x5 cm",
        "special_instructions": "Leave at front porch if unavailable",
        "notes": [],
        "timeline": [
            {
                "status": "pending",
                "label": "Order Created",
                "occurred_at": "2026-11-09T02:15:00Z",
                "location": "Online Portal",
            },
        ],
    },
]

# Cross-role registration: synchronize customer parcels with courier mock parcels
try:
    from app.modules.couriers.routes import _MOCK_PARCELS as _COURIER_MOCK_PARCELS
    for cp in _MOCK_CUSTOMER_PARCELS:
        if not any(p["tracking_id"] == cp["tracking_id"] for p in _COURIER_MOCK_PARCELS):
            _COURIER_MOCK_PARCELS.append({
                "tracking_id": cp["tracking_id"],
                "customer_name": cp["recipient_name"],
                "phone": cp["recipient_phone"],
                "destination": cp["delivery_city"],
                "address": cp["delivery_address"],
                "status": cp["status"],
                "assigned_at": cp["created_at"],
                "eta": cp.get("eta"),
                "notes": cp.get("notes", []),
                "timeline": cp["timeline"],
            })
except Exception:
    pass

_MOCK_CUSTOMER_ADDRESSES: List[dict] = [
    {
        "id": 1,
        "customer_id": 1,
        "address_type": "pickup",
        "label": "Home",
        "custom_name": None,
        "address": "45/2 Temple Road",
        "city": "Colombo 07",
        "postal_code": "00700",
        "contact_name": "Dihini Kankanamage",
        "phone": "+94 77 123 4567",
        "is_default": True,
        "created_at": datetime(2026, 1, 15, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 1, 15, tzinfo=timezone.utc),
    },
    {
        "id": 2,
        "customer_id": 1,
        "address_type": "pickup",
        "label": "Office",
        "custom_name": None,
        "address": "Level 12, World Trade Center, Echelon Square",
        "city": "Colombo 01",
        "postal_code": "00100",
        "contact_name": "Dihini Kankanamage",
        "phone": "+94 77 123 4567",
        "is_default": False,
        "created_at": datetime(2026, 2, 1, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 2, 1, tzinfo=timezone.utc),
    },
    {
        "id": 3,
        "customer_id": 1,
        "address_type": "pickup",
        "label": "Kadawatha Distribution Depot",
        "custom_name": "Depot Reception",
        "address": "188 Kandy Road",
        "city": "Kadawatha",
        "postal_code": "11850",
        "contact_name": "Depot Reception",
        "phone": "+94 71 888 9900",
        "is_default": False,
        "created_at": datetime(2026, 2, 10, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 2, 10, tzinfo=timezone.utc),
    },
    {
        "id": 4,
        "customer_id": 1,
        "address_type": "dropoff",
        "label": "Other",
        "custom_name": "Kasun Perera (Client)",
        "address": "12 Peradeniya Road",
        "city": "Kandy",
        "postal_code": "20000",
        "contact_name": "Kasun Perera",
        "phone": "+94 77 987 6543",
        "is_default": False,
        "created_at": datetime(2026, 3, 5, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 3, 5, tzinfo=timezone.utc),
    },
    {
        "id": 5,
        "customer_id": 1,
        "address_type": "dropoff",
        "label": "Other",
        "custom_name": "Galle Retail Branch",
        "address": "88 Galle Road",
        "city": "Galle",
        "postal_code": "80000",
        "contact_name": "Nimali Silva",
        "phone": "+94 71 555 4321",
        "is_default": False,
        "created_at": datetime(2026, 3, 12, tzinfo=timezone.utc),
        "updated_at": datetime(2026, 3, 12, tzinfo=timezone.utc),
    },
]


def _mask_phone(phone: str) -> str:
    if len(phone) >= 12 and phone.startswith("+94"):
        return phone[:3] + " " + phone[3:6] + " *** " + phone[-4:]
    elif len(phone) >= 10:
        return phone[:7] + " *** " + phone[-4:]
    return phone


def _get_system_greeting() -> str:
    """Compute greeting based on the current local system time."""
    hour = datetime.now().hour
    if 5 <= hour < 12:
        return "Good morning,"
    elif 12 <= hour < 17:
        return "Good afternoon,"
    else:
        return "Good evening,"


# ── Customer Dashboard Endpoints ───────────────────────────────────


def _profile_storage_error(error: SQLAlchemyError) -> HTTPException:
    if isinstance(error, OperationalError):
        return HTTPException(503, detail="Customer account storage is temporarily unavailable.")
    return HTTPException(500, detail="Customer profile operation could not be completed.")


@router.get("/customer/me", response_model=CustomerMeResponse, tags=["Customer Account"])
async def get_customer_me(
    identity: VerifiedCustomerProfileIdentity = Depends(get_verified_customer_profile_identity),
    service: CustomerService = Depends(get_customer_profile_service),
) -> CustomerMeResponse:
    try:
        profile = await service.get_profile(identity.user_id)
    except SQLAlchemyError as error:
        raise _profile_storage_error(error) from None
    if profile is None:
        raise HTTPException(404, detail="Customer profile was not found for the verified account.")
    return CustomerMeResponse(**profile)


@router.put("/customer/me", response_model=CustomerMeResponse, tags=["Customer Account"])
async def update_customer_me(
    payload: CustomerProfileUpdateRequest,
    identity: VerifiedCustomerProfileIdentity = Depends(get_verified_customer_profile_identity),
    service: CustomerService = Depends(get_customer_profile_service),
) -> CustomerMeResponse:
    try:
        profile = await service.update_profile(identity.user_id, payload.model_dump(exclude_unset=True))
    except SQLAlchemyError as error:
        raise _profile_storage_error(error) from None
    if profile is None:
        raise HTTPException(404, detail="Customer profile was not found for the verified account.")
    return CustomerMeResponse(**profile)


@router.delete("/customer/me", tags=["Customer Account"])
async def delete_customer_me(
    identity: VerifiedCustomerProfileIdentity = Depends(get_verified_customer_profile_identity),
) -> dict:
    # Resolving identity alone cannot authorize deletion across the two account systems.
    # No session, repository delete or Supabase admin operation is invoked.
    raise HTTPException(501, detail="Account deletion is disabled pending verified ownership, retention and Platform account-lifecycle integration.")


@router.get("/customer/dashboard/summary", response_model=CustomerDashboardSummaryResponse, tags=["Customer Dashboard"])
async def get_customer_dashboard_summary(
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> CustomerDashboardSummaryResponse:
    """
    Dashboard summary computed dynamically from DB or in-memory parcels.
    Counts satisfy: total_orders == active_deliveries + delivered + pending + cancelled.
    """
    if service is not None:
        try:
            summary = await service.get_dashboard_summary(sender_id=1)
            if summary and summary["totals"]["total_orders"] > 0:
                return CustomerDashboardSummaryResponse(
                    greeting=_get_system_greeting(),
                    totals=CustomerDashboardTotals(**summary["totals"]),
                    kpis=[CustomerDashboardKPI(**k) for k in summary["kpis"]],
                    weekly_orders=[CustomerWeeklyOrder(**w) for w in summary["weekly_orders"]],
                )
        except Exception:
            pass

    active_statuses = {"picked_up", "in_transit", "out_for_delivery"}
    active_deliveries = sum(1 for p in _MOCK_CUSTOMER_PARCELS if p["status"] in active_statuses)
    delivered = sum(1 for p in _MOCK_CUSTOMER_PARCELS if p["status"] == "delivered")
    pending = sum(1 for p in _MOCK_CUSTOMER_PARCELS if p["status"] == "pending")
    cancelled = sum(1 for p in _MOCK_CUSTOMER_PARCELS if p["status"] == "cancelled")
    total_orders = len(_MOCK_CUSTOMER_PARCELS)

    kpis = [
        CustomerDashboardKPI(key="active_deliveries", value=active_deliveries, delta_pct=25),
        CustomerDashboardKPI(key="delivered", value=delivered, delta_pct=15),
        CustomerDashboardKPI(key="pending", value=pending, delta_pct=-50),
        CustomerDashboardKPI(key="total_orders", value=total_orders, delta_pct=14),
    ]

    now = datetime.now()
    weekly_orders = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        day_count = sum(
            1 for p in _MOCK_CUSTOMER_PARCELS
            if p.get("created_at", "").startswith(day_date)
        )
        weekly_orders.append(CustomerWeeklyOrder(date=day_date, orders=day_count))

    return CustomerDashboardSummaryResponse(
        greeting=_get_system_greeting(),
        totals=CustomerDashboardTotals(
            total_orders=total_orders,
            active_deliveries=active_deliveries,
            delivered=delivered,
            pending=pending,
            cancelled=cancelled,
        ),
        kpis=kpis,
        weekly_orders=weekly_orders,
    )


@router.get("/customer/parcels", response_model=CustomerParcelListResponse, tags=["Customer Dashboard"])
async def get_customer_parcels(
    status: Optional[str] = Query(None, description="Comma-separated status filter (e.g. 'pending,in_transit')"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> CustomerParcelListResponse:
    """
    List customer parcels with optional status filtering and pagination.
    """
    if service is not None:
        try:
            parcels, total = await service.list_parcels(
                sender_id=1, status=status, limit=limit, offset=offset
            )
            if total > 0 or len(_MOCK_CUSTOMER_PARCELS) == 0:
                items = [
                    CustomerParcelListItem(
                        tracking_id=p.tracking_number,
                        recipient_name=p.recipient_name,
                        destination=p.delivery_city,
                        status=p.status.value if hasattr(p.status, "value") else str(p.status),
                        created_at=p.created_at.isoformat() if p.created_at else datetime.now(timezone.utc).isoformat(),
                        estimated_fee=350.0 + (p.weight_kg or 1.0) * 50.0,
                        weight_kg=p.weight_kg or 1.0,
                        eta=None,
                    )
                    for p in parcels
                ]
                return CustomerParcelListResponse(items=items, total=total)
        except Exception:
            pass

    filtered = _MOCK_CUSTOMER_PARCELS

    if status:
        allowed = [s.strip() for s in status.split(",") if s.strip()]
        if "active" in allowed:
            active_set = {"picked_up", "in_transit", "out_for_delivery"}
            filtered = [p for p in filtered if p["status"] in active_set or p["status"] in allowed]
        else:
            filtered = [p for p in filtered if p["status"] in allowed]

    filtered = sorted(filtered, key=lambda p: p["created_at"], reverse=True)
    total = len(filtered)
    items = filtered[offset : offset + limit]

    return CustomerParcelListResponse(
        items=[
            CustomerParcelListItem(
                tracking_id=p["tracking_id"],
                recipient_name=p["recipient_name"],
                destination=p["delivery_city"],
                status=p["status"],
                created_at=p["created_at"],
                estimated_fee=p["fee"],
                weight_kg=p["weight_kg"],
                eta=p.get("eta"),
            )
            for p in items
        ],
        total=total,
    )


def _build_db_parcel_timeline(
    status: str,
    created_at: datetime,
    updated_at: Optional[datetime],
    pickup_city: str,
    delivery_city: str,
    delivery_address: str,
) -> List[CustomerTimelineEvent]:
    t0 = created_at or datetime.now(timezone.utc)
    t0_str = t0.isoformat()
    t_up = updated_at or t0
    t_up_str = t_up.isoformat()

    events: List[CustomerTimelineEvent] = [
        CustomerTimelineEvent(
            status="pending",
            label="Order Created",
            occurred_at=t0_str,
            location=f"{pickup_city} Portal",
        )
    ]

    if status == "cancelled":
        events.append(
            CustomerTimelineEvent(
                status="cancelled",
                label="Shipment Cancelled",
                occurred_at=t_up_str,
                location="Customer Portal",
            )
        )
        return events

    if status in ["picked_up", "in_transit", "out_for_delivery", "delivered"]:
        t_picked = (t0 + timedelta(hours=4, minutes=45)).isoformat()
        events.append(
            CustomerTimelineEvent(
                status="picked_up",
                label="Picked Up by Courier",
                occurred_at=t_picked,
                location=pickup_city,
            )
        )

    if status in ["in_transit", "out_for_delivery", "delivered"]:
        t_hub = (t0 + timedelta(hours=18, minutes=10)).isoformat()
        events.append(
            CustomerTimelineEvent(
                status="in_transit",
                label="Sorted at Central Hub",
                occurred_at=t_hub,
                location="Peliyagoda Hub",
            )
        )

    if status in ["out_for_delivery", "delivered"]:
        t_dispatch = (t0 + timedelta(hours=28, minutes=50)).isoformat()
        events.append(
            CustomerTimelineEvent(
                status="out_for_delivery",
                label="Out for Delivery",
                occurred_at=t_dispatch,
                location=f"{delivery_city} Dispatch Station",
            )
        )

    if status == "delivered":
        events.append(
            CustomerTimelineEvent(
                status="delivered",
                label="Delivered & Signed",
                occurred_at=t_up_str,
                location=f"{delivery_address}, {delivery_city}",
            )
        )

    return events


@router.get("/customer/parcels/{tracking_id}", response_model=CustomerParcelDetailResponse, tags=["Customer Dashboard"])
async def get_customer_parcel_detail(
    tracking_id: str,
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> CustomerParcelDetailResponse:
    """
    Get full parcel details including masked phone, addresses, dimensions and complete status timeline.
    Works seamlessly with live DB, customer registry, and real-time courier updates.
    """
    clean_id = tracking_id.strip()

    # 1. Check live database if connected
    if service is not None:
        try:
            parcel_db = await service.get_parcel(clean_id)
            if parcel_db:
                st = parcel_db.status.value if hasattr(parcel_db.status, "value") else str(parcel_db.status)
                c_at = parcel_db.created_at or datetime.now(timezone.utc)
                u_at = parcel_db.updated_at or c_at
                now_str = c_at.isoformat()
                eta_str = (c_at + timedelta(days=2)).isoformat() if st != "cancelled" else None

                pickup_addr = _MOCK_CUSTOMER_ME["default_address"]
                pickup_city = _MOCK_CUSTOMER_ME["city"]
                tl = _build_db_parcel_timeline(
                    status=st,
                    created_at=c_at,
                    updated_at=u_at,
                    pickup_city=pickup_city,
                    delivery_city=parcel_db.delivery_city,
                    delivery_address=parcel_db.delivery_address,
                )

                return CustomerParcelDetailResponse(
                    tracking_id=parcel_db.tracking_number,
                    recipient_name=parcel_db.recipient_name,
                    recipient_phone_masked=_mask_phone(parcel_db.recipient_phone),
                    sender_name=_MOCK_CUSTOMER_ME["full_name"],
                    delivery_address=parcel_db.delivery_address,
                    delivery_city=parcel_db.delivery_city,
                    pickup_address=pickup_addr,
                    pickup_city=pickup_city,
                    status=st,
                    created_at=now_str,
                    eta=eta_str,
                    fee=350.0 + (parcel_db.weight_kg or 1.0) * 50.0,
                    weight_kg=parcel_db.weight_kg or 1.0,
                    dimensions=parcel_db.dimensions or "25x20x10 cm",
                    special_instructions=parcel_db.special_instructions,
                    notes=[],
                    timeline=tl,
                )
        except Exception:
            pass

    # 2. Check Customer in-memory parcels (case-insensitive)
    parcel = next((p for p in _MOCK_CUSTOMER_PARCELS if p["tracking_id"].upper() == clean_id.upper()), None)
    if parcel:
        return CustomerParcelDetailResponse(
            tracking_id=parcel["tracking_id"],
            recipient_name=parcel["recipient_name"],
            recipient_phone_masked=_mask_phone(parcel["recipient_phone"]),
            sender_name=parcel["sender_name"],
            delivery_address=parcel["delivery_address"],
            delivery_city=parcel["delivery_city"],
            pickup_address=parcel["pickup_address"],
            pickup_city=parcel["pickup_city"],
            status=parcel["status"],
            created_at=parcel["created_at"],
            eta=parcel.get("eta"),
            fee=parcel["fee"],
            weight_kg=parcel["weight_kg"],
            dimensions=parcel.get("dimensions") or "25x20x10 cm",
            special_instructions=parcel.get("special_instructions"),
            notes=parcel.get("notes", []),
            timeline=[
                CustomerTimelineEvent(
                    status=e["status"],
                    label=e["label"],
                    occurred_at=e["occurred_at"],
                    location=e.get("location"),
                )
                for e in parcel["timeline"]
            ],
        )

    # 3. Cross-role lookup: check Courier parcels for live real-time status updates
    try:
        from app.modules.couriers.routes import _MOCK_PARCELS as _COURIER_MOCK_PARCELS
        courier_p = next((p for p in _COURIER_MOCK_PARCELS if p["tracking_id"].upper() == clean_id.upper()), None)
        if courier_p:
            c_status = courier_p["status"]
            return CustomerParcelDetailResponse(
                tracking_id=courier_p["tracking_id"],
                recipient_name=courier_p.get("customer_name") or "Recipient",
                recipient_phone_masked=_mask_phone(courier_p.get("phone") or "+94770000000"),
                sender_name=_MOCK_CUSTOMER_ME["full_name"],
                delivery_address=courier_p.get("address") or courier_p.get("destination") or "Delivery Address",
                delivery_city=courier_p.get("destination") or "Colombo",
                pickup_address=_MOCK_CUSTOMER_ME["default_address"],
                pickup_city=_MOCK_CUSTOMER_ME["city"],
                status=c_status,
                created_at=courier_p.get("assigned_at") or datetime.now(timezone.utc).isoformat(),
                eta=courier_p.get("eta"),
                fee=450.0,
                weight_kg=1.5,
                dimensions="25x20x10 cm",
                special_instructions=None,
                notes=courier_p.get("notes", []),
                timeline=[
                    CustomerTimelineEvent(
                        status=e["status"],
                        label=e.get("label", e["status"].replace("_", " ").title()),
                        occurred_at=e["occurred_at"],
                        location=e.get("location"),
                    )
                    for e in courier_p.get("timeline", [])
                ],
            )
    except Exception:
        pass

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Parcel with tracking ID {tracking_id} not found",
    )


@router.post("/customer/parcels/{tracking_id}/cancel", response_model=CustomerParcelDetailResponse, tags=["Customer Dashboard"])
async def cancel_customer_parcel(
    tracking_id: str,
    payload: CustomerCancelParcelRequest,
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> CustomerParcelDetailResponse:
    """
    Cancel a pending delivery request (FR-CUS-05).
    Only allowed while parcel status is 'pending'.
    """
    if service is not None:
        try:
            parcel_db = await service.get_parcel(tracking_id)
            if parcel_db:
                st = parcel_db.status.value if hasattr(parcel_db.status, "value") else str(parcel_db.status)
                if st != "pending":
                    raise HTTPException(
                        status_code=status.HTTP_409_CONFLICT,
                        detail=f"Cannot cancel parcel with status '{st}'. Only pending deliveries can be cancelled.",
                    )
                await service.cancel_parcel(tracking_id)
                return await get_customer_parcel_detail(tracking_id, service)
        except HTTPException:
            raise
        except Exception:
            pass

    parcel = next((p for p in _MOCK_CUSTOMER_PARCELS if p["tracking_id"].upper() == tracking_id.strip().upper()), None)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with tracking ID {tracking_id} not found",
        )

    if parcel["status"] != "pending":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel parcel with status '{parcel['status']}'. Only pending deliveries can be cancelled.",
        )

    parcel["status"] = "cancelled"
    now = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    parcel["timeline"].append({
        "status": "cancelled",
        "label": "Cancelled by Customer",
        "occurred_at": now,
        "location": "Online Portal",
    })

    reason = payload.reason or "Cancelled by user"
    parcel.setdefault("notes", []).append(f"Cancellation reason: {reason}")

    return await get_customer_parcel_detail(tracking_id, service)


@router.post("/customer/parcels", response_model=CustomerParcelDetailResponse, status_code=status.HTTP_201_CREATED, tags=["Customer Dashboard"])
async def create_customer_parcel(
    payload: CustomerCreateParcelRequest,
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> CustomerParcelDetailResponse:
    """
    Create/Book a new delivery for the customer.
    Persists to DB if available, and updates in-memory registry.
    """
    now = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    fee = payload.fee or 350.0

    if service is not None:
        try:
            created_db = await service.create_parcel(payload, sender_id=1)
            if created_db:
                # Keep in-memory cache synchronized
                _MOCK_CUSTOMER_PARCELS.append({
                    "tracking_id": created_db.tracking_number,
                    "recipient_name": created_db.recipient_name,
                    "recipient_phone": created_db.recipient_phone,
                    "sender_name": _MOCK_CUSTOMER_ME["full_name"],
                    "delivery_address": created_db.delivery_address,
                    "delivery_city": created_db.delivery_city,
                    "pickup_address": payload.pickup_address or _MOCK_CUSTOMER_ME["default_address"],
                    "pickup_city": payload.pickup_city or _MOCK_CUSTOMER_ME["city"],
                    "status": "pending",
                    "created_at": now,
                    "eta": (datetime.now() + timedelta(days=1)).isoformat(),
                    "fee": fee,
                    "weight_kg": created_db.weight_kg,
                    "dimensions": created_db.dimensions or "20 x 15 x 10 cm",
                    "special_instructions": created_db.special_instructions,
                    "notes": [],
                    "timeline": [
                        {
                            "status": "pending",
                            "label": "Order Created",
                            "occurred_at": now,
                            "location": "Online Portal",
                        }
                    ],
                })
                return await get_customer_parcel_detail(created_db.tracking_number, service)
        except Exception:
            pass

    tracking_id = f"NXD-CUS-{100 + len(_MOCK_CUSTOMER_PARCELS) + 1}"
    new_parcel = {
        "tracking_id": tracking_id,
        "recipient_name": payload.recipient_name,
        "recipient_phone": payload.recipient_phone,
        "sender_name": _MOCK_CUSTOMER_ME["full_name"],
        "delivery_address": payload.delivery_address,
        "delivery_city": payload.delivery_city,
        "pickup_address": payload.pickup_address or _MOCK_CUSTOMER_ME["default_address"],
        "pickup_city": payload.pickup_city or _MOCK_CUSTOMER_ME["city"],
        "status": "pending",
        "created_at": now,
        "eta": (datetime.now() + timedelta(days=1)).isoformat(),
        "fee": fee,
        "weight_kg": payload.weight_kg,
        "dimensions": payload.dimensions or "20 x 15 x 10 cm",
        "special_instructions": payload.special_instructions,
        "notes": [],
        "timeline": [
            {
                "status": "pending",
                "label": "Order Created",
                "occurred_at": now,
                "location": "Online Portal",
            }
        ],
    }
    _MOCK_CUSTOMER_PARCELS.append(new_parcel)
    return await get_customer_parcel_detail(tracking_id, service)


# ── Customer Address Endpoints ─────────────────────────────────────


@router.get("/customer/addresses", response_model=List[CustomerAddressResponse], tags=["Customer Addresses"])
async def list_customer_addresses(
    type: Optional[str] = Query(None, description="Filter by 'pickup' or 'dropoff'"),
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> List[CustomerAddressResponse]:
    """
    List saved pickup and drop-off addresses for the customer.
    """
    if service is not None:
        try:
            addresses = await service.list_addresses(customer_id=1, address_type=type)
            if addresses:
                return [CustomerAddressResponse.model_validate(a) for a in addresses]
        except Exception:
            pass

    result = _MOCK_CUSTOMER_ADDRESSES
    if type:
        result = [a for a in result if a["address_type"] == type]
    return [CustomerAddressResponse(**a) for a in result]


@router.post("/customer/addresses", response_model=CustomerAddressResponse, status_code=status.HTTP_201_CREATED, tags=["Customer Addresses"])
async def create_customer_address(
    payload: CustomerAddressCreate,
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> CustomerAddressResponse:
    """
    Create a new saved address for the customer.
    """
    if service is not None:
        try:
            address = await service.create_address(payload, customer_id=1)
            if address:
                return CustomerAddressResponse.model_validate(address)
        except Exception:
            pass

    new_id = max((a["id"] for a in _MOCK_CUSTOMER_ADDRESSES), default=0) + 1
    now = datetime.now(timezone.utc)
    if payload.is_default:
        for a in _MOCK_CUSTOMER_ADDRESSES:
            if a["address_type"] == payload.address_type:
                a["is_default"] = False

    new_addr = {
        "id": new_id,
        "customer_id": 1,
        **payload.model_dump(),
        "created_at": now,
        "updated_at": now,
    }
    _MOCK_CUSTOMER_ADDRESSES.append(new_addr)
    return CustomerAddressResponse(**new_addr)


@router.put("/customer/addresses/{address_id}", response_model=CustomerAddressResponse, tags=["Customer Addresses"])
async def update_customer_address(
    address_id: int,
    payload: CustomerAddressUpdate,
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> CustomerAddressResponse:
    """
    Update an existing saved address.
    """
    if service is not None:
        try:
            updated = await service.update_address(address_id, payload, customer_id=1)
            if updated:
                return CustomerAddressResponse.model_validate(updated)
        except Exception:
            pass

    target = next((a for a in _MOCK_CUSTOMER_ADDRESSES if a["id"] == address_id), None)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Address with ID {address_id} not found",
        )

    if payload.is_default:
        target_type = payload.address_type or target["address_type"]
        for a in _MOCK_CUSTOMER_ADDRESSES:
            if a["address_type"] == target_type:
                a["is_default"] = False

    for k, v in payload.model_dump(exclude_unset=True).items():
        target[k] = v
    target["updated_at"] = datetime.now(timezone.utc)

    return CustomerAddressResponse(**target)


@router.delete("/customer/addresses/{address_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Customer Addresses"])
async def delete_customer_address(
    address_id: int,
    service: Optional[CustomerService] = Depends(get_customer_service),
):
    """
    Delete a saved address.
    """
    if service is not None:
        try:
            deleted = await service.delete_address(address_id, customer_id=1)
            if deleted:
                return None
        except Exception:
            pass

    idx = next((i for i, a in enumerate(_MOCK_CUSTOMER_ADDRESSES) if a["id"] == address_id), None)
    if idx is not None:
        _MOCK_CUSTOMER_ADDRESSES.pop(idx)
        return None

    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail=f"Address with ID {address_id} not found",
    )


@router.patch("/customer/addresses/{address_id}/default", response_model=CustomerAddressResponse, tags=["Customer Addresses"])
async def set_default_customer_address(
    address_id: int,
    service: Optional[CustomerService] = Depends(get_customer_service),
) -> CustomerAddressResponse:
    """
    Set an address as default for its type (pickup or dropoff).
    """
    if service is not None:
        try:
            defaulted = await service.set_default_address(address_id, customer_id=1)
            if defaulted:
                return CustomerAddressResponse.model_validate(defaulted)
        except Exception:
            pass

    target = next((a for a in _MOCK_CUSTOMER_ADDRESSES if a["id"] == address_id), None)
    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Address with ID {address_id} not found",
        )

    for a in _MOCK_CUSTOMER_ADDRESSES:
        if a["address_type"] == target["address_type"]:
            a["is_default"] = False

    target["is_default"] = True
    target["updated_at"] = datetime.now(timezone.utc)

    return CustomerAddressResponse(**target)
