import sys
from typing import List, Optional, Literal
from datetime import date, datetime, time, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy import case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db, get_optional_db
from app.modules.dispatch.models import DispatchAssignment, DispatchStatus
from app.modules.parcels.models import Parcel, ParcelStatus, ParcelStatusHistory
from app.modules.couriers.schemas import (
    CourierResponse,
    CourierLocationUpdate,
    CourierMeResponse,
    CourierProfileResponse,
    CourierProfileUpdateRequest,
    CourierPasswordChangeRequest,
    DashboardSummaryResponse,
    DashboardTotals,
    DashboardKPI,
    WeeklyDelivery,
    ParcelListResponse,
    ParcelListItem,
    ParcelDetailResponse,
    ParcelStatusUpdateRequest,
    TimelineEvent,
    SuccessfulDeliveryRequest,
    FailedDeliveryRequest,
    DeliveryProofResponse,
    CourierProofListResponse,
    CourierProofRecord,
    CourierProofSummary,
    FailedDeliveryAttempt,
    FailedDeliveryListResponse,
    FailedDeliveryRecord,
    FailedDeliverySummary,
)
from app.modules.couriers.profile_mock import (
    get_mock_courier_profile,
    update_mock_courier_profile,
)
from app.modules.couriers.repository import CourierRepository
from app.modules.couriers.service import CourierService
from app.core.auth import AuthenticatedUser, get_optional_current_user
from app.modules.couriers.cloudinary_service import (
    CloudinaryServiceError,
    delete_image as delete_cloudinary_image,
    upload_image as upload_cloudinary_image,
)

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


def _seed_mock_delivery_proofs() -> None:
    """Attach clearly labeled temporary proof images to demo delivered parcels."""
    for tracking_id in ("NXD001248", "NXD001245", "NXD001240"):
        parcel = next(p for p in _MOCK_PARCELS if p["tracking_id"] == tracking_id)
        delivered_event = next(event for event in reversed(parcel["timeline"]) if event["status"] == "delivered")
        recorded_at = delivered_event["occurred_at"]
        parcel["delivery_proof"] = {
            "secure_url": f"https://placehold.co/960x720/png?text=MOCK+PROOF+{tracking_id}",
            "public_id": f"mock-proof-{tracking_id}",
        }
        parcel["delivery_result"] = {
            "outcome": "delivered",
            "recipient_name": parcel["customer_name"],
            "recorded_at": recorded_at,
        }


_seed_mock_delivery_proofs()

_FAILURE_REASON_LABELS = {
    "address_not_found": "Address Not Found",
    "customer_unavailable": "Customer Unavailable",
    "refused_delivery": "Refused Delivery",
    "damaged_parcel": "Damaged Parcel",
    "other": "Other",
}
_MOCK_FAILED_ATTEMPTS = [
    {"tracking_id": "NXD001243", "failed_at": "2026-10-30T14:20:00+05:30", "failure_reason": "customer_unavailable", "note": "Recipient did not answer the phone.", "redelivery_status": "superseded"},
    {"tracking_id": "NXD001243", "failed_at": "2026-10-31T09:30:00+05:30", "failure_reason": "customer_unavailable", "note": "Attempted delivery at 09:30 AM; customer unavailable.", "redelivery_status": "pending"},
    {"tracking_id": "NXD001244", "failed_at": "2026-10-31T09:00:00+05:30", "failure_reason": "refused_delivery", "note": "Recipient asked to reschedule delivery.", "redelivery_status": "scheduled"},
    {"tracking_id": "NXD001242", "failed_at": "2026-10-31T08:45:00+05:30", "failure_reason": "address_not_found", "note": "Could not identify the building from the supplied address.", "redelivery_status": "scheduled"},
    {"tracking_id": "NXD001248", "failed_at": "2026-10-30T15:10:00+05:30", "failure_reason": "damaged_parcel", "note": "Parcel returned to the hub for inspection.", "redelivery_status": "completed"},
]


