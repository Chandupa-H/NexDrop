import pytest
from httpx import AsyncClient
from app.modules.webhooks.service import compute_hmac_signature


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
async def test_create_delivery_with_api_key(async_client: AsyncClient):
    """Secure delivery creation via API key succeeds and returns tracking number."""
    resp = await async_client.post(
        "/api/v1/merchants/deliveries",
        headers={"X-API-Key": "nd_live_89a3f2d1e07b8c94a62174bf903d5e82"},
        json={
            "recipient_name": "Nimal Siripala",
            "recipient_phone": "+94779876543",
            "delivery_address": "12 Kandy Road",
            "delivery_city": "Kandy",
            "weight_kg": 2.0,
            "cod_amount": 1500.0,
        },
    )
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
async def test_webhook_test_ping(async_client: AsyncClient):
    """Verify webhook test ping endpoint fires payload and returns signature."""
    resp = await async_client.post(
        "/api/v1/webhooks/test-ping",
        json={
            "target_url": "https://httpbin.org/post",
            "secret_key": "whsec_98f42d1e07b8a53c469f1a2e7d80b4c9",
            "event": "order.delivered",
            "tracking_number": "ND-LK-998877",
        },
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    assert data["signature"].startswith("sha256=")
    assert data["duration_ms"] > 0


@pytest.mark.asyncio
async def test_webhook_logs_endpoint(async_client: AsyncClient):
    """Verify webhook delivery logs endpoint returns history."""
    resp = await async_client.get("/api/v1/webhooks/merchant/1/logs")
    assert resp.status_code == 200
    logs = resp.json()
    assert isinstance(logs, list)
    assert len(logs) > 0
    assert "status" in logs[0]
