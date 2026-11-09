import base64
import hashlib
import hmac
import json
from datetime import datetime, timezone
from types import SimpleNamespace
from zoneinfo import ZoneInfo

import pytest
from httpx import AsyncClient
from fastapi import HTTPException

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.modules.auth.dependencies import (
    get_authenticated_courier,
    get_verified_token_claims,
    verify_supabase_access_token,
)
from app.modules.couriers.delivery_routes import get_courier_service
from app.modules.couriers.repository import CourierRepository
from app.modules.couriers.schemas import (
    CourierLocationResponse,
    CourierLocationUpdateRequest,
    DeliveryHistoryResponse,
    DeliveryHistorySummary,
    DeliveryListItem,
    DeliveryStatusUpdateRequest,
)
from app.modules.couriers.service import CourierService
from app.modules.parcels.models import ParcelStatus


class StubResult:
    def mappings(self):
        return self

    def all(self):
        return []


class RecordingSession:
    def __init__(self):
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return StubResult()


class StubCourierService:
    def __init__(self):
        self.request = None
        self.location_request = None
        self.status_request = None

    async def get_courier_deliveries(self, courier_id, status, delivery_date):
        self.request = (courier_id, status, delivery_date)
        return [self.delivery()]

    @staticmethod
    def delivery(status=ParcelStatus.PICKED_UP):
        return DeliveryListItem(
            parcel_id=9,
            tracking_number="ND-0000000009",
            status=status,
            pickup_address="10 Main Street, Colombo",
            dropoff_address="20 Lake Road, Colombo",
            size="20x15x10",
            weight=2.5,
            recipient_name="Recipient",
            recipient_phone="0771234567",
            assigned_at=datetime(2026, 11, 5, 8, tzinfo=timezone.utc),
        )

    async def get_assigned_delivery(self, courier_id, delivery_id):
        return self.delivery() if courier_id == 42 and delivery_id == 9 else None

    async def get_assigned_delivery_detail(self, courier_id, delivery_id):
        if courier_id == 42 and delivery_id == 9:
            return self.delivery()
        if courier_id == 42 and delivery_id == 11:
            raise HTTPException(status_code=403, detail="Access denied.")
        return None

    async def get_courier_delivery_history(
        self, courier_id, status, from_date, to_date, query, page, page_size
    ):
        self.history_request = (
            courier_id,
            status,
            from_date,
            to_date,
            query,
            page,
            page_size,
        )
        return DeliveryHistoryResponse(
            items=[],
            total=0,
            page=page,
            page_size=page_size,
            history_summary=DeliveryHistorySummary(delivered=0, cancelled=0, total=0),
        )

    async def update_assigned_delivery_status(
        self,
        courier_id,
        delivery_id,
        next_status,
        note=None,
        proof_reference=None,
        failure_reason=None,
    ):
        self.status_request = (courier_id, delivery_id, next_status)
        return self.delivery(next_status)

    async def post_courier_location(self, courier, payload):
        self.location_request = (courier.id, payload)
        return (
            CourierLocationResponse(
                courier_id=courier.id,
                lat=payload.lat,
                lng=payload.lng,
                updated_at=datetime.now(timezone.utc),
                active_delivery_id=payload.delivery_id,
            ),
            True,
        )

    async def get_courier_location(self, courier_id):
        return None

    async def get_delivery_tracking(self, courier_id, delivery_id):
        return None


@pytest.mark.asyncio
async def test_delivery_route_uses_authenticated_courier_and_status(async_client: AsyncClient):
    service = StubCourierService()
    app.dependency_overrides[get_authenticated_courier] = lambda: SimpleNamespace(id=42)
    app.dependency_overrides[get_courier_service] = lambda: service
    try:
        response = await async_client.get(
            "/api/v1/courier/deliveries",
            params=[
                ("status", "picked_up"),
                ("status", "out_for_delivery"),
                ("courier_id", "999"),
            ],
        )
    finally:
        app.dependency_overrides.pop(get_authenticated_courier, None)
        app.dependency_overrides.pop(get_courier_service, None)

    assert response.status_code == 200
    assert response.json()[0]["parcel_id"] == 9
    courier_id, statuses, requested_date = service.request
    assert courier_id == 42
    assert statuses == [ParcelStatus.PICKED_UP, ParcelStatus.OUT_FOR_DELIVERY]
    assert requested_date == datetime.now(ZoneInfo("Asia/Colombo")).date()