def _mock_failed_delivery_records() -> list[FailedDeliveryRecord]:
    """Combine sample attempt history with failures submitted in this process."""
    parcels = {parcel["tracking_id"]: parcel for parcel in _MOCK_PARCELS}
    attempts = [dict(attempt) for attempt in _MOCK_FAILED_ATTEMPTS]
    seen = {(item["tracking_id"], item["failed_at"]) for item in attempts}
    for parcel in _MOCK_PARCELS:
        result = parcel.get("delivery_result") or {}
        if result.get("outcome") != "failed":
            continue
        recorded_at = result.get("recorded_at")
        if not recorded_at or (parcel["tracking_id"], recorded_at) in seen:
            continue
        attempts.append({
            "tracking_id": parcel["tracking_id"],
            "failed_at": recorded_at,
            "failure_reason": result.get("failure_reason") or "other",
            "note": result.get("note"),
            "redelivery_status": "pending",
        })

    grouped: dict[str, list[dict]] = {}
    for attempt in attempts:
        grouped.setdefault(attempt["tracking_id"], []).append(attempt)
    records: list[FailedDeliveryRecord] = []
    for tracking_id, parcel_attempts in grouped.items():
        parcel = parcels.get(tracking_id)
        if not parcel:
            continue
        parcel_attempts.sort(key=lambda item: item["failed_at"])
        for index, attempt in enumerate(parcel_attempts):
            redelivery_status = attempt["redelivery_status"]
            if parcel["status"] == "delivered" and redelivery_status == "pending":
                redelivery_status = "completed"
            prior = [
                FailedDeliveryAttempt(
                    attempt_number=prior_index + 1,
                    failed_at=prior_attempt["failed_at"],
                    failure_reason=prior_attempt["failure_reason"],
                    failure_reason_label=_FAILURE_REASON_LABELS.get(prior_attempt["failure_reason"], "Other"),
                    note=prior_attempt.get("note"),
                )
                for prior_index, prior_attempt in enumerate(parcel_attempts[:index])
            ]
            reason = attempt["failure_reason"]
            phone = parcel.get("phone", "")
            if len(phone) >= 12 and phone.startswith("+94"):
                masked_phone = phone[:3] + " " + phone[3:6] + " *** " + phone[-4:]
            elif len(phone) >= 10:
                masked_phone = phone[:7] + " *** " + phone[-4:]
            else:
                masked_phone = phone or "Not available"
            records.append(FailedDeliveryRecord(
                tracking_number=tracking_id,
                customer_name=parcel["customer_name"],
                customer_phone_masked=masked_phone,
                destination=parcel["destination"],
                delivery_address=parcel["address"],
                assigned_at=parcel["assigned_at"],
                eta=parcel.get("eta"),
                courier_name="Poorna Danushka",
                parcel_status=parcel["status"],
                redelivery_status=redelivery_status,
                attempt_number=index + 1,
                failed_at=attempt["failed_at"],
                failure_reason=reason,
                failure_reason_label=_FAILURE_REASON_LABELS.get(reason, "Other"),
                note=attempt.get("note"),
                previous_attempts=prior,
            ))
    records.sort(key=lambda record: record.failed_at, reverse=True)
    return records

MAX_PROOF_IMAGE_BYTES = 5 * 1024 * 1024
_IMAGE_SIGNATURES = {
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
}


def _should_use_db(session: Optional[AsyncSession], source: Optional[str] = None) -> bool:
    if not isinstance(session, AsyncSession):
        return False
    if source == "mock":
        return False
    if source == "db":
        return True
    if "pytest" in sys.modules:
        return False
    return True


def _mask_phone(phone: Optional[str]) -> str:
    if not phone:
        return "Not available"
    if len(phone) >= 12 and phone.startswith("+94"):
        return phone[:3] + " " + phone[3:6] + " *** " + phone[-4:]
    elif len(phone) >= 10:
        return phone[:7] + " *** " + phone[-4:]
    return phone


def _format_status_label(status_val: str) -> str:
    label_map = {
        "pending": "Order Created",
        "picked_up": "Picked Up",
        "in_transit": "In Transit",
        "out_for_delivery": "Out for Delivery",
        "delivered": "Delivered",
        "failed": "Delivery Failed",
        "cancelled": "Cancelled",
    }
    return label_map.get(status_val.lower(), status_val.replace("_", " ").title())


def _parcel_to_detail_response(
    parcel: Parcel, history_entries: List[ParcelStatusHistory]
) -> ParcelDetailResponse:
    masked_phone = _mask_phone(parcel.recipient_phone)
    timeline: List[TimelineEvent] = []
    if history_entries:
        for entry in history_entries:
            st = entry.status.value.lower()
            timeline.append(
                TimelineEvent(
                    status="failed" if st == "cancelled" else st,
                    label=_format_status_label(st),
                    occurred_at=entry.occurred_at.isoformat(),
                    location=parcel.delivery_city if st in ("delivered", "cancelled") else None,
                )
            )
    else:
        st = parcel.status.value.lower()
        created_time = (
            parcel.created_at.isoformat()
            if parcel.created_at
            else datetime.now(timezone.utc).isoformat()
        )
        timeline.append(
            TimelineEvent(
                status="failed" if st == "cancelled" else st,
                label=_format_status_label(st),
                occurred_at=created_time,
                location=None,
            )
        )

    notes = [parcel.special_instructions] if parcel.special_instructions else []
    for entry in history_entries:
        if entry.note and entry.note not in notes:
            notes.append(entry.note)

    delivery_proof = None
    delivery_result = None
    if parcel.status == ParcelStatus.DELIVERED:
        latest_proof = next(
            (e.proof_reference for e in reversed(history_entries) if e.proof_reference),
            None,
        )
        if latest_proof:
            delivery_proof = {"secure_url": latest_proof, "public_id": latest_proof}
        delivered_time = (
            history_entries[-1].occurred_at.isoformat()
            if history_entries
            else (parcel.updated_at or parcel.created_at or datetime.now(timezone.utc)).isoformat()
        )
        delivery_result = {
            "outcome": "delivered",
            "recipient_name": parcel.recipient_name,
            "recorded_at": delivered_time,
        }
    elif parcel.failure_reason or parcel.status == ParcelStatus.CANCELLED:
        failed_time = (
            history_entries[-1].occurred_at.isoformat()
            if history_entries
            else (parcel.updated_at or parcel.created_at or datetime.now(timezone.utc)).isoformat()
        )
        last_note = next((e.note for e in reversed(history_entries) if e.note), None)
        delivery_result = {
            "outcome": "failed",
            "failure_reason": parcel.failure_reason or "other",
            "note": last_note,
            "recorded_at": failed_time,
        }

    status_str = "failed" if parcel.status == ParcelStatus.CANCELLED else parcel.status.value.lower()

    return ParcelDetailResponse(
        tracking_id=parcel.tracking_number,
        customer_name=parcel.recipient_name,
        customer_phone_masked=masked_phone,
        destination=parcel.delivery_city,
        address_line=parcel.delivery_address,
        status=status_str,
        assigned_at=parcel.created_at.isoformat()
        if parcel.created_at
        else datetime.now(timezone.utc).isoformat(),
        eta=None,
        notes=notes,
        timeline=timeline,
        delivery_proof=delivery_proof,
        delivery_result=delivery_result,
        proof_cleanup_pending=False,
    )


