from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.customers.schemas import (
    CustomerResponse,
    CustomerMeResponse,
    CustomerDashboardSummaryResponse,
    CustomerDashboardTotals,
    CustomerDashboardKPI,
    CustomerWeeklyOrder,
    CustomerParcelListResponse,
    CustomerParcelListItem,
    CustomerParcelDetailResponse,
    CustomerTimelineEvent,
    CustomerCancelParcelRequest,
)
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])


def get_customer_service(session: AsyncSession = Depends(get_db)) -> CustomerService:
    return CustomerService(CustomerRepository(session))


# ── Existing Customer Management Routes ────────────────────────────


@router.get("", response_model=List[CustomerResponse])
async def list_customers(
    skip: int = 0,
    limit: int = 50,
    service: CustomerService = Depends(get_customer_service),
) -> List[CustomerResponse]:
    customers = await service.list_customers(skip=skip, limit=limit)
    return [CustomerResponse.model_validate(c) for c in customers]


@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: int,
    service: CustomerService = Depends(get_customer_service),
) -> CustomerResponse:
    customer = await service.get_customer(customer_id)
    if not customer:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Customer with ID {customer_id} not found",
        )
    return CustomerResponse.model_validate(customer)


# ── In-Memory Mock Data (Customer Dashboard) ───────────────────────
# Follows the modular monolith guide: provides mock data on backend when DB records are not yet linked

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