@pytest.mark.asyncio
async def test_delivery_route_rejects_unknown_status(async_client: AsyncClient):
    app.dependency_overrides[get_authenticated_courier] = lambda: SimpleNamespace(id=42)
    app.dependency_overrides[get_courier_service] = lambda: StubCourierService()
    try:
        response = await async_client.get(
            "/api/v1/courier/deliveries?status=not-a-status"
        )
    finally:
        app.dependency_overrides.pop(get_authenticated_courier, None)
        app.dependency_overrides.pop(get_courier_service, None)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_delivery_route_requires_bearer_token(async_client: AsyncClient):
    response = await async_client.get("/api/v1/courier/deliveries")
    assert response.status_code == 401
    history = await async_client.get("/api/v1/courier/deliveries/history")
    assert history.status_code == 401


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "path",
    [
        "/api/v1/courier/deliveries/9",
        "/api/v1/deliveries/9/tracking",
    ],
)
async def test_delivery_details_and_tracking_require_bearer_token(
    async_client: AsyncClient, path: str
):
    response = await async_client.get(path)
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_delivery_details_and_tracking_are_scoped_to_assigned_courier(
    async_client: AsyncClient,
):
    service = StubCourierService()
    app.dependency_overrides[get_authenticated_courier] = lambda: SimpleNamespace(id=42)
    app.dependency_overrides[get_courier_service] = lambda: service
    try:
        detail = await async_client.get("/api/v1/courier/deliveries/9")
        unassigned = await async_client.get("/api/v1/courier/deliveries/10")
        forbidden = await async_client.get("/api/v1/courier/deliveries/11")
        unknown = await async_client.get("/api/v1/courier/deliveries/12")
        tracking = await async_client.get("/api/v1/deliveries/9/tracking")
    finally:
        app.dependency_overrides.pop(get_authenticated_courier, None)
        app.dependency_overrides.pop(get_courier_service, None)

    assert detail.status_code == 200
    assert detail.json()["parcel_id"] == 9
    assert unassigned.status_code == 404
    assert forbidden.status_code == 403
    assert forbidden.json() == {"detail": "Access denied."}
    assert unknown.status_code == 404
    assert tracking.status_code == 404


class HistoryQueryResult:
    def __init__(self, *, rows=False):
        self.rows = rows

    def mappings(self):
        return self

    def all(self):
        return []

    def one(self):
        return {"total": 0, "delivered": 0, "cancelled": 0}


class HistoryQuerySession:
    def __init__(self):
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return HistoryQueryResult(rows=len(self.statements) == 1)


@pytest.mark.asyncio
async def test_history_repository_uses_bounded_queries_parameterized_search_and_stable_order():
    session = HistoryQuerySession()
    repository = CourierRepository(session)

    await repository.list_delivery_history(
        42,
        [ParcelStatus.DELIVERED, ParcelStatus.CANCELLED],
        datetime(2026, 11, 4, tzinfo=timezone.utc),
        datetime(2026, 11, 6, tzinfo=timezone.utc),
        "H%_\\001",
        2,
        20,
    )

    assert len(session.statements) == 2
    page_sql = str(session.statements[0])
    assert "ORDER BY completed_at DESC, parcels.id DESC" in page_sql
    compiled = session.statements[0].compile()
    assert "H%_\\001" not in page_sql
    assert any("H\\%\\_\\\\001" in str(value) for value in compiled.params.values())
    assert "dispatch_assignments.courier_id" in page_sql
    assert "parcels.status IN" in page_sql


@pytest.mark.asyncio
async def test_delivery_detail_service_distinguishes_wrong_owner_from_unknown_parcel():
    class OwnershipRepository:
        def __init__(self, exists):
            self.exists = exists

        async def get_assigned_delivery(self, courier_id, delivery_id):
            return None

        async def parcel_exists(self, delivery_id):
            return self.exists

    wrong_owner = CourierService(OwnershipRepository(exists=True))
    with pytest.raises(HTTPException) as denied:
        await wrong_owner.get_assigned_delivery_detail(42, 99)
    assert denied.value.status_code == 403

    unknown = CourierService(OwnershipRepository(exists=False))
    assert await unknown.get_assigned_delivery_detail(42, 999) is None