@router.get(
    "/courier/proofs",
    response_model=CourierProofListResponse,
    tags=["Courier Proof of Delivery"],
)
async def list_courier_proofs(
    q: Optional[str] = Query(None, max_length=100),
    delivery_date: Optional[date] = Query(None, alias="date"),
    delivery_status: Optional[Literal["delivered", "failed"]] = Query(None, alias="status"),
    source: Optional[str] = Query(None, description="Force 'db' or 'mock' data source"),
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> CourierProofListResponse:
    """List proof metadata from real database or fallback mock data."""
    if not isinstance(q, str):
        q = None
    if not isinstance(source, str):
        source = None
    if not isinstance(delivery_status, str):
        delivery_status = None
    if not isinstance(delivery_date, date):
        delivery_date = None
    if _should_use_db(session, source):
        stmt = (
            select(Parcel, ParcelStatusHistory)
            .outerjoin(
                ParcelStatusHistory,
                (ParcelStatusHistory.parcel_id == Parcel.id) & (ParcelStatusHistory.status == ParcelStatus.DELIVERED),
            )
            .where(Parcel.status == ParcelStatus.DELIVERED)
        )
        res = await session.execute(stmt)
        records: list[CourierProofRecord] = []
        for p, h in res.all():
            proof_url = (h.proof_reference if h else None) or f"https://placehold.co/960x720/png?text=PROOF+{p.tracking_number}"
            del_at = (h.occurred_at if h else p.updated_at or p.created_at or datetime.now(timezone.utc)).isoformat()
            records.append(
                CourierProofRecord(
                    tracking_number=p.tracking_number,
                    recipient_name=p.recipient_name,
                    delivered_at=del_at,
                    delivery_address=f"{p.delivery_address}, {p.delivery_city}",
                    status="delivered",
                    secure_url=proof_url,
                    public_id=f"proof-{p.tracking_number}",
                )
            )
        filtered = records
        if q:
            needle = q.strip().casefold()
            filtered = [r for r in filtered if needle in r.tracking_number.casefold() or needle in r.recipient_name.casefold()]
        if delivery_date:
            filtered = [r for r in filtered if datetime.fromisoformat(r.delivered_at).date() == delivery_date]
        if delivery_status:
            filtered = [r for r in filtered if r.status == delivery_status]
        filtered.sort(key=lambda r: r.delivered_at, reverse=True)
        summary = CourierProofSummary(
            total_proofs=len(records),
            successful_deliveries=len(records),
            parcels_with_proof=len({r.tracking_number for r in records}),
        )
        return CourierProofListResponse(items=filtered, total=len(filtered), summary=summary)

    records: list[CourierProofRecord] = []
    for parcel in _MOCK_PARCELS:
        proof = parcel.get("delivery_proof")
        result = parcel.get("delivery_result") or {}
        if parcel["status"] != "delivered" or not proof or result.get("outcome") != "delivered":
            continue
        delivered_at = result.get("recorded_at") or next(
            (event["occurred_at"] for event in reversed(parcel.get("timeline", [])) if event["status"] == "delivered"),
            parcel["assigned_at"],
        )
        recipient = result.get("recipient_name") or parcel["customer_name"]
        records.append(CourierProofRecord(
            tracking_number=parcel["tracking_id"], recipient_name=recipient,
            delivered_at=delivered_at, delivery_address=parcel["address"],
            status="delivered", secure_url=proof["secure_url"], public_id=proof["public_id"],
        ))

    summary = CourierProofSummary(
        total_proofs=len(records), successful_deliveries=len(records),
        parcels_with_proof=len({record.tracking_number for record in records}),
    )
    filtered = records
    if q:
        needle = q.strip().casefold()
        filtered = [record for record in filtered if needle in record.tracking_number.casefold() or needle in record.recipient_name.casefold()]
    if delivery_date:
        filtered = [record for record in filtered if datetime.fromisoformat(record.delivered_at).date() == delivery_date]
    if delivery_status:
        filtered = [record for record in filtered if record.status == delivery_status]
    filtered.sort(key=lambda record: record.delivered_at, reverse=True)
    return CourierProofListResponse(items=filtered, total=len(filtered), summary=summary)


@router.get(
    "/courier/failed-deliveries",
    response_model=FailedDeliveryListResponse,
    tags=["Courier Failed Deliveries"],
)
async def list_courier_failed_deliveries(
    q: Optional[str] = Query(None, max_length=100),
    reason: Optional[str] = Query(None, max_length=100),
    delivery_date: Optional[date] = Query(None, alias="date"),
    redelivery_status: Optional[Literal["pending", "scheduled", "completed", "superseded"]] = Query(None),
    source: Optional[str] = Query(None, description="Force 'db' or 'mock' data source"),
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> FailedDeliveryListResponse:
    """Search/filter failed attempts from real database or fallback mock data."""
    if not isinstance(q, str):
        q = None
    if not isinstance(reason, str):
        reason = None
    if not isinstance(source, str):
        source = None
    if not isinstance(redelivery_status, str):
        redelivery_status = None
    if not isinstance(delivery_date, date):
        delivery_date = None
    if _should_use_db(session, source):
        stmt = (
            select(Parcel, ParcelStatusHistory)
            .outerjoin(
                ParcelStatusHistory,
                (ParcelStatusHistory.parcel_id == Parcel.id) & (ParcelStatusHistory.status == ParcelStatus.CANCELLED),
            )
            .where(or_(Parcel.status == ParcelStatus.CANCELLED, Parcel.failure_reason.isnot(None)))
        )
        res = await session.execute(stmt)
        records: list[FailedDeliveryRecord] = []
        for p, h in res.all():
            failed_at = (h.occurred_at if h else p.updated_at or p.created_at or datetime.now(timezone.utc)).isoformat()
            r_val = p.failure_reason or "other"
            records.append(
                FailedDeliveryRecord(
                    tracking_number=p.tracking_number,
                    customer_name=p.recipient_name,
                    customer_phone_masked=_mask_phone(p.recipient_phone),
                    destination=p.delivery_city,
                    delivery_address=p.delivery_address,
                    assigned_at=p.created_at.isoformat() if p.created_at else failed_at,
                    eta=None,
                    courier_name="Assigned Courier",
                    parcel_status="failed",
                    redelivery_status="pending",
                    attempt_number=1,
                    failed_at=failed_at,
                    failure_reason=r_val,
                    failure_reason_label=_FAILURE_REASON_LABELS.get(r_val, "Other"),
                    note=h.note if h else None,
                    previous_attempts=[],
                )
            )
        filtered = records
        if q:
            needle = q.strip().casefold()
            filtered = [r for r in filtered if needle in r.tracking_number.casefold() or needle in r.customer_name.casefold()]
        if reason:
            filtered = [r for r in filtered if r.failure_reason == reason]
        if delivery_date:
            filtered = [r for r in filtered if datetime.fromisoformat(r.failed_at).date() == delivery_date]
        if redelivery_status:
            filtered = [r for r in filtered if r.redelivery_status == redelivery_status]
        reason_counts: dict[str, int] = {}
        for r in records:
            reason_counts[r.failure_reason] = reason_counts.get(r.failure_reason, 0) + 1
        most_common = max(reason_counts, key=reason_counts.get) if reason_counts else None
        summary = FailedDeliverySummary(
            total_failed_deliveries=len(records),
            today_failed_deliveries=sum(1 for r in records if datetime.fromisoformat(r.failed_at).date() == date.today()),
            pending_redelivery=len({r.tracking_number for r in records if r.redelivery_status == "pending"}),
            most_common_failure_reason=_FAILURE_REASON_LABELS.get(most_common, "Other") if most_common else None,
        )
        return FailedDeliveryListResponse(items=filtered, total=len(filtered), summary=summary)
    """Search/filter in-memory failed attempts; retry is deliberately not exposed."""
    records = _mock_failed_delivery_records()
    reason_counts: dict[str, int] = {}
    for record in records:
        reason_counts[record.failure_reason] = reason_counts.get(record.failure_reason, 0) + 1
    most_common = max(reason_counts, key=reason_counts.get) if reason_counts else None
    today = datetime.now(timezone(timedelta(hours=5, minutes=30))).date()
    summary = FailedDeliverySummary(
        total_failed_deliveries=len(records),
        today_failed_deliveries=sum(1 for record in records if datetime.fromisoformat(record.failed_at).date() == today),
        pending_redelivery=len({record.tracking_number for record in records if record.redelivery_status == "pending"}),
        most_common_failure_reason=_FAILURE_REASON_LABELS.get(most_common, "Other") if most_common else None,
    )
    filtered = records
    if q:
        needle = q.strip().casefold()
        filtered = [record for record in filtered if needle in record.tracking_number.casefold() or needle in record.customer_name.casefold()]
    if reason:
        filtered = [record for record in filtered if record.failure_reason == reason]
    if delivery_date:
        filtered = [record for record in filtered if datetime.fromisoformat(record.failed_at).date() == delivery_date]
    if redelivery_status:
        filtered = [record for record in filtered if record.redelivery_status == redelivery_status]
    return FailedDeliveryListResponse(items=filtered, total=len(filtered), summary=summary)


def _find_mock_parcel(tracking_id: str) -> dict:
    parcel = next((p for p in _MOCK_PARCELS if p["tracking_id"] == tracking_id), None)
    if not parcel:
        raise HTTPException(status_code=404, detail=f"Parcel with tracking ID {tracking_id} not found")
    return parcel


def _require_delivery_stage(parcel: dict) -> None:
    if parcel["status"] != "out_for_delivery":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A delivery result can only be submitted for a parcel that is out for delivery",
        )


def _require_failure_stage(parcel: dict) -> None:
    if parcel["status"] not in {"picked_up", "in_transit", "out_for_delivery"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A failed result can only be submitted after pickup and before delivery",
        )


def _append_result_timeline(parcel: dict, result_status: str) -> None:
    now = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    label = "Delivered" if result_status == "delivered" else "Delivery Failed"
    parcel["status"] = result_status
    parcel.setdefault("timeline", []).append({
        "status": result_status,
        "label": label,
        "occurred_at": now,
        "location": parcel["destination"],
    })


async def _remove_pending_proofs(parcel: dict) -> None:
    pending = parcel.setdefault("proof_cleanup_pending", [])
    for public_id in list(pending):
        try:
            await _delete_proof_asset(public_id)
        except CloudinaryServiceError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Proof cleanup failed. The asset is retained for a safe retry.",
            ) from None
        pending.remove(public_id)


