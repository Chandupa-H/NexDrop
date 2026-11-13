from typing import List, Optional
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.modules.couriers.schemas import (
    CourierResponse,
    CourierLocationUpdate,
    CourierMeResponse,
    DashboardSummaryResponse,
    DashboardTotals,
    DashboardKPI,
    WeeklyDelivery,
    ParcelListResponse,
    ParcelListItem,
    ParcelDetailResponse,
    ParcelStatusUpdateRequest,
    TimelineEvent,
)
from app.modules.couriers.repository import CourierRepository
from app.modules.couriers.service import CourierService
from app.core.auth import AuthenticatedUser, get_optional_current_user

router = APIRouter(prefix="/couriers", tags=["Couriers"])


def get_courier_service(session: AsyncSession = Depends(get_db)) -> CourierService:
    return CourierService(CourierRepository(session))


# ── Existing Courier Fleet Routes ──────────────────────────────────


@router.get("", response_model=List[CourierResponse])
async def list_couriers(
    skip: int = 0,
    limit: int = 50,
    available_only: bool = False,
    service: CourierService = Depends(get_courier_service),
) -> List[CourierResponse]:
    if available_only:
        couriers = await service.list_available()
    else:
        couriers = await service.list_couriers(skip=skip, limit=limit)
    return [CourierResponse.model_validate(c) for c in couriers]


@router.get("/{courier_id}", response_model=CourierResponse)
async def get_courier(
    courier_id: int,
    service: CourierService = Depends(get_courier_service),
) -> CourierResponse:
    courier = await service.get_courier(courier_id)
    if not courier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Courier with ID {courier_id} not found",
        )
    return CourierResponse.model_validate(courier)


@router.patch("/{courier_id}/location", response_model=CourierResponse)
async def update_location(
    courier_id: int,
    payload: CourierLocationUpdate,
    service: CourierService = Depends(get_courier_service),
) -> CourierResponse:
    courier = await service.update_location(courier_id, payload)
    if not courier:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Courier with ID {courier_id} not found",
        )
    return CourierResponse.model_validate(courier)


# ── In-Memory Mock Data (Courier Dashboard) ───────────────────────
# TODO(db): replace with a repository on SQLAlchemy
# Note: This in-memory state resets when the server restarts or reloads.