_MOCK_CUSTOMER_PARCELS = [
    {
        "tracking_id": "NXD-CUS-101",
        "recipient_name": "Nethmi Silva",
        "recipient_phone": "+94771234522",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "56 Temple Street, Kandy",
        "delivery_city": "Kandy",
        "pickup_address": "45/2 Temple Road, Colombo 07",
        "pickup_city": "Colombo",
        "status": "out_for_delivery",
        "created_at": "2026-10-31T08:00:00+05:30",
        "eta": "2026-10-31T14:30:00+05:30",
        "fee": 650.00,
        "weight_kg": 1.5,
        "dimensions": "25 x 15 x 10 cm",
        "special_instructions": "Please call before arriving.",
        "notes": ["Assigned to courier Samantha Perera"],
        "timeline": [
            {"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T08:00:00+05:30", "location": "Online Portal"},
            {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T09:15:00+05:30", "location": "Colombo 07 Hub"},
            {"status": "in_transit", "label": "In Transit to Kandy Hub", "occurred_at": "2026-10-31T11:00:00+05:30", "location": "Central Expressway"},
            {"status": "out_for_delivery", "label": "Out for Delivery", "occurred_at": "2026-10-31T13:30:00+05:30", "location": "Kandy City"},
        ],
    },
    {
        "tracking_id": "NXD-CUS-102",
        "recipient_name": "Amaya Jayasuriya",
        "recipient_phone": "+94772345633",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "78 Hill Street, Kandy",
        "delivery_city": "Kandy",
        "pickup_address": "45/2 Temple Road, Colombo 07",
        "pickup_city": "Colombo",
        "status": "in_transit",
        "created_at": "2026-10-31T07:30:00+05:30",
        "eta": "2026-10-31T16:00:00+05:30",
        "fee": 520.00,
        "weight_kg": 0.8,
        "dimensions": "20 x 10 x 5 cm",
        "special_instructions": "Fragile items inside.",
        "notes": ["Dispatched from Colombo Sorting Facility"],
        "timeline": [
            {"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T07:30:00+05:30", "location": "Online Portal"},
            {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T08:45:00+05:30", "location": "Colombo 07"},
            {"status": "in_transit", "label": "In Transit", "occurred_at": "2026-10-31T10:15:00+05:30", "location": "Kadawatha Interchange"},
        ],
    },
    {
        "tracking_id": "NXD-CUS-103",
        "recipient_name": "Sachini Ratnayake",
        "recipient_phone": "+94773456744",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "34 Bambalapitiya, Colombo 04",
        "delivery_city": "Colombo",
        "pickup_address": "45/2 Temple Road, Colombo 07",
        "pickup_city": "Colombo",
        "status": "picked_up",
        "created_at": "2026-10-31T09:00:00+05:30",
        "eta": "2026-10-31T15:00:00+05:30",
        "fee": 380.00,
        "weight_kg": 0.5,
        "dimensions": "15 x 10 x 5 cm",
        "special_instructions": "Leave at front desk with security.",
        "notes": ["Courier assigned"],
        "timeline": [
            {"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T09:00:00+05:30", "location": "Online Portal"},
            {"status": "picked_up", "label": "Picked Up from Sender", "occurred_at": "2026-10-31T10:00:00+05:30", "location": "Colombo 07"},
        ],
    },
    {
        "tracking_id": "NXD-CUS-104",
        "recipient_name": "Thilina Kumara",
        "recipient_phone": "+94774567855",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "12 Main Road, Galle",
        "delivery_city": "Galle",
        "pickup_address": "45/2 Temple Road, Colombo 07",
        "pickup_city": "Colombo",
        "status": "pending",
        "created_at": "2026-10-31T09:45:00+05:30",
        "eta": "2026-11-01T12:00:00+05:30",
        "fee": 750.00,
        "weight_kg": 2.2,
        "dimensions": "30 x 20 x 15 cm",
        "special_instructions": "Hand over to recipient only.",
        "notes": ["Waiting for dispatch allocation"],
        "timeline": [
            {"status": "pending", "label": "Delivery Request Received", "occurred_at": "2026-10-31T09:45:00+05:30", "location": "Online Portal"},
        ],
    },
    {
        "tracking_id": "NXD-CUS-105",
        "recipient_name": "Dilshan Fernando",
        "recipient_phone": "+94773456743",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "67 Fort Road, Galle",
        "delivery_city": "Galle",
        "pickup_address": "45/2 Temple Road, Colombo 07",
        "pickup_city": "Colombo",
        "status": "delivered",
        "created_at": "2026-10-30T09:15:00+05:30",
        "eta": None,
        "fee": 820.00,
        "weight_kg": 2.5,
        "dimensions": "35 x 25 x 15 cm",
        "special_instructions": None,
        "notes": ["Delivered and signed by recipient"],
        "timeline": [
            {"status": "pending", "label": "Order Created", "occurred_at": "2026-10-30T09:15:00+05:30", "location": "Online Portal"},
            {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-30T10:30:00+05:30", "location": "Colombo 07 Hub"},
            {"status": "in_transit", "label": "In Transit", "occurred_at": "2026-10-30T13:00:00+05:30", "location": "Southern Expressway"},
            {"status": "out_for_delivery", "label": "Out for Delivery", "occurred_at": "2026-10-30T15:30:00+05:30", "location": "Galle Fort"},
            {"status": "delivered", "label": "Delivered Successfully", "occurred_at": "2026-10-30T16:45:00+05:30", "location": "67 Fort Road, Galle"},
        ],
    },
    {
        "tracking_id": "NXD-CUS-106",
        "recipient_name": "Harini Jayawardena",
        "recipient_phone": "+94774567854",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "89 Peradeniya Road, Kandy",
        "delivery_city": "Kandy",
        "pickup_address": "45/2 Temple Road, Colombo 07",
        "pickup_city": "Colombo",
        "status": "delivered",
        "created_at": "2026-10-29T11:00:00+05:30",
        "eta": None,
        "fee": 450.00,
        "weight_kg": 1.0,
        "dimensions": "20 x 15 x 8 cm",
        "special_instructions": None,
        "notes": [],
        "timeline": [
            {"status": "pending", "label": "Order Created", "occurred_at": "2026-10-29T11:00:00+05:30", "location": "Online Portal"},
            {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-29T13:00:00+05:30", "location": "Colombo 07 Hub"},
            {"status": "in_transit", "label": "In Transit", "occurred_at": "2026-10-29T15:00:00+05:30", "location": "Central Highway"},
            {"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-29T18:00:00+05:30", "location": "Kandy"},
        ],
    },
    {
        "tracking_id": "NXD-CUS-107",
        "recipient_name": "Anusha Perera",
        "recipient_phone": "+94775678965",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "12 Duplication Road, Colombo 04",
        "delivery_city": "Colombo",
        "pickup_address": "45/2 Temple Road, Colombo 07",
        "pickup_city": "Colombo",
        "status": "delivered",
        "created_at": "2026-10-28T14:20:00+05:30",
        "eta": None,
        "fee": 350.00,
        "weight_kg": 0.4,
        "dimensions": "15 x 10 x 5 cm",
        "special_instructions": None,
        "notes": [],
        "timeline": [
            {"status": "pending", "label": "Order Created", "occurred_at": "2026-10-28T14:20:00+05:30", "location": "Online Portal"},
            {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-28T15:00:00+05:30", "location": "Colombo 07"},
            {"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-28T16:30:00+05:30", "location": "Colombo 04"},
        ],
    },
    {
        "tracking_id": "NXD-CUS-108",
        "recipient_name": "Roshan Silva",
        "recipient_phone": "+94776789076",
        "sender_name": "Dihini Kankanamage",
        "delivery_address": "34 Dalada Veediya, Kandy",
        "delivery_city": "Kandy",
        "pickup_address": "45/2 Temple Road, Colombo 07",
        "pickup_city": "Colombo",
        "status": "cancelled",
        "created_at": "2026-10-27T10:00:00+05:30",
        "eta": None,
        "fee": 490.00,
        "weight_kg": 1.1,
        "dimensions": "20 x 15 x 10 cm",
        "special_instructions": None,
        "notes": ["Cancelled by customer: item no longer required."],
        "timeline": [
            {"status": "pending", "label": "Order Created", "occurred_at": "2026-10-27T10:00:00+05:30", "location": "Online Portal"},
            {"status": "cancelled", "label": "Cancelled by Customer", "occurred_at": "2026-10-27T10:35:00+05:30", "location": "Online Portal"},
        ],
    },
]


def _mask_phone(phone: str) -> str:
    if len(phone) >= 12 and phone.startswith("+94"):
        return phone[:3] + " " + phone[3:6] + " *** " + phone[-4:]
    elif len(phone) >= 10:
        return phone[:7] + " *** " + phone[-4:]
    return phone


# ── Customer Dashboard Endpoints ───────────────────────────────────


@router.get("/customer/me", response_model=CustomerMeResponse, tags=["Customer Dashboard"])
async def get_customer_me() -> CustomerMeResponse:
    """
    Get authenticated customer profile.
    TODO(platform): resolve user from session/auth token.
    """
    return CustomerMeResponse(**_MOCK_CUSTOMER_ME)


@router.get("/customer/dashboard/summary", response_model=CustomerDashboardSummaryResponse, tags=["Customer Dashboard"])
async def get_customer_dashboard_summary() -> CustomerDashboardSummaryResponse:
    """
    Dashboard summary computed dynamically from in-memory parcels.
    Counts satisfy: total_orders == active_deliveries + delivered + pending + cancelled.
    """
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

    weekly_orders = [
        CustomerWeeklyOrder(date="2026-10-25", orders=1),
        CustomerWeeklyOrder(date="2026-10-26", orders=2),
        CustomerWeeklyOrder(date="2026-10-27", orders=1),
        CustomerWeeklyOrder(date="2026-10-28", orders=1),
        CustomerWeeklyOrder(date="2026-10-29", orders=1),
        CustomerWeeklyOrder(date="2026-10-30", orders=1),
        CustomerWeeklyOrder(date="2026-10-31", orders=active_deliveries + pending),
    ]

    return CustomerDashboardSummaryResponse(
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
) -> CustomerParcelListResponse:
    """
    List customer parcels with optional status filtering and pagination.
    Sorted newest first.
    """
    filtered = _MOCK_CUSTOMER_PARCELS

    if status:
        allowed = [s.strip() for s in status.split(",") if s.strip()]
        # Support active group filter
        if "active" in allowed:
            active_set = {"picked_up", "in_transit", "out_for_delivery"}
            filtered = [p for p in filtered if p["status"] in active_set or p["status"] in allowed]
        else:
            filtered = [p for p in filtered if p["status"] in allowed]

    # Sort newest first
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


@router.get("/customer/parcels/{tracking_id}", response_model=CustomerParcelDetailResponse, tags=["Customer Dashboard"])
async def get_customer_parcel_detail(tracking_id: str) -> CustomerParcelDetailResponse:
    """
    Get full parcel details including masked phone, addresses, dimensions and complete status timeline.
    """
    parcel = next((p for p in _MOCK_CUSTOMER_PARCELS if p["tracking_id"] == tracking_id), None)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with tracking ID {tracking_id} not found",
        )

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
        dimensions=parcel.get("dimensions"),
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


@router.post("/customer/parcels/{tracking_id}/cancel", response_model=CustomerParcelDetailResponse, tags=["Customer Dashboard"])
async def cancel_customer_parcel(
    tracking_id: str,
    payload: CustomerCancelParcelRequest,
) -> CustomerParcelDetailResponse:
    """
    Cancel a pending delivery request (FR-CUS-05).
    Only allowed while parcel status is 'pending'.
    """
    parcel = next((p for p in _MOCK_CUSTOMER_PARCELS if p["tracking_id"] == tracking_id), None)
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

    return await get_customer_parcel_detail(tracking_id)
