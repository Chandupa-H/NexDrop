import pytest
from fastapi import HTTPException
from httpx import AsyncClient
from app.main import app
from app.db.session import get_db
from app.modules.merchants.models import ApprovalStatus, Merchant
from app.modules.merchants.security import get_authenticated_merchant
from app.modules.webhooks.service import (
    EndpointValidationError,
    authorize_merchant_path,
    validate_endpoint,
)
from app.modules.webhooks.service import compute_hmac_signature
from app.modules.webhooks.service import WebhookService


@pytest.mark.asyncio
async def test_api_key_missing_fails(async_client: AsyncClient):
    """Calling secure delivery API without an API key must return 401 Unauthorized."""
    resp = await async_client.post(
        "/api/v1/merchants/deliveries",
        json={
            "recipient_name": "Kasun Perera",
            "recipient_phone": "+94771234567",
            "delivery_address": "45 Galle Road",
            "delivery_city": "Colombo",
        },
    )
    assert resp.status_code == 401
    assert "Missing API authentication credentials" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_api_key_invalid_fails(async_client: AsyncClient):
    """Calling secure delivery API with invalid key must return 401."""
    resp = await async_client.post(
        "/api/v1/merchants/deliveries",
        headers={"X-API-Key": "nd_live_invalid_key_12345"},
        json={
            "recipient_name": "Kasun Perera",
            "recipient_phone": "+94771234567",
            "delivery_address": "45 Galle Road",
            "delivery_city": "Colombo",
        },
    )
    assert resp.status_code == 401
    assert "Invalid API key" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_verify_key_endpoint(async_client: AsyncClient):
    """Verify key verification endpoint identifies live and test keys."""
    resp = await async_client.post(
        "/api/v1/merchants/verify-key",
        json={"api_key": "nd_live_89a3f2d1e07b8c94a62174bf903d5e82"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["valid"] is True
    assert data["key_mode"] == "live"


@pytest.mark.asyncio
async def test_oauth_token_exchange(async_client: AsyncClient):
    """Verify OAuth 2.0 client credentials grant issues a Bearer token."""
    resp = await async_client.post(
        "/api/v1/merchants/oauth/token",
        json={
            "grant_type": "client_credentials",
            "client_id": "nd_client_ceyloncrafts_01",
            "client_secret": "nd_secret_994a32e18b0c72f4e69d12a80b5c43d2",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert data["expires_in"] == 86400


@pytest.mark.asyncio
async def test_create_delivery_with_api_key(async_client: AsyncClient, monkeypatch):
    class FakeSession:
        def add(self, _parcel):
            return None

        async def commit(self):
            return None

        async def refresh(self, parcel):
            parcel.id = 1

    async def override_db():
        yield FakeSession()

    async def override_merchant():
        return Merchant(
            id=17,
            user_id=101,
            business_name="Test Merchant",
            registration_number="TEST-17",
            contact_phone="",
            business_address="Colombo",
            approval_status=ApprovalStatus.APPROVED,
        )

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_authenticated_merchant] = override_merchant
    monkeypatch.setattr(
        WebhookService, "schedule_parcel_event", lambda **_kwargs: None
    )
    try:
        resp = await async_client.post(
            "/api/v1/merchants/deliveries",
            headers={"X-API-Key": "unit-test-api-key"},
            json={
                "recipient_name": "Nimal Siripala",
                "recipient_phone": "+94779876543",
                "delivery_address": "12 Kandy Road",
                "delivery_city": "Kandy",
                "weight_kg": 2.0,
                "cod_amount": 1500.0,
            },
        )
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_authenticated_merchant, None)

    assert resp.status_code == 201
    data = resp.json()
    assert data["tracking_number"].startswith("ND-LK-")
    assert data["status"] == "created"
    assert data["recipient_name"] == "Nimal Siripala"


@pytest.mark.asyncio
async def test_webhook_hmac_signature():
    """Verify HMAC-SHA256 signature algorithm."""
    secret = "whsec_test_secret_123"
    payload = b'{"event":"order.picked_up"}'
    sig = compute_hmac_signature(secret, payload)
    assert sig.startswith("sha256=")
    assert len(sig) == 7 + 64  # 'sha256=' + 64 hex chars


@pytest.mark.asyncio
async def test_webhook_test_ping_requires_auth(async_client: AsyncClient):
    resp = await async_client.post(
        "/api/v1/webhooks/test-ping",
        json={"event": "order.created"},
    )
    assert resp.status_code == 401


def test_webhook_path_is_limited_to_authenticated_merchant():
    assert authorize_merchant_path("me", 17) == 17
    assert authorize_merchant_path("MER-000017", 17) == 17
    with pytest.raises(HTTPException) as exc_info:
        authorize_merchant_path("18", 17)
    assert exc_info.value.status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "url",
    [
        "http://example.com/hook",
        "https://localhost/hook",
        "https://api.localhost/hook",
        "https://127.0.0.1/hook",
        "https://192.168.1.5/hook",
        "https://user:pass@example.com/hook",
        "https://example.com/hook?token=value",
    ],
)
async def test_webhook_endpoint_rejects_unsafe_destinations(url: str):
    with pytest.raises(EndpointValidationError):
        await validate_endpoint(url)