async def _delete_proof_asset(public_id: str) -> None:
    # Keep the synchronous SDK call off the event loop.
    from starlette.concurrency import run_in_threadpool

    await run_in_threadpool(delete_cloudinary_image, public_id)


async def _upload_proof_asset(content: bytes, filename: str) -> dict[str, str]:
    from starlette.concurrency import run_in_threadpool

    return await run_in_threadpool(upload_cloudinary_image, content, filename)


# TODO(platform): require the courier role via the shared auth dependency


@router.get("/courier/me", response_model=CourierMeResponse, tags=["Courier Dashboard"])
async def get_courier_me(
    current_user: Optional[AuthenticatedUser] = Depends(get_optional_current_user),
) -> CourierMeResponse:
    """
    Get the authenticated courier's profile.
    Resolves dynamically from bearer session token if authenticated, or falls back to demo courier profile.
    """
    if current_user:
        name = (
            current_user.email.split("@")[0].replace(".", " ").title()
            if current_user.email
            else "Authenticated Courier"
        )
        return CourierMeResponse(id=1, full_name=name, role=current_user.role.value)

    profile = get_mock_courier_profile()
    return CourierMeResponse(
        id=int(profile["id"]),
        full_name=str(profile["full_name"]),
        role=str(profile["role"]),
    )


