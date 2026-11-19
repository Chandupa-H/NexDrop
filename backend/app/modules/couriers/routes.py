from typing import List, Optional, Literal
from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo
import httpx
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy import case, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.core.config import settings
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
from app.modules.couriers.models import Courier
from app.modules.couriers.repository import CourierRepository
from app.modules.users.models import User
from app.modules.auth.dependencies import get_authenticated_courier
from app.modules.couriers.service import CourierService
from app.modules.couriers.cloudinary_service import (
    CloudinaryServiceError,
    delete_image as delete_cloudinary_image,
    upload_image as upload_cloudinary_image,
)

router = APIRouter(prefix="/couriers", tags=["Couriers"])

_FAILURE_REASON_LABELS = {
    "address_not_found": "Address Not Found",
    "customer_unavailable": "Customer Unavailable",
    "refused_delivery": "Refused Delivery",
    "damaged_parcel": "Damaged Parcel",
    "other": "Other",
}


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



MAX_PROOF_IMAGE_BYTES = 5 * 1024 * 1024
_IMAGE_SIGNATURES = {
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda data: len(data) >= 12 and data[:4] == b"RIFF" and data[8:12] == b"WEBP",
}


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


async def _parcel_to_detail_response(
    parcel: Parcel,
    history_entries: List[ParcelStatusHistory],
    courier_id: int,
    session: AsyncSession,
) -> ParcelDetailResponse:
    assigned_at = await session.scalar(
        select(DispatchAssignment.assigned_at)
        .where(
            DispatchAssignment.parcel_id == parcel.id,
            DispatchAssignment.courier_id == courier_id,
            DispatchAssignment.status != DispatchStatus.REJECTED,
        )
        .order_by(DispatchAssignment.assigned_at.desc())
        .limit(1)
    )
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
    notes = [parcel.special_instructions] if parcel.special_instructions else []
    for entry in history_entries:
        if entry.note and entry.note not in notes:
            notes.append(entry.note)

    delivery_proof = None
    delivery_result = None
    if parcel.status == ParcelStatus.DELIVERED:
        latest_proof = next(
            (
                e
                for e in reversed(history_entries)
                if e.proof_reference and e.proof_public_id
            ),
            None,
        )
        if latest_proof:
            delivery_proof = {
                "secure_url": latest_proof.proof_reference,
                "public_id": latest_proof.proof_public_id,
            }
        delivered_time = (
            history_entries[-1].occurred_at.isoformat()
            if history_entries
            else (parcel.updated_at or parcel.created_at).isoformat()
        )
        delivery_result = {
            "outcome": "delivered",
            "recipient_name": parcel.delivery_recipient_name or parcel.recipient_name,
            "recorded_at": delivered_time,
        }
    elif parcel.failure_reason or parcel.status == ParcelStatus.CANCELLED:
        failed_time = (
            history_entries[-1].occurred_at.isoformat()
            if history_entries
            else (parcel.updated_at or parcel.created_at).isoformat()
        )
        last_note = next((e.note for e in reversed(history_entries) if e.note), None)
        delivery_result = {
            "outcome": "failed",
            "failure_reason": parcel.failure_reason,
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
        assigned_at=assigned_at.isoformat() if assigned_at else None,
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
    delivery_status: Optional[Literal["delivered"]] = Query(None, alias="status"),
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> CourierProofListResponse:
    """List proof-of-delivery records scoped to the authenticated courier."""
    if not isinstance(q, str):
        q = None
    if not isinstance(delivery_status, str):
        delivery_status = None
    if not isinstance(delivery_date, date):
        delivery_date = None

    assigned_parcel_ids = select(DispatchAssignment.parcel_id).where(
        DispatchAssignment.courier_id == courier.id,
        DispatchAssignment.status != DispatchStatus.REJECTED,
    )
    latest_proof_ids = (
        select(
            ParcelStatusHistory.parcel_id,
            func.max(ParcelStatusHistory.id).label("history_id"),
        )
        .where(
            ParcelStatusHistory.proof_reference.is_not(None),
            ParcelStatusHistory.proof_public_id.is_not(None),
        )
        .group_by(ParcelStatusHistory.parcel_id)
        .subquery()
    )
    stmt = (
        select(Parcel, ParcelStatusHistory)
        .join(latest_proof_ids, latest_proof_ids.c.parcel_id == Parcel.id)
        .join(
            ParcelStatusHistory,
            ParcelStatusHistory.id == latest_proof_ids.c.history_id,
        )
        .where(
            Parcel.status == ParcelStatus.DELIVERED,
            Parcel.id.in_(assigned_parcel_ids),
        )
    )
    res = await session.execute(stmt)
    records: list[CourierProofRecord] = []
    for p, h in res.all():
        records.append(
            CourierProofRecord(
                tracking_number=p.tracking_number,
                recipient_name=p.delivery_recipient_name or p.recipient_name,
                delivered_at=h.occurred_at.isoformat(),
                delivery_address=f"{p.delivery_address}, {p.delivery_city}",
                status="delivered",
                secure_url=h.proof_reference,
                public_id=h.proof_public_id,
            )
        )
    filtered = records
    if q:
        needle = q.strip().casefold()
        filtered = [r for r in filtered if needle in r.tracking_number.casefold() or needle in r.recipient_name.casefold()]
    if delivery_date:
        filtered = [
            record
            for record in filtered
            if datetime.fromisoformat(record.delivered_at)
            .astimezone(ZoneInfo("Asia/Colombo"))
            .date()
            == delivery_date
        ]
    if delivery_status:
        filtered = [r for r in filtered if r.status == delivery_status]
    filtered.sort(key=lambda r: r.delivered_at, reverse=True)
    successful_deliveries = await session.scalar(
        select(func.count(Parcel.id)).where(
            Parcel.status == ParcelStatus.DELIVERED,
            Parcel.id.in_(assigned_parcel_ids),
        )
    ) or 0
    summary = CourierProofSummary(
        total_proofs=len(records),
        successful_deliveries=successful_deliveries,
        parcels_with_proof=len({r.tracking_number for r in records}),
    )
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
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> FailedDeliveryListResponse:
    """Return failed delivery records scoped to the authenticated courier."""
    if not isinstance(q, str):
        q = None
    if not isinstance(reason, str):
        reason = None
    if not isinstance(delivery_date, date):
        delivery_date = None

    assigned_parcel_ids = select(DispatchAssignment.parcel_id).where(
        DispatchAssignment.courier_id == courier.id,
        DispatchAssignment.status != DispatchStatus.REJECTED,
    )
    parcels_result = await session.execute(
        select(Parcel)
        .where(
            or_(Parcel.status == ParcelStatus.CANCELLED, Parcel.failure_reason.isnot(None)),
            Parcel.id.in_(assigned_parcel_ids),
        )
        .order_by(Parcel.updated_at.desc(), Parcel.id.desc())
    )
    parcels = parcels_result.scalars().all()
    parcel_ids = [parcel.id for parcel in parcels]
    if not parcel_ids:
        return FailedDeliveryListResponse(
            items=[],
            total=0,
            summary=FailedDeliverySummary(
                total_failed_deliveries=0,
                today_failed_deliveries=0,
                pending_redelivery=None,
                most_common_failure_reason=None,
            ),
        )

    assignment_result = await session.execute(
        select(DispatchAssignment.parcel_id, DispatchAssignment.assigned_at)
        .where(
            DispatchAssignment.courier_id == courier.id,
            DispatchAssignment.parcel_id.in_(parcel_ids),
            DispatchAssignment.status != DispatchStatus.REJECTED,
        )
        .order_by(DispatchAssignment.assigned_at)
    )
    assigned_at_by_parcel = {
        parcel_id: assigned_at
        for parcel_id, assigned_at in assignment_result.all()
    }

    history_result = await session.execute(
        select(ParcelStatusHistory)
        .where(
            ParcelStatusHistory.parcel_id.in_(parcel_ids),
            ParcelStatusHistory.status == ParcelStatus.CANCELLED,
        )
        .order_by(
            ParcelStatusHistory.occurred_at,
            ParcelStatusHistory.id,
        )
    )
    histories_by_parcel: dict[int, list[ParcelStatusHistory]] = {}
    for history in history_result.scalars().all():
        histories_by_parcel.setdefault(history.parcel_id, []).append(history)

    user = await session.get(User, courier.user_id)
    colombo_tz = ZoneInfo("Asia/Colombo")

    def to_colombo_datetime(value: str) -> datetime:
        parsed = datetime.fromisoformat(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(colombo_tz)

    records: list[FailedDeliveryRecord] = []
    for parcel in parcels:
        histories = histories_by_parcel.get(parcel.id, [])
        latest_history = histories[-1] if histories else None
        failed_at_value = (
            latest_history.occurred_at
            if latest_history
            else parcel.updated_at or parcel.created_at
        )
        failed_at = failed_at_value.isoformat() if failed_at_value else ""
        failure_reason = parcel.failure_reason
        failure_reason_label = (
            _FAILURE_REASON_LABELS.get(failure_reason, "Not recorded")
            if failure_reason
            else "Not recorded"
        )
        previous_attempts = [
            FailedDeliveryAttempt(
                attempt_number=index,
                failed_at=history.occurred_at.isoformat(),
                failure_reason=None,
                failure_reason_label="Not recorded",
                note=history.note,
            )
            for index, history in enumerate(histories[:-1], start=1)
        ]
        records.append(
            FailedDeliveryRecord(
                tracking_number=parcel.tracking_number,
                customer_name=parcel.recipient_name,
                customer_phone_masked=_mask_phone(parcel.recipient_phone),
                destination=parcel.delivery_city,
                delivery_address=parcel.delivery_address,
                assigned_at=(
                    assigned_at_by_parcel[parcel.id].isoformat()
                ),
                eta=None,
                courier_name=user.full_name if user else None,
                parcel_status=parcel.status.value,
                redelivery_status=None,
                attempt_number=max(len(histories), 1),
                failed_at=failed_at,
                failure_reason=failure_reason,
                failure_reason_label=failure_reason_label,
                note=latest_history.note if latest_history else None,
                previous_attempts=previous_attempts,
            )
        )
    filtered = records
    if q:
        needle = q.strip().casefold()
        filtered = [r for r in filtered if needle in r.tracking_number.casefold() or needle in r.customer_name.casefold()]
    if reason:
        filtered = [r for r in filtered if r.failure_reason == reason]
    if delivery_date:
        filtered = [
            record
            for record in filtered
            if to_colombo_datetime(record.failed_at).date() == delivery_date
        ]
    reason_counts: dict[str, int] = {}
    for r in records:
        if r.failure_reason:
            reason_counts[r.failure_reason] = reason_counts.get(r.failure_reason, 0) + 1
    most_common = max(reason_counts, key=reason_counts.get) if reason_counts else None
    today_colombo = datetime.now(colombo_tz).date()

    def failed_today(value: str) -> bool:
        return to_colombo_datetime(value).date() == today_colombo

    summary = FailedDeliverySummary(
        total_failed_deliveries=len(records),
        today_failed_deliveries=sum(
            1
            for record in records
            if record.failed_at
            and failed_today(record.failed_at)
        ),
        pending_redelivery=None,
        most_common_failure_reason=(
            _FAILURE_REASON_LABELS.get(most_common, "Not recorded")
            if most_common
            else None
        ),
    )
    return FailedDeliveryListResponse(items=filtered, total=len(filtered), summary=summary)


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
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> CourierMeResponse:
    user = await session.get(User, courier.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier user profile was not found.",
        )
    return CourierMeResponse(id=courier.id, full_name=user.full_name, role=user.role.value)


@router.get(
    "/courier/profile",
    response_model=CourierProfileResponse,
    tags=["Courier Dashboard"],
)
async def get_courier_profile(
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> CourierProfileResponse:
    user = await session.get(User, courier.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier user profile was not found.",
        )
    return _courier_profile_response(courier, user)


@router.patch(
    "/courier/profile",
    response_model=CourierProfileResponse,
    tags=["Courier Dashboard"],
)
async def update_courier_profile(
    payload: CourierProfileUpdateRequest,
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> CourierProfileResponse:
    user = await session.get(User, courier.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier user profile was not found.",
        )
    user.full_name = payload.full_name
    user.contact_phone = payload.contact_phone
    await session.commit()
    await session.refresh(user)
    return _courier_profile_response(courier, user)


def _courier_profile_response(courier: Courier, user: User) -> CourierProfileResponse:
    joined_at = courier.created_at or user.created_at
    return CourierProfileResponse(
        id=courier.id,
        full_name=user.full_name,
        email=user.email,
        contact_phone=user.contact_phone or "",
        status="ACTIVE" if user.is_active else "INACTIVE",
        joined_date=joined_at.date().isoformat(),
    )


@router.post(
    "/courier/profile/change-password",
    tags=["Courier Dashboard"],
)
async def change_courier_password(
    payload: CourierPasswordChangeRequest,
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> None:
    user = await session.get(User, courier.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Courier user profile was not found.",
        )
    if not settings.SUPABASE_URL or not settings.SUPABASE_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase authentication is not configured for password changes.",
        )

    auth_url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1"
    headers = {"apikey": settings.SUPABASE_KEY}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            login_response = await client.post(
                f"{auth_url}/token?grant_type=password",
                headers=headers,
                json={"email": user.email, "password": payload.current_password},
            )
            if login_response.status_code in (400, 401):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect.",
                )
            if login_response.status_code != status.HTTP_200_OK:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Supabase could not verify the current password.",
                )

            try:
                access_token = login_response.json().get("access_token")
            except ValueError as error:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Supabase returned an invalid authentication response.",
                ) from error
            if not isinstance(access_token, str) or not access_token:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail="Supabase returned an invalid authentication response.",
                )

            update_response = await client.put(
                f"{auth_url}/user",
                headers={**headers, "Authorization": f"Bearer {access_token}"},
                json={"password": payload.new_password},
            )
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to contact Supabase to change the password.",
        ) from error

    if update_response.status_code not in (200, 201):
        if update_response.status_code in (400, 422):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="The new password does not meet Supabase password requirements.",
            )
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Supabase could not update the password.",
        )


