import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check_endpoint(async_client: AsyncClient):
    """
    Verify GET /api/v1/health returns HTTP 200 and {'status': 'healthy'}.
    Must succeed without database or broker connections.
    """
    response = await async_client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "version" in data


@pytest.mark.asyncio
async def test_root_endpoint(async_client: AsyncClient):
    """
    Verify root endpoint responds with basic service info and documentation links.
    """
    response = await async_client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["service"] == "NexDrop API"
    assert data["health"] == "/api/v1/health"


@pytest.mark.asyncio
async def test_pricing_estimate_without_db(async_client: AsyncClient):
    """
    Verify pricing estimation calculation works cleanly using fallback constants.
    """
    response = await async_client.post(
        "/api/v1/pricing/estimate",
        json={"tier_name": "Standard", "distance_km": 10.0, "weight_kg": 2.5},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["distance_km"] == 10.0
    assert data["weight_kg"] == 2.5
    assert data["total_price"] > 0