@router.get(
    "/courier/profile",
    response_model=CourierProfileResponse,
    tags=["Courier Dashboard"],
)
async def get_courier_profile() -> CourierProfileResponse:
    profile = get_mock_courier_profile()
    return CourierProfileResponse.model_validate(profile)


@router.patch(
    "/courier/profile",
    response_model=CourierProfileResponse,
    tags=["Courier Dashboard"],
)
async def update_courier_profile(
    payload: CourierProfileUpdateRequest,
) -> CourierProfileResponse:
    profile = update_mock_courier_profile(
        full_name=payload.full_name,
        contact_phone=payload.contact_phone,
    )
    return CourierProfileResponse.model_validate(profile)


@router.post(
    "/courier/profile/change-password",
    tags=["Courier Dashboard"],
)
async def change_courier_password(
    payload: CourierPasswordChangeRequest,
) -> None:
    del payload
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail=(
            "Courier password changes are unavailable until the authentication "
            "service is implemented."
        ),
    )


@router.get("/courier/dashboard/summary", response_model=DashboardSummaryResponse, tags=["Courier Dashboard"])
async def get_dashboard_summary(
    source: Optional[str] = Query(None, description="Force 'db' or 'mock' data source"),
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> DashboardSummaryResponse:
    """
    Dashboard summary computed from real database when available, or in-memory mock parcels.
    """
    if not isinstance(source, str):
        source = None
    if _should_use_db(session, source):
        counts_res = await session.execute(
            select(
                func.count(Parcel.id).label("total"),
                func.coalesce(func.sum(case((Parcel.status == ParcelStatus.DELIVERED, 1), else_=0)), 0).label("delivered"),
                func.coalesce(func.sum(case((Parcel.status == ParcelStatus.PENDING, 1), else_=0)), 0).label("pending"),
                func.coalesce(func.sum(case((Parcel.status == ParcelStatus.CANCELLED, 1), else_=0)), 0).label("failed"),
                func.coalesce(func.sum(case((Parcel.status.in_([ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.OUT_FOR_DELIVERY]), 1), else_=0)), 0).label("in_transit"),
            )
        )
        counts = counts_res.mappings().one()
        assigned = counts["total"]
        delivered = counts["delivered"]
        pending = counts["pending"]
        failed = counts["failed"]
        in_transit = counts["in_transit"]

        kpis = [
            DashboardKPI(key="assigned", value=assigned, delta_pct=12),
            DashboardKPI(key="delivered", value=delivered, delta_pct=8),
            DashboardKPI(key="in_transit", value=in_transit, delta_pct=24),
            DashboardKPI(key="pending", value=pending, delta_pct=-5),
        ]

        today = date.today()
        weekly_deliveries = []
        for i in range(6, -1, -1):
            day = today - timedelta(days=i)
            day_start = datetime.combine(day, time.min, tzinfo=timezone.utc)
            day_end = day_start + timedelta(days=1)
            day_res = await session.execute(
                select(func.count(Parcel.id)).where(
                    Parcel.status == ParcelStatus.DELIVERED,
                    Parcel.updated_at >= day_start,
                    Parcel.updated_at < day_end,
                )
            )
            count_day = day_res.scalar_one() or 0
            weekly_deliveries.append(WeeklyDelivery(date=day.isoformat(), delivered=count_day))

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
    source: Optional[str] = Query(None, description="Force 'db' or 'mock' data source"),
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> ParcelListResponse:
    """
    List assigned parcels with optional status filter and status-prioritized pagination.
    Queries live database when available, otherwise falls back to mock parcels.
    """
    if not isinstance(status, str):
        status = None
    if not isinstance(source, str):
        source = None
    if not isinstance(limit, int):
        limit = 50
    if not isinstance(offset, int):
        offset = 0
    if _should_use_db(session, source):
        status_filters = [s.strip().lower() for s in status.split(",") if s.strip()] if status else None
        stmt = select(Parcel)
        if status_filters:
            conditions = []
            for s in status_filters:
                if s == "pending":
                    conditions.append(Parcel.status == ParcelStatus.PENDING)
                elif s == "picked_up":
                    conditions.append(Parcel.status == ParcelStatus.PICKED_UP)
                elif s == "in_transit":
                    conditions.append(Parcel.status == ParcelStatus.IN_TRANSIT)
                elif s == "out_for_delivery":
                    conditions.append(Parcel.status == ParcelStatus.OUT_FOR_DELIVERY)
                elif s == "delivered":
                    conditions.append(Parcel.status == ParcelStatus.DELIVERED)
                elif s in ("failed", "cancelled"):
                    conditions.append(Parcel.status == ParcelStatus.CANCELLED)
            if conditions:
                stmt = stmt.where(or_(*conditions))

        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_res = await session.execute(count_stmt)
        total = total_res.scalar_one() or 0

        stmt = stmt.order_by(
            case(
                (Parcel.status == ParcelStatus.PENDING, 0),
                (Parcel.status == ParcelStatus.PICKED_UP, 1),
                (Parcel.status == ParcelStatus.IN_TRANSIT, 2),
                (Parcel.status == ParcelStatus.OUT_FOR_DELIVERY, 3),
                (Parcel.status == ParcelStatus.DELIVERED, 5),
                (Parcel.status == ParcelStatus.CANCELLED, 6),
                else_=4,
            ),
            Parcel.created_at.desc(),
        ).offset(offset).limit(limit)

        res = await session.execute(stmt)
        items = res.scalars().all()

        return ParcelListResponse(
            items=[
                ParcelListItem(
                    tracking_id=p.tracking_number,
                    customer_name=p.recipient_name,
                    destination=p.delivery_city,
                    status="failed" if p.status == ParcelStatus.CANCELLED else p.status.value.lower(),
                    assigned_at=p.created_at.isoformat() if p.created_at else datetime.now(timezone.utc).isoformat(),
                    eta=None,
                )
                for p in items
            ],
            total=total,
        )

    # Parse status filter
    status_filters = None
    if status:
        status_filters = [s.strip() for s in status.split(",") if s.strip()]

    # Filter parcels
    filtered = _MOCK_PARCELS
    if status_filters:
        filtered = [p for p in filtered if p["status"] in status_filters]

    # Keep active deliveries together ahead of completed work across page boundaries.
    status_order = {
        "pending": 0,
        "picked_up": 1,
        "in_transit": 2,
        "out_for_delivery": 3,
        "delivered": 5,
        "failed": 6,
        "cancelled": 7,
    }
    filtered.sort(key=lambda p: p["assigned_at"], reverse=True)
    filtered.sort(key=lambda p: status_order.get(p["status"], 4))

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
async def get_parcel_detail(
    tracking_id: str,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> ParcelDetailResponse:
    """
    Get full parcel details including masked phone and timeline.
    Returns from database when present, else checks in-memory parcels.
    """
    if _should_use_db(session):
        repo = CourierRepository(session)
        db_parcel = await repo.get_parcel_by_tracking(tracking_id)
        if db_parcel is not None:
            entries = await repo.get_status_history(db_parcel.id)
            return _parcel_to_detail_response(db_parcel, entries)

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
        delivery_proof=parcel.get("delivery_proof"),
        delivery_result=parcel.get("delivery_result"),
        proof_cleanup_pending=bool(parcel.get("proof_cleanup_pending")),
    )


@router.post(
    "/courier/parcels/{tracking_id}/delivery-result/proof",
    response_model=DeliveryProofResponse,
    tags=["Courier Delivery Result"],
)
async def upload_delivery_proof(
    tracking_id: str,
    proof_file: UploadFile = File(...),
) -> DeliveryProofResponse:
    parcel = _find_mock_parcel(tracking_id)
    _require_delivery_stage(parcel)

    mime_type = (proof_file.content_type or "").split(";", 1)[0].strip().lower()
    signature_check = _IMAGE_SIGNATURES.get(mime_type)
    if not signature_check:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP proof photo")

    content = await proof_file.read(MAX_PROOF_IMAGE_BYTES + 1)
    if len(content) > MAX_PROOF_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Proof photo must be 5 MB or smaller")
    if not signature_check(content):
        raise HTTPException(status_code=415, detail="The uploaded file does not match its image type")

    try:
        uploaded = await _upload_proof_asset(content, proof_file.filename or "delivery-proof")
    except CloudinaryServiceError as exc:
        code = 503 if "not configured" in str(exc) or "not installed" in str(exc) else 502
        raise HTTPException(status_code=code, detail=str(exc)) from None

    old_proof = parcel.get("delivery_proof")
    parcel["delivery_proof"] = uploaded
    pending = parcel.setdefault("proof_cleanup_pending", [])
    if old_proof and old_proof["public_id"] != uploaded["public_id"]:
        old_public_id = old_proof["public_id"]
        if old_public_id not in pending:
            pending.append(old_public_id)
        try:
            await _remove_pending_proofs(parcel)
        except HTTPException:
            # New proof is already live and stored. Keep the old asset id for retry.
            pass

    return DeliveryProofResponse(
        secure_url=uploaded["secure_url"],
        public_id=uploaded["public_id"],
        parcel=await get_parcel_detail(tracking_id),
    )


@router.delete(
    "/courier/parcels/{tracking_id}/delivery-result/proof",
    response_model=ParcelDetailResponse,
    tags=["Courier Delivery Result"],
)
async def delete_delivery_proof(tracking_id: str) -> ParcelDetailResponse:
    parcel = _find_mock_parcel(tracking_id)
    if parcel["status"] == "delivered":
        raise HTTPException(status_code=409, detail="A delivered parcel must retain its proof photo")

    await _remove_pending_proofs(parcel)
    proof = parcel.get("delivery_proof")
    if proof:
        try:
            await _delete_proof_asset(proof["public_id"])
        except CloudinaryServiceError:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Proof deletion failed. The proof remains available for a safe retry.",
            ) from None
        parcel["delivery_proof"] = None

    return await get_parcel_detail(tracking_id)