@pytest.mark.asyncio
async def test_history_route_uses_token_courier_and_passes_filters(async_client: AsyncClient):
    service = StubCourierService()
    app.dependency_overrides[get_authenticated_courier] = lambda: SimpleNamespace(id=42)
    app.dependency_overrides[get_courier_service] = lambda: service
    try:
        response = await async_client.get(
            "/api/v1/courier/deliveries/history",
            params={
                "status": "cancelled",
                "from": "2026-10-01",
                "to": "2026-11-06",
                "q": "ND-%",
                "page": 2,
                "page_size": 30,
                "courier_id": 999,
            },
        )
    finally:
        app.dependency_overrides.pop(get_authenticated_courier, None)
        app.dependency_overrides.pop(get_courier_service, None)

    assert response.status_code == 200
    assert response.json()["page"] == 2
    assert response.json()["history_summary"]["cancelled"] == 0
    assert service.history_request == (
        42,
        ParcelStatus.CANCELLED,
        datetime(2026, 10, 1).date(),
        datetime(2026, 11, 6).date(),
        "ND-%",
        2,
        30,
    )


@pytest.mark.asyncio
async def test_history_route_rejects_authenticated_non_courier(async_client: AsyncClient):
    class AuthResult:
        def scalars(self):
            return self

        def first(self):
            return SimpleNamespace(
                id=7,
                email="customer@example.test",
                role="customer",
                is_active=True,
            )

    class AuthSession:
        async def execute(self, statement):
            return AuthResult()

    app.dependency_overrides[get_verified_token_claims] = lambda: {
        "email": "customer@example.test"
    }
    app.dependency_overrides[get_db] = lambda: AuthSession()
    try:
        response = await async_client.get("/api/v1/courier/deliveries/history")
    finally:
        app.dependency_overrides.pop(get_verified_token_claims, None)
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "query",
    [
        "status=pending",
        "status=failed",
        "from=2026-11-06&to=2026-11-05",
        "page_size=101",
        "q=" + ("x" * 101),
    ],
)
async def test_history_route_rejects_invalid_filters(async_client: AsyncClient, query: str):
    app.dependency_overrides[get_authenticated_courier] = lambda: SimpleNamespace(id=42)
    app.dependency_overrides[get_courier_service] = lambda: StubCourierService()
    try:
        response = await async_client.get(
            f"/api/v1/courier/deliveries/history?{query}"
        )
    finally:
        app.dependency_overrides.pop(get_authenticated_courier, None)
        app.dependency_overrides.pop(get_courier_service, None)

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_location_route_uses_authenticated_courier_and_rejects_bad_coordinates(
    async_client: AsyncClient,
):
    service = StubCourierService()
    app.dependency_overrides[get_authenticated_courier] = lambda: SimpleNamespace(id=42)
    app.dependency_overrides[get_courier_service] = lambda: service
    try:
        accepted = await async_client.post(
            "/api/v1/courier/location",
            json={
                "lat": 6.9,
                "lng": 79.8,
                "deliveryId": 9,
                "courier_id": 999,
            },
        )
        out_of_range = await async_client.post(
            "/api/v1/courier/location",
            json={"lat": 91.0, "lng": 79.8, "deliveryId": 9},
        )
        not_finite = await async_client.post(
            "/api/v1/courier/location",
            content='{"lat": NaN, "lng": 79.8, "deliveryId": 9}',
            headers={"content-type": "application/json"},
        )
        non_numeric = await async_client.post(
            "/api/v1/courier/location",
            json={"lat": "6.9", "lng": 79.8, "deliveryId": 9},
        )
    finally:
        app.dependency_overrides.pop(get_authenticated_courier, None)
        app.dependency_overrides.pop(get_courier_service, None)

    assert accepted.status_code == 200
    assert service.location_request[0] == 42
    assert service.location_request[1].delivery_id == 9
    assert out_of_range.status_code == 422
    assert not_finite.status_code == 422
    assert non_numeric.status_code == 422


