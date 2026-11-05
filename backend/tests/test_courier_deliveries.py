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
from app.modules.couriers.schemas import DeliveryListItem
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

    async def get_courier_deliveries(self, courier_id, status, delivery_date):
        self.request = (courier_id, status, delivery_date)
        return [
            DeliveryListItem(
                parcel_id=9,
                tracking_number="ND-0000000009",
                status=ParcelStatus.PICKED_UP,
                pickup_address="10 Main Street, Colombo",
                dropoff_address="20 Lake Road, Colombo",
                size="20x15x10",
                weight=2.5,
                recipient_name="Recipient",
                recipient_phone="0771234567",
                assigned_at=datetime(2026, 11, 5, 8, tzinfo=timezone.utc),
            )
        ]


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