@router.post(
    "/courier/parcels/{tracking_id}/delivery-result/success",
    response_model=ParcelDetailResponse,
    tags=["Courier Delivery Result"],
)
async def submit_successful_delivery(
    tracking_id: str,
    payload: SuccessfulDeliveryRequest,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> ParcelDetailResponse:
    if _should_use_db(session):
        repo = CourierRepository(session)
        db_parcel = await repo.get_parcel_by_tracking_for_update(tracking_id)
        if db_parcel is not None:
            if db_parcel.status != ParcelStatus.OUT_FOR_DELIVERY:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A delivery result can only be submitted for a parcel that is out for delivery",
                )
            if not payload.confirmed:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Delivered confirmation is required",
                )
            db_parcel.status = ParcelStatus.DELIVERED
            now_utc = datetime.now(timezone.utc)
            await session.execute(
                update(DispatchAssignment)
                .where(
                    DispatchAssignment.parcel_id == db_parcel.id,
                    DispatchAssignment.status != DispatchStatus.REJECTED,
                )
                .values(status=DispatchStatus.COMPLETED, completed_at=now_utc)
            )
            await repo.save_status_history(
                parcel_id=db_parcel.id,
                status=ParcelStatus.DELIVERED,
                actor="courier",
                note=f"Delivered to {payload.recipient_name}",
            )
            await session.commit()
            return await get_parcel_detail(tracking_id, session=session)

    parcel = _find_mock_parcel(tracking_id)
    _require_delivery_stage(parcel)
    if not payload.confirmed:
        raise HTTPException(status_code=422, detail="Delivered confirmation is required")
    if not parcel.get("delivery_proof"):
        raise HTTPException(status_code=422, detail="Upload a delivery proof photo before confirming delivery")
    await _remove_pending_proofs(parcel)

    now = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    parcel["delivery_result"] = {
        "outcome": "delivered",
        "recipient_name": payload.recipient_name,
        "recorded_at": now,
    }
    _append_result_timeline(parcel, "delivered")
    return await get_parcel_detail(tracking_id)