@pytest.mark.asyncio
async def test_status_route_passes_token_scoped_courier_to_service(
    async_client: AsyncClient,
):
    service = StubCourierService()
    app.dependency_overrides[get_authenticated_courier] = lambda: SimpleNamespace(id=42)
    app.dependency_overrides[get_courier_service] = lambda: service
    try:
        response = await async_client.patch(
            "/api/v1/courier/deliveries/9/status",
            json={"status": "in_transit"},
        )
    finally:
        app.dependency_overrides.pop(get_authenticated_courier, None)
        app.dependency_overrides.pop(get_courier_service, None)

    assert response.status_code == 200
    assert service.status_request == (42, 9, ParcelStatus.IN_TRANSIT)


class StatusRepositoryStub:
    def __init__(self, courier_id=42, delivery_id=9, status=ParcelStatus.PENDING):
        self.parcel = SimpleNamespace(
            id=delivery_id, status=status, failure_reason=None
        )
        self.courier_id = courier_id
        self.session = SimpleNamespace(flush=self.flush)
        self.status_history = []
        self.completed_assignments = []

    async def flush(self):
        return None

    async def get_assigned_parcel_for_update(self, courier_id, delivery_id):
        if courier_id != self.courier_id or delivery_id != self.parcel.id:
            return None
        return self.parcel

    async def get_assigned_delivery(self, courier_id, delivery_id):
        if courier_id != self.courier_id or delivery_id != self.parcel.id:
            return None
        return {
            "parcel_id": self.parcel.id,
            "tracking_number": "ND-0000000009",
            "status": self.parcel.status,
            "pickup_address": "10 Main Street, Colombo",
            "sender_address": None,
            "sender_city": None,
            "delivery_address": "20 Lake Road",
            "delivery_city": "Colombo",
            "size": "20x15x10",
            "weight": 2.5,
            "recipient_name": "Recipient",
            "recipient_phone": "0771234567",
            "assigned_at": datetime(2026, 11, 5, 8, tzinfo=timezone.utc),
            "pickup_lat": None,
            "pickup_lng": None,
            "dropoff_lat": None,
            "dropoff_lng": None,
            "delivery_instructions": None,
            "completed_at": None,
            "failure_reason": self.parcel.failure_reason,
        }

    async def save_status_history(self, parcel_id, status, actor, note=None, proof_reference=None):
        self.status_history.append((parcel_id, status, actor, note, proof_reference))

    async def complete_assignment(self, courier_id, delivery_id, completed_at):
        self.completed_assignments.append((courier_id, delivery_id, completed_at))


@pytest.mark.asyncio
async def test_service_enforces_status_transitions_and_delivery_ownership():
    repository = StatusRepositoryStub()
    service = CourierService(repository)

    updated = await service.update_assigned_delivery_status(
        42, 9, ParcelStatus.PICKED_UP
    )
    assert updated.status == ParcelStatus.PICKED_UP
    assert repository.parcel.status == ParcelStatus.PICKED_UP

    with pytest.raises(HTTPException) as invalid_transition:
        await service.update_assigned_delivery_status(42, 9, ParcelStatus.DELIVERED)
    assert invalid_transition.value.status_code == 409
    for next_status in (
        ParcelStatus.IN_TRANSIT,
        ParcelStatus.OUT_FOR_DELIVERY,
        ParcelStatus.DELIVERED,
    ):
        updated = await service.update_assigned_delivery_status(42, 9, next_status)
        assert updated.status == next_status
    assert repository.parcel.status == ParcelStatus.DELIVERED
    assert [entry[1] for entry in repository.status_history] == [
        ParcelStatus.PICKED_UP,
        ParcelStatus.IN_TRANSIT,
        ParcelStatus.OUT_FOR_DELIVERY,
        ParcelStatus.DELIVERED,
    ]
    assert repository.completed_assignments[0][:2] == (42, 9)
    assert await service.update_assigned_delivery_status(
        77, 9, ParcelStatus.IN_TRANSIT
    ) is None


