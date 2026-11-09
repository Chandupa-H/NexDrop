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
from app.main import app
from app.modules.auth.dependencies import (
    get_authenticated_courier,
    verify_supabase_access_token,
)
from app.modules.couriers.delivery_routes import get_courier_service
from app.modules.couriers.repository import CourierRepository
from app.modules.couriers.schemas import (
    CourierLocationResponse,
    CourierLocationUpdateRequest,
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

    async def update_assigned_delivery_status(self, courier_id, delivery_id, next_status):
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
        tracking = await async_client.get("/api/v1/deliveries/9/tracking")
    finally:
        app.dependency_overrides.pop(get_authenticated_courier, None)
        app.dependency_overrides.pop(get_courier_service, None)

    assert detail.status_code == 200
    assert detail.json()["parcel_id"] == 9
    assert unassigned.status_code == 404
    assert tracking.status_code == 404


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
        self.parcel = SimpleNamespace(id=delivery_id, status=status)
        self.courier_id = courier_id
        self.session = SimpleNamespace(flush=self.flush)

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
        }


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