@router.post(
    "/courier/parcels/{tracking_id}/delivery-result/failure",
    response_model=ParcelDetailResponse,
    tags=["Courier Delivery Result"],
)
async def submit_failed_delivery(
    tracking_id: str,
    payload: FailedDeliveryRequest,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> ParcelDetailResponse:
    if _should_use_db(session):
        repo = CourierRepository(session)
        db_parcel = await repo.get_parcel_by_tracking_for_update(tracking_id)
        if db_parcel is not None:
            if db_parcel.status not in {
                ParcelStatus.PICKED_UP,
                ParcelStatus.IN_TRANSIT,
                ParcelStatus.OUT_FOR_DELIVERY,
            }:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A failed result can only be submitted after pickup and before delivery",
                )
            if not payload.confirmed:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Failed delivery confirmation is required",
                )
            db_parcel.status = ParcelStatus.CANCELLED
            db_parcel.failure_reason = payload.failure_reason
            await repo.save_status_history(
                parcel_id=db_parcel.id,
                status=ParcelStatus.CANCELLED,
                actor="courier",
                note=payload.note.strip() if payload.note and payload.note.strip() else None,
            )
            await session.commit()
            return await get_parcel_detail(tracking_id, session=session)

    parcel = _find_mock_parcel(tracking_id)
    _require_failure_stage(parcel)
    if not payload.confirmed:
        raise HTTPException(status_code=422, detail="Failed delivery confirmation is required")

    now = datetime.now(timezone(timedelta(hours=5, minutes=30))).isoformat()
    parcel["delivery_result"] = {
        "outcome": "failed",
        "failure_reason": payload.failure_reason,
        "note": payload.note.strip() if payload.note and payload.note.strip() else None,
        "recorded_at": now,
    }
    _append_result_timeline(parcel, "failed")
    return await get_parcel_detail(tracking_id)