class LocationRepositoryStub:
    def __init__(self, active=True):
        self.active = active
        self.active_query = None

    async def get_active_assigned_delivery(self, courier_id, delivery_id):
        self.active_query = (courier_id, delivery_id)
        if not self.active or courier_id != 42 or delivery_id != 9:
            return None
        return SimpleNamespace(id=delivery_id)

    async def save_location(self, **values):
        return SimpleNamespace(
            courier_id=values["courier_id"],
            lat=values["lat"],
            lng=values["lng"],
            accuracy=values["accuracy"],
            heading=values["heading"],
            speed=values["speed"],
            updated_at=datetime.now(timezone.utc),
            active_delivery_id=values["delivery_id"],
        ), True


@pytest.mark.asyncio
async def test_location_service_uses_authenticated_courier_and_requires_active_delivery():
    repository = LocationRepositoryStub()
    service = CourierService(repository)
    courier = SimpleNamespace(id=42, is_available=True)
    payload = CourierLocationUpdateRequest(lat=6.9, lng=79.8, delivery_id=9)

    location, accepted = await service.post_courier_location(courier, payload)

    assert accepted is True
    assert location.courier_id == 42
    assert repository.active_query == (42, 9)

    repository.active = False
    with pytest.raises(HTTPException) as no_active_delivery:
        await service.post_courier_location(courier, payload)
    assert no_active_delivery.value.status_code == 409

    courier.is_available = False
    with pytest.raises(HTTPException) as unavailable_courier:
        await service.post_courier_location(courier, payload)
    assert unavailable_courier.value.status_code == 409


@pytest.mark.asyncio
async def test_location_repository_throttles_updates_within_three_seconds():
    current = SimpleNamespace(
        courier_id=42,
        lat=6.9,
        lng=79.8,
        accuracy=None,
        heading=None,
        speed=None,
        active_delivery_id=9,
        updated_at=datetime.now(timezone.utc),
    )

    class ExistingLocationResult:
        def scalars(self):
            return self

        def first(self):
            return current

    class ExistingLocationSession:
        def __init__(self):
            self.flush_count = 0

        async def execute(self, _statement):
            return ExistingLocationResult()

        async def flush(self):
            self.flush_count += 1

    session = ExistingLocationSession()
    repository = CourierRepository(session)
    location, accepted = await repository.save_location(
        courier_id=42,
        lat=6.91,
        lng=79.81,
        accuracy=5,
        heading=90,
        speed=2,
        delivery_id=9,
    )

    assert accepted is False
    assert location.lat == 6.9
    assert session.flush_count == 0


@pytest.mark.asyncio
async def test_repository_scopes_orders_and_filters_deliveries():
    session = RecordingSession()
    repository = CourierRepository(session)

    await repository.get_courier_deliveries(
        41, [ParcelStatus.IN_TRANSIT], datetime(2026, 11, 5).date()
    )
    await repository.get_courier_deliveries(
        73, None, datetime(2026, 11, 5).date()
    )

    first, second = session.statements
    first_sql = str(first)
    assert "dispatch_assignments.courier_id" in first_sql
    assert "dispatch_assignments.assigned_at" in first_sql
    assert "parcels.status" in first_sql
    assert "ORDER BY dispatch_assignments.assigned_at" in first_sql
    assert 41 in first.compile().params.values()
    assert 73 in second.compile().params.values()


def _encode_segment(value: dict) -> str:
    encoded = base64.urlsafe_b64encode(json.dumps(value).encode()).decode()
    return encoded.rstrip("=")


def test_supabase_access_token_signature_and_claims(monkeypatch):
    secret = "test-secret"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", secret)
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://example.supabase.co")

    header = _encode_segment({"alg": "HS256", "typ": "JWT"})
    claims = _encode_segment(
        {
            "aud": "authenticated",
            "role": "authenticated",
            "email": "courier@example.com",
            "exp": 4_102_444_800,
            "iss": "https://example.supabase.co/auth/v1",
        }
    )
    signing_input = f"{header}.{claims}".encode()
    signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    token = f"{header}.{claims}.{base64.urlsafe_b64encode(signature).decode().rstrip('=')}"

    assert verify_supabase_access_token(token)["email"] == "courier@example.com"
    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_access_token(f"{header}.{claims}.invalid")
    assert exc_info.value.status_code == 401