# Mock parcel data with Sri Lankan names and destinations (Oct 31, 2026)
# Counts: delivered=16, in_transit group=5 (picked_up=1, in_transit=2, out_for_delivery=2), pending=3, failed=1, total=25
_MOCK_PARCELS = [
    # Delivered (16)
    {"tracking_id": "NXD001248", "customer_name": "Kavindu Perera", "phone": "+94771234521", "destination": "Colombo", "address": "123 Galle Road, Colombo 03", "status": "delivered", "assigned_at": "2026-10-31T08:20:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T07:00:00+05:30", "location": "Warehouse"}, {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T08:20:00+05:30", "location": "Colombo Hub"}, {"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T10:15:00+05:30", "location": "Colombo 03"}]},
    {"tracking_id": "NXD001245", "customer_name": "Isuru Madushan", "phone": "+94772345632", "destination": "Matara", "address": "45 Beach Road, Matara", "status": "delivered", "assigned_at": "2026-10-31T07:45:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T06:30:00+05:30", "location": "Warehouse"}, {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T07:45:00+05:30", "location": "Matara Hub"}, {"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T09:30:00+05:30", "location": "Matara"}]},
    {"tracking_id": "NXD001240", "customer_name": "Dilshan Fernando", "phone": "+94773456743", "destination": "Galle", "address": "67 Fort Road, Galle", "status": "delivered", "assigned_at": "2026-10-31T07:00:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T06:00:00+05:30"}, {"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T09:00:00+05:30", "location": "Galle"}]},
    {"tracking_id": "NXD001239", "customer_name": "Harini Jayawardena", "phone": "+94774567854", "destination": "Kandy", "address": "89 Peradeniya Road, Kandy", "status": "delivered", "assigned_at": "2026-10-31T06:30:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T08:45:00+05:30", "location": "Kandy"}]},
    {"tracking_id": "NXD001238", "customer_name": "Anusha Perera", "phone": "+94775678965", "destination": "Colombo", "address": "12 Duplication Road, Colombo 04", "status": "delivered", "assigned_at": "2026-10-31T06:00:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T08:30:00+05:30", "location": "Colombo 04"}]},
    {"tracking_id": "NXD001237", "customer_name": "Roshan Silva", "phone": "+94776789076", "destination": "Kandy", "address": "34 Dalada Veediya, Kandy", "status": "delivered", "assigned_at": "2026-10-31T05:45:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T08:15:00+05:30"}]},
    {"tracking_id": "NXD001236", "customer_name": "Chamara Rajapaksa", "phone": "+94777890187", "destination": "Matara", "address": "56 Main Street, Matara", "status": "delivered", "assigned_at": "2026-10-31T05:30:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T08:00:00+05:30"}]},
    {"tracking_id": "NXD001235", "customer_name": "Tharushi Wickramasinghe", "phone": "+94778901298", "destination": "Galle", "address": "78 Lighthouse Street, Galle", "status": "delivered", "assigned_at": "2026-10-31T05:15:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T07:45:00+05:30"}]},
    {"tracking_id": "NXD001234", "customer_name": "Malith Bandara", "phone": "+94779012309", "destination": "Colombo", "address": "90 Baseline Road, Colombo 09", "status": "delivered", "assigned_at": "2026-10-31T05:00:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T07:30:00+05:30"}]},
    {"tracking_id": "NXD001233", "customer_name": "Sanduni Liyanage", "phone": "+94770123410", "destination": "Kandy", "address": "23 Queens Road, Kandy", "status": "delivered", "assigned_at": "2026-10-31T04:45:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T07:15:00+05:30"}]},
    {"tracking_id": "NXD001232", "customer_name": "Kasun Gamage", "phone": "+94771234511", "destination": "Matara", "address": "45 Station Road, Matara", "status": "delivered", "assigned_at": "2026-10-31T04:30:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T07:00:00+05:30"}]},
    {"tracking_id": "NXD001231", "customer_name": "Nishantha de Silva", "phone": "+94772345612", "destination": "Galle", "address": "67 Rampart Street, Galle", "status": "delivered", "assigned_at": "2026-10-31T04:15:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T06:45:00+05:30"}]},
    {"tracking_id": "NXD001230", "customer_name": "Dinusha Rathnayake", "phone": "+94773456713", "destination": "Colombo", "address": "89 Ward Place, Colombo 07", "status": "delivered", "assigned_at": "2026-10-31T04:00:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T06:30:00+05:30"}]},
    {"tracking_id": "NXD001229", "customer_name": "Lahiru Amarasinghe", "phone": "+94774567814", "destination": "Kandy", "address": "12 Katugastota Road, Kandy", "status": "delivered", "assigned_at": "2026-10-31T03:45:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T06:15:00+05:30"}]},
    {"tracking_id": "NXD001228", "customer_name": "Priyanka Herath", "phone": "+94775678915", "destination": "Matara", "address": "34 Matara Road, Matara", "status": "delivered", "assigned_at": "2026-10-31T03:30:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T06:00:00+05:30"}]},
    {"tracking_id": "NXD001227", "customer_name": "Ruwan Wijesuriya", "phone": "+94776789016", "destination": "Galle", "address": "56 Hospital Road, Galle", "status": "delivered", "assigned_at": "2026-10-31T03:15:00+05:30", "eta": None, "notes": [], "timeline": [{"status": "delivered", "label": "Delivered", "occurred_at": "2026-10-31T05:45:00+05:30"}]},
    # In-Transit Group (5): picked_up=1, in_transit=2, out_for_delivery=2
    {"tracking_id": "NXD001247", "customer_name": "Nethmi Silva", "phone": "+94771234522", "destination": "Kandy", "address": "56 Temple Street, Kandy", "status": "in_transit", "assigned_at": "2026-10-31T08:00:00+05:30", "eta": "2026-10-31T10:45:00+05:30", "notes": [], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T07:30:00+05:30"}, {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T08:00:00+05:30", "location": "Kandy Hub"}, {"status": "in_transit", "label": "In Transit", "occurred_at": "2026-10-31T08:30:00+05:30", "location": "On Route"}]},
    {"tracking_id": "NXD001244", "customer_name": "Amaya Jayasuriya", "phone": "+94772345633", "destination": "Kandy", "address": "78 Hill Street, Kandy", "status": "out_for_delivery", "assigned_at": "2026-10-31T07:30:00+05:30", "eta": "2026-10-31T11:00:00+05:30", "notes": ["Deliver before noon"], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T06:45:00+05:30"}, {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T07:30:00+05:30"}, {"status": "out_for_delivery", "label": "Out for Delivery", "occurred_at": "2026-10-31T09:00:00+05:30"}]},
    {"tracking_id": "NXD001242", "customer_name": "Sachini Ratnayake", "phone": "+94773456744", "destination": "Colombo", "address": "34 Bambalapitiya, Colombo 04", "status": "out_for_delivery", "assigned_at": "2026-10-31T07:15:00+05:30", "eta": "2026-10-31T10:30:00+05:30", "notes": [], "timeline": [{"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T07:15:00+05:30"}, {"status": "out_for_delivery", "label": "Out for Delivery", "occurred_at": "2026-10-31T08:45:00+05:30"}]},
    {"tracking_id": "NXD001241", "customer_name": "Thilina Kumara", "phone": "+94774567855", "destination": "Galle", "address": "12 Main Road, Galle", "status": "in_transit", "assigned_at": "2026-10-31T07:10:00+05:30", "eta": "2026-10-31T11:15:00+05:30", "notes": [], "timeline": [{"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T07:10:00+05:30"}, {"status": "in_transit", "label": "In Transit", "occurred_at": "2026-10-31T08:00:00+05:30"}]},
    {"tracking_id": "NXD001226", "customer_name": "Janaka Perera", "phone": "+94777890117", "destination": "Colombo", "address": "78 Flower Road, Colombo 07", "status": "picked_up", "assigned_at": "2026-10-31T03:00:00+05:30", "eta": "2026-10-31T11:30:00+05:30", "notes": [], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T02:30:00+05:30"}, {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T03:00:00+05:30", "location": "Colombo Hub"}]},
    # Pending (3)
    {"tracking_id": "NXD001246", "customer_name": "Sahan Wijesinghe", "phone": "+94771234523", "destination": "Galle", "address": "90 Sea View Road, Galle", "status": "pending", "assigned_at": "2026-10-31T08:10:00+05:30", "eta": "2026-10-31T12:00:00+05:30", "notes": [], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T08:10:00+05:30", "location": "Warehouse"}]},
    {"tracking_id": "NXD001225", "customer_name": "Vimukthi Silva", "phone": "+94778901218", "destination": "Kandy", "address": "90 Ampitiya Road, Kandy", "status": "pending", "assigned_at": "2026-10-31T02:45:00+05:30", "eta": "2026-10-31T12:30:00+05:30", "notes": [], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T02:45:00+05:30"}]},
    {"tracking_id": "NXD001224", "customer_name": "Nadeesha Jayawardena", "phone": "+94779012319", "destination": "Matara", "address": "12 Temple Road, Matara", "status": "pending", "assigned_at": "2026-10-31T02:30:00+05:30", "eta": "2026-10-31T13:00:00+05:30", "notes": [], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T02:30:00+05:30"}]},
    # Failed (1)
    {"tracking_id": "NXD001243", "customer_name": "Tharindu Bandara", "phone": "+94772345634", "destination": "Galle", "address": "23 Hikkaduwa Road, Galle", "status": "failed", "assigned_at": "2026-10-31T07:20:00+05:30", "eta": None, "notes": ["Customer unavailable", "Attempted delivery at 09:30 AM"], "timeline": [{"status": "pending", "label": "Order Created", "occurred_at": "2026-10-31T07:00:00+05:30"}, {"status": "picked_up", "label": "Picked Up", "occurred_at": "2026-10-31T07:20:00+05:30"}, {"status": "out_for_delivery", "label": "Out for Delivery", "occurred_at": "2026-10-31T08:30:00+05:30"}, {"status": "failed", "label": "Delivery Failed", "occurred_at": "2026-10-31T09:30:00+05:30", "location": "Galle"}]},
]


# TODO(platform): require the courier role via the shared auth dependency


@router.get("/courier/me", response_model=CourierMeResponse, tags=["Courier Dashboard"])
async def get_courier_me(
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
) -> CourierMeResponse:
    """
    Get the authenticated courier's profile.
    Resolves dynamically from bearer session token if authenticated, or falls back to demo courier.
    """
    if current_user:
        name = (
            current_user.email.split("@")[0].replace(".", " ").title()
            if current_user.email
            else "Authenticated Courier"
        )
        return CourierMeResponse(id=1, full_name=name, role=current_user.role.value)

    return CourierMeResponse(id=1, full_name="Poorna Danushka", role="courier")


@router.get("/courier/dashboard/summary", response_model=DashboardSummaryResponse, tags=["Courier Dashboard"])
async def get_dashboard_summary() -> DashboardSummaryResponse:
    """
    Dashboard summary computed from in-memory parcels.
    Counts are never hard-coded; they're always computed from _MOCK_PARCELS.
    """
    # Compute totals
    delivered = sum(1 for p in _MOCK_PARCELS if p["status"] == "delivered")
    pending = sum(1 for p in _MOCK_PARCELS if p["status"] == "pending")
    failed = sum(1 for p in _MOCK_PARCELS if p["status"] == "failed")
    in_transit = sum(1 for p in _MOCK_PARCELS if p["status"] in ["picked_up", "in_transit", "out_for_delivery"])
    assigned = len(_MOCK_PARCELS)

    # KPIs with fixed deltas
    kpis = [
        DashboardKPI(key="assigned", value=assigned, delta_pct=12),
        DashboardKPI(key="delivered", value=delivered, delta_pct=8),
        DashboardKPI(key="in_transit", value=in_transit, delta_pct=24),
        DashboardKPI(key="pending", value=pending, delta_pct=-5),
    ]

    # Weekly deliveries: Sun-Sat, Oct 26-31, 2026 (Sat is today with real delivered count)
    weekly_deliveries = [
        WeeklyDelivery(date="2026-10-25", delivered=12),  # Sunday
        WeeklyDelivery(date="2026-10-26", delivered=18),  # Monday
        WeeklyDelivery(date="2026-10-27", delivered=22),  # Tuesday
        WeeklyDelivery(date="2026-10-28", delivered=15),  # Wednesday
        WeeklyDelivery(date="2026-10-29", delivered=28),  # Thursday
        WeeklyDelivery(date="2026-10-30", delivered=19),  # Friday
        WeeklyDelivery(date="2026-10-31", delivered=delivered),  # Saturday (today)
    ]

    return DashboardSummaryResponse(
        totals=DashboardTotals(
            assigned=assigned,
            delivered=delivered,
            in_transit=in_transit,
            pending=pending,
            failed=failed,
        ),
        kpis=kpis,
        weekly_deliveries=weekly_deliveries,
    )


@router.get("/courier/parcels", response_model=ParcelListResponse, tags=["Courier Dashboard"])
async def get_courier_parcels(
    status: Optional[str] = Query(None, description="Comma-separated status filter (e.g., 'pending,in_transit')"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> ParcelListResponse:
    """
    List assigned parcels with optional status filter and pagination.
    Sorted newest first (by assigned_at descending).
    """
    # Parse status filter
    status_filters = None
    if status:
        status_filters = [s.strip() for s in status.split(",") if s.strip()]

    # Filter parcels
    filtered = _MOCK_PARCELS
    if status_filters:
        filtered = [p for p in filtered if p["status"] in status_filters]

    # Sort newest first
    filtered = sorted(filtered, key=lambda p: p["assigned_at"], reverse=True)

    # Paginate
    total = len(filtered)
    items = filtered[offset : offset + limit]

    return ParcelListResponse(
        items=[
            ParcelListItem(
                tracking_id=p["tracking_id"],
                customer_name=p["customer_name"],
                destination=p["destination"],
                status=p["status"],
                assigned_at=p["assigned_at"],
                eta=p.get("eta"),
            )
            for p in items
        ],
        total=total,
    )


@router.get("/courier/parcels/{tracking_id}", response_model=ParcelDetailResponse, tags=["Courier Dashboard"])
async def get_parcel_detail(tracking_id: str) -> ParcelDetailResponse:
    """
    Get full parcel details including masked phone and timeline.
    Returns 404 if tracking_id not found.
    """
    parcel = next((p for p in _MOCK_PARCELS if p["tracking_id"] == tracking_id), None)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with tracking ID {tracking_id} not found",
        )

    # Mask phone: "+94 77 *** 4521" from "+94771234521"
    phone = parcel["phone"]
    # Expected format: +94771234521 (12 chars)
    if len(phone) >= 12 and phone.startswith("+94"):
        # +94771234521 -> +94 771 *** 4521
        masked = phone[:3] + " " + phone[3:6] + " *** " + phone[-4:]
    elif len(phone) >= 10:
        masked = phone[:7] + " *** " + phone[-4:]
    else:
        masked = phone

    return ParcelDetailResponse(
        tracking_id=parcel["tracking_id"],
        customer_name=parcel["customer_name"],
        customer_phone_masked=masked,
        destination=parcel["destination"],
        address_line=parcel["address"],
        status=parcel["status"],
        assigned_at=parcel["assigned_at"],
        eta=parcel.get("eta"),
        notes=parcel.get("notes", []),
        timeline=[
            TimelineEvent(
                status=e["status"],
                label=e["label"],
                occurred_at=e["occurred_at"],
                location=e.get("location"),
            )
            for e in parcel["timeline"]
        ],
    )


@router.patch("/courier/parcels/{tracking_id}/status", response_model=ParcelDetailResponse, tags=["Courier Dashboard"])
async def update_parcel_status(tracking_id: str, payload: ParcelStatusUpdateRequest) -> ParcelDetailResponse:
    """
    Update parcel status with validation for valid transitions and required fields.
    Valid flow: pending → picked_up → in_transit → out_for_delivery → delivered
    failed is allowed from picked_up, in_transit, or out_for_delivery and REQUIRES failure_reason.
    Invalid transition returns 409. Missing failure_reason for failed returns 422.
    """
    parcel = next((p for p in _MOCK_PARCELS if p["tracking_id"] == tracking_id), None)
    if not parcel:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Parcel with tracking ID {tracking_id} not found",
        )

    current_status = parcel["status"]
    new_status = payload.status

    # Terminal states
    if current_status in ["delivered", "failed"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot update parcel in terminal status '{current_status}'",
        )

    # Valid transitions
    valid_transitions = {
        "pending": ["picked_up"],
        "picked_up": ["in_transit", "failed"],
        "in_transit": ["out_for_delivery", "failed"],
        "out_for_delivery": ["delivered", "failed"],
    }

    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invalid transition from '{current_status}' to '{new_status}'",
        )

    # Validate failure_reason for failed status
    if new_status == "failed" and not payload.failure_reason:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="failure_reason is required when status is 'failed'",
        )

    # Update parcel
    parcel["status"] = new_status
    now = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()

    # Append timeline event
    label_map = {
        "pending": "Order Created",
        "picked_up": "Picked Up",
        "in_transit": "In Transit",
        "out_for_delivery": "Out for Delivery",
        "delivered": "Delivered",
        "failed": "Delivery Failed",
    }
    parcel["timeline"].append({
        "status": new_status,
        "label": label_map.get(new_status, new_status.replace("_", " ").title()),
        "occurred_at": now,
        "location": parcel["destination"] if new_status in ["delivered", "failed"] else None,
    })

    # Append note if provided
    if payload.note:
        parcel.setdefault("notes", []).append(payload.note)
    if new_status == "failed" and payload.failure_reason:
        reason_text = payload.failure_reason.replace("_", " ").title()
        parcel.setdefault("notes", []).append(f"Failure reason: {reason_text}")

    # Return updated detail
    return await get_parcel_detail(tracking_id)