@router.get("/courier/dashboard/summary", response_model=DashboardSummaryResponse, tags=["Courier Dashboard"])
async def get_dashboard_summary(
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> DashboardSummaryResponse:
    """Dashboard summary computed from real database, scoped to the authenticated courier."""
    assigned_parcel_ids = select(DispatchAssignment.parcel_id).where(
        DispatchAssignment.courier_id == courier.id,
        DispatchAssignment.status != DispatchStatus.REJECTED,
    )
    counts_res = await session.execute(
        select(
            func.count(Parcel.id).label("total"),
            func.coalesce(func.sum(case((Parcel.status == ParcelStatus.DELIVERED, 1), else_=0)), 0).label("delivered"),
            func.coalesce(func.sum(case((Parcel.status == ParcelStatus.PENDING, 1), else_=0)), 0).label("pending"),
            func.coalesce(func.sum(case((Parcel.status == ParcelStatus.CANCELLED, 1), else_=0)), 0).label("failed"),
            func.coalesce(func.sum(case((Parcel.status.in_([ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.OUT_FOR_DELIVERY]), 1), else_=0)), 0).label("in_transit"),
        ).where(Parcel.id.in_(assigned_parcel_ids))
    )
    counts = counts_res.mappings().one()
    assigned = counts["total"]
    delivered = counts["delivered"]
    pending = counts["pending"]
    failed = counts["failed"]
    in_transit = counts["in_transit"]

    kpis = [
        DashboardKPI(key="assigned", value=assigned),
        DashboardKPI(key="delivered", value=delivered),
        DashboardKPI(key="in_transit", value=in_transit),
        DashboardKPI(key="pending", value=pending),
    ]

    colombo_tz = ZoneInfo("Asia/Colombo")
    today = datetime.now(colombo_tz).date()
    week_start = today - timedelta(days=6)
    start_at = datetime.combine(week_start, time.min, tzinfo=colombo_tz)
    end_at = datetime.combine(today + timedelta(days=1), time.min, tzinfo=colombo_tz)
    history_res = await session.execute(
        select(
            ParcelStatusHistory.parcel_id,
            ParcelStatusHistory.occurred_at,
        )
        .where(
            ParcelStatusHistory.status == ParcelStatus.DELIVERED,
            ParcelStatusHistory.parcel_id.in_(assigned_parcel_ids),
            ParcelStatusHistory.occurred_at >= start_at,
            ParcelStatusHistory.occurred_at < end_at,
        )
    )
    delivered_parcels_by_day: dict[date, set[int]] = {}
    for parcel_id, occurred_at in history_res.all():
        if occurred_at.tzinfo is None:
            occurred_at = occurred_at.replace(tzinfo=timezone.utc)
        day = occurred_at.astimezone(colombo_tz).date()
        delivered_parcels_by_day.setdefault(day, set()).add(parcel_id)

    weekly_deliveries = [
        WeeklyDelivery(
            date=(today - timedelta(days=days_ago)).isoformat(),
            delivered=len(
                delivered_parcels_by_day.get(today - timedelta(days=days_ago), set())
            ),
        )
        for days_ago in range(6, -1, -1)
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


@router.get(
    "/courier/parcels",
    response_model=ParcelListResponse,
    tags=["Courier Dashboard"],
)
async def get_courier_parcels(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> ParcelListResponse:
    """Return parcels assigned to the authenticated courier, with optional status filter."""
    assigned_parcel_times = (
        select(
            DispatchAssignment.parcel_id.label("parcel_id"),
            func.max(DispatchAssignment.assigned_at).label("assigned_at"),
        )
        .where(
            DispatchAssignment.courier_id == courier.id,
            DispatchAssignment.status != DispatchStatus.REJECTED,
        )
        .group_by(DispatchAssignment.parcel_id)
        .subquery()
    )
    assigned_parcel_ids = select(assigned_parcel_times.c.parcel_id)
    filters = [Parcel.id.in_(assigned_parcel_ids)]
    if status_filter:
        try:
            statuses = []
            for value in status_filter.split(","):
                normalized = value.strip().lower()
                if normalized:
                    statuses.append(
                        ParcelStatus.CANCELLED
                        if normalized == "failed"
                        else ParcelStatus(normalized)
                    )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="One or more parcel statuses are invalid.",
            ) from None
        if not statuses:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="At least one parcel status must be provided.",
            )
        filters.append(Parcel.status.in_(statuses))

    total = await session.scalar(
        select(func.count(Parcel.id)).where(*filters)
    ) or 0
    stmt = (
        select(Parcel, assigned_parcel_times.c.assigned_at)
        .join(assigned_parcel_times, assigned_parcel_times.c.parcel_id == Parcel.id)
        .where(*filters)
        .order_by(assigned_parcel_times.c.assigned_at.desc(), Parcel.id.desc())
        .offset(offset)
        .limit(limit)
    )
    res = await session.execute(stmt)
    parcels = res.all()

    items: list[ParcelListItem] = []
    for p, assigned_at in parcels:
        st = p.status.value.lower()
        status_str = "failed" if st == "cancelled" else st
        items.append(
            ParcelListItem(
                tracking_id=p.tracking_number,
                customer_name=p.recipient_name,
                customer_phone_masked=_mask_phone(p.recipient_phone),
                destination=p.delivery_city,
                address_line=p.delivery_address,
                status=status_str,
                assigned_at=assigned_at.isoformat(),
                eta=None,
            )
        )
    return ParcelListResponse(items=items, total=total)


@router.get("/courier/parcels/{tracking_id}", response_model=ParcelDetailResponse, tags=["Courier Dashboard"])
async def get_parcel_detail(
    tracking_id: str,
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> ParcelDetailResponse:
    """Get full parcel details. Verifies the parcel is assigned to the authenticated courier."""
    repo = CourierRepository(session)
    parcel = await repo.get_parcel_by_tracking_number(tracking_id)
    if not parcel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parcel not found.")
    # Confirm this parcel belongs to the authenticated courier
    assignment_res = await session.execute(
        select(DispatchAssignment).where(
            DispatchAssignment.parcel_id == parcel.id,
            DispatchAssignment.courier_id == courier.id,
        )
    )
    if not assignment_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    history_res = await session.execute(
        select(ParcelStatusHistory)
        .where(ParcelStatusHistory.parcel_id == parcel.id)
        .order_by(ParcelStatusHistory.occurred_at.asc())
    )
    history = list(history_res.scalars().all())
    return await _parcel_to_detail_response(parcel, history, courier.id, session)


@router.post(
    "/courier/parcels/{tracking_id}/delivery-result/proof",
    response_model=DeliveryProofResponse,
    tags=["Courier Delivery Result"],
)
async def upload_delivery_proof(
    tracking_id: str,
    file: UploadFile = File(...),
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> DeliveryProofResponse:
    """Upload a proof-of-delivery photo. Parcel must be assigned to the authenticated courier."""
    repo = CourierRepository(session)
    parcel = await repo.get_parcel_by_tracking_number(tracking_id)
    if not parcel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parcel not found.")
    assignment_res = await session.execute(
        select(DispatchAssignment).where(
            DispatchAssignment.parcel_id == parcel.id,
            DispatchAssignment.courier_id == courier.id,
        )
    )
    if not assignment_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    content = await file.read()
    if len(content) > MAX_PROOF_IMAGE_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File exceeds 5 MB limit.")
    content_type = file.content_type or "application/octet-stream"
    checker = _IMAGE_SIGNATURES.get(content_type)
    if not checker or not checker(content):
        raise HTTPException(status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, detail="Only JPEG, PNG, and WebP images are accepted.")
    upload_result = await _upload_proof_asset(content, file.filename or f"proof-{tracking_id}.jpg")
    secure_url: str = upload_result["secure_url"]
    public_id: str = upload_result["public_id"]
    history_entry = ParcelStatusHistory(
        parcel_id=parcel.id,
        status=parcel.status,
        proof_reference=secure_url,
        proof_public_id=public_id,
        actor="courier",
        note=None,
        occurred_at=datetime.now(timezone.utc),
    )
    session.add(history_entry)
    await session.commit()
    history_res = await session.execute(
        select(ParcelStatusHistory)
        .where(ParcelStatusHistory.parcel_id == parcel.id)
        .order_by(ParcelStatusHistory.occurred_at.asc())
    )
    history = list(history_res.scalars().all())
    return DeliveryProofResponse(
        secure_url=secure_url,
        public_id=public_id,
        parcel=await _parcel_to_detail_response(parcel, history, courier.id, session),
    )


@router.delete(
    "/courier/parcels/{tracking_id}/delivery-result/proof",
    response_model=ParcelDetailResponse,
    tags=["Courier Delivery Result"],
)
async def delete_delivery_proof(
    tracking_id: str,
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> ParcelDetailResponse:
    """Delete a proof photo. Only the assigned courier may delete it, and only before delivery."""
    repo = CourierRepository(session)
    parcel = await repo.get_parcel_by_tracking_number(tracking_id)
    if not parcel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parcel not found.")
    assignment_res = await session.execute(
        select(DispatchAssignment).where(
            DispatchAssignment.parcel_id == parcel.id,
            DispatchAssignment.courier_id == courier.id,
        )
    )
    if not assignment_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    history_res = await session.execute(
        select(ParcelStatusHistory)
        .where(ParcelStatusHistory.parcel_id == parcel.id)
        .order_by(ParcelStatusHistory.occurred_at.asc())
    )
    history = list(history_res.scalars().all())
    latest_proof_entry = next((e for e in reversed(history) if e.proof_reference), None)
    if not latest_proof_entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No proof found for this parcel.")
    public_id = latest_proof_entry.proof_public_id
    if not public_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="This proof cannot be deleted because its storage reference is unavailable.",
        )
    try:
        await _delete_proof_asset(public_id)
    except CloudinaryServiceError:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="Failed to delete proof from storage.")
    await session.execute(
        update(ParcelStatusHistory)
        .where(ParcelStatusHistory.id == latest_proof_entry.id)
        .values(proof_reference=None, proof_public_id=None)
    )
    await session.commit()
    latest_proof_entry.proof_reference = None
    latest_proof_entry.proof_public_id = None
    return await _parcel_to_detail_response(parcel, history, courier.id, session)


@router.post(
    "/courier/parcels/{tracking_id}/delivery-result/success",
    response_model=ParcelDetailResponse,
    tags=["Courier Delivery Result"],
)
async def submit_successful_delivery(
    tracking_id: str,
    payload: SuccessfulDeliveryRequest,
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> ParcelDetailResponse:
    """Mark a parcel as delivered. The parcel must be assigned to the authenticated courier."""
    repo = CourierRepository(session)
    parcel = await repo.get_parcel_by_tracking_number(tracking_id)
    if not parcel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parcel not found.")
    assignment_res = await session.execute(
        select(DispatchAssignment).where(
            DispatchAssignment.parcel_id == parcel.id,
            DispatchAssignment.courier_id == courier.id,
        )
    )
    if not assignment_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    if parcel.status != ParcelStatus.OUT_FOR_DELIVERY:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A delivery result can only be submitted for a parcel that is out for delivery.",
        )
    existing_history_res = await session.execute(
        select(ParcelStatusHistory)
        .where(ParcelStatusHistory.parcel_id == parcel.id)
        .order_by(ParcelStatusHistory.occurred_at.asc())
    )
    existing_history = list(existing_history_res.scalars().all())
    latest_proof = next(
        (
            entry
            for entry in reversed(existing_history)
            if entry.proof_reference and entry.proof_public_id
        ),
        None,
    )
    if latest_proof is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Upload a delivery proof before confirming delivery.",
        )
    await session.execute(
        update(Parcel)
        .where(Parcel.id == parcel.id)
        .values(
            status=ParcelStatus.DELIVERED,
            delivery_recipient_name=payload.recipient_name,
        )
    )
    history_entry = ParcelStatusHistory(
        parcel_id=parcel.id,
        status=ParcelStatus.DELIVERED,
        proof_reference=latest_proof.proof_reference,
        proof_public_id=latest_proof.proof_public_id,
        actor="courier",
        note=None,
        occurred_at=datetime.now(timezone.utc),
    )
    session.add(history_entry)
    await session.commit()
    await session.refresh(parcel)
    history_res = await session.execute(
        select(ParcelStatusHistory)
        .where(ParcelStatusHistory.parcel_id == parcel.id)
        .order_by(ParcelStatusHistory.occurred_at.asc())
    )
    history = list(history_res.scalars().all())
    return await _parcel_to_detail_response(parcel, history, courier.id, session)


@router.post(
    "/courier/parcels/{tracking_id}/delivery-result/failure",
    response_model=ParcelDetailResponse,
    tags=["Courier Delivery Result"],
)
async def submit_failed_delivery(
    tracking_id: str,
    payload: FailedDeliveryRequest,
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> ParcelDetailResponse:
    """Mark a parcel delivery as failed. Parcel must be assigned to the authenticated courier."""
    repo = CourierRepository(session)
    parcel = await repo.get_parcel_by_tracking_number(tracking_id)
    if not parcel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parcel not found.")
    assignment_res = await session.execute(
        select(DispatchAssignment).where(
            DispatchAssignment.parcel_id == parcel.id,
            DispatchAssignment.courier_id == courier.id,
        )
    )
    if not assignment_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    active_statuses = {ParcelStatus.PICKED_UP, ParcelStatus.IN_TRANSIT, ParcelStatus.OUT_FOR_DELIVERY}
    if parcel.status not in active_statuses:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A failed result can only be submitted after pickup and before delivery.",
        )
    failure_reason = getattr(payload, "failure_reason", "other")
    note = getattr(payload, "note", None)
    await session.execute(
        update(Parcel).where(Parcel.id == parcel.id).values(
            status=ParcelStatus.CANCELLED,
            failure_reason=failure_reason,
        )
    )
    history_entry = ParcelStatusHistory(
        parcel_id=parcel.id,
        status=ParcelStatus.CANCELLED,
        actor="courier",
        note=note,
        occurred_at=datetime.now(timezone.utc),
    )
    session.add(history_entry)
    await session.commit()
    await session.refresh(parcel)
    history_res = await session.execute(
        select(ParcelStatusHistory)
        .where(ParcelStatusHistory.parcel_id == parcel.id)
        .order_by(ParcelStatusHistory.occurred_at.asc())
    )
    history = list(history_res.scalars().all())
    return await _parcel_to_detail_response(parcel, history, courier.id, session)


@router.patch("/courier/parcels/{tracking_id}/status", response_model=ParcelDetailResponse, tags=["Courier Dashboard"])
async def update_parcel_status(
    tracking_id: str,
    payload: ParcelStatusUpdateRequest,
    courier: Courier = Depends(get_authenticated_courier),
    session: AsyncSession = Depends(get_db),
) -> ParcelDetailResponse:
    """
    Update the status of a parcel assigned to the authenticated courier.
    Courier identity comes exclusively from the validated token.
    """
    repo = CourierRepository(session)
    parcel = await repo.get_parcel_by_tracking_number(tracking_id)
    if not parcel:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Parcel not found.")
    # Verify the parcel belongs to this courier
    assignment_res = await session.execute(
        select(DispatchAssignment).where(
            DispatchAssignment.parcel_id == parcel.id,
            DispatchAssignment.courier_id == courier.id,
        )
    )
    if not assignment_res.scalars().first():
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    try:
        new_status = ParcelStatus(payload.status)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status: {payload.status}")
    VALID_TRANSITIONS: dict[ParcelStatus, set[ParcelStatus]] = {
        ParcelStatus.PENDING: {ParcelStatus.PICKED_UP},
        ParcelStatus.PICKED_UP: {ParcelStatus.IN_TRANSIT},
        ParcelStatus.IN_TRANSIT: {ParcelStatus.OUT_FOR_DELIVERY},
        ParcelStatus.OUT_FOR_DELIVERY: {ParcelStatus.DELIVERED, ParcelStatus.CANCELLED},
    }
    allowed = VALID_TRANSITIONS.get(parcel.status, set())
    if new_status not in allowed:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot transition from {parcel.status.value} to {new_status.value}.",
        )
    await session.execute(
        update(Parcel).where(Parcel.id == parcel.id).values(status=new_status)
    )
    history_entry = ParcelStatusHistory(
        parcel_id=parcel.id,
        status=new_status,
        actor="courier",
        note=getattr(payload, "note", None),
        occurred_at=datetime.now(timezone.utc),
    )
    session.add(history_entry)
    await session.commit()
    await session.refresh(parcel)
    history_res = await session.execute(
        select(ParcelStatusHistory)
        .where(ParcelStatusHistory.parcel_id == parcel.id)
        .order_by(ParcelStatusHistory.occurred_at.asc())
    )
    history = list(history_res.scalars().all())
    return await _parcel_to_detail_response(parcel, history, courier.id, session)