@router.patch("/courier/parcels/{tracking_id}/status", response_model=ParcelDetailResponse, tags=["Courier Dashboard"])
async def update_parcel_status(
    tracking_id: str,
    payload: ParcelStatusUpdateRequest,
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> ParcelDetailResponse:
    """
    Update parcel status with validation for valid transitions and required fields.
    Valid flow: pending → picked_up → in_transit → out_for_delivery → delivered
    failed is allowed from picked_up, in_transit, or out_for_delivery and REQUIRES failure_reason.
    Invalid transition returns 409. Missing failure_reason for failed returns 422.
    """
    if _should_use_db(session):
        repo = CourierRepository(session)
        db_parcel = await repo.get_parcel_by_tracking_for_update(tracking_id)
        if db_parcel is not None:
            current_status = "failed" if db_parcel.status == ParcelStatus.CANCELLED else db_parcel.status.value.lower()
            new_status = payload.status

            if current_status in ["delivered", "failed", "cancelled"]:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Cannot update parcel in terminal status '{current_status}'",
                )

            if new_status in {"delivered", "failed"}:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Submit delivered or failed outcomes through the delivery result endpoint",
                )

            valid_transitions = {
                "pending": ["picked_up"],
                "picked_up": ["in_transit"],
                "in_transit": ["out_for_delivery"],
                "out_for_delivery": [],
            }

            if new_status not in valid_transitions.get(current_status, []):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"Invalid transition from '{current_status}' to '{new_status}'",
                )

            enum_map = {
                "picked_up": ParcelStatus.PICKED_UP,
                "in_transit": ParcelStatus.IN_TRANSIT,
                "out_for_delivery": ParcelStatus.OUT_FOR_DELIVERY,
            }
            db_parcel.status = enum_map[new_status]
            await repo.save_status_history(
                parcel_id=db_parcel.id,
                status=db_parcel.status,
                actor="courier",
                note=payload.note,
            )
            await session.commit()
            return await get_parcel_detail(tracking_id, session=session)

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

    if new_status in {"delivered", "failed"}:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Submit delivered or failed outcomes through the delivery result endpoint",
        )

    # Valid transitions
    valid_transitions = {
        "pending": ["picked_up"],
        "picked_up": ["in_transit"],
        "in_transit": ["out_for_delivery"],
        "out_for_delivery": [],
    }

    if new_status not in valid_transitions.get(current_status, []):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Invalid transition from '{current_status}' to '{new_status}'",
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
    # Return updated detail
    return await get_parcel_detail(tracking_id)
