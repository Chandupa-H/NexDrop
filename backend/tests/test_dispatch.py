import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_dispatcher_me(async_client: AsyncClient):
    response = await async_client.get("/api/v1/dispatch/dispatcher/me")
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "dispatcher"
    assert "full_name" in data


@pytest.mark.asyncio
async def test_get_dispatcher_dashboard_stats(async_client: AsyncClient):
    response = await async_client.get("/api/v1/dispatch/dashboard/stats")
    assert response.status_code == 200
    data = response.json()
    assert "total_parcels" in data
    assert "unassigned_parcels" in data
    assert "active_deliveries" in data
    assert "completed_deliveries" in data
    assert "failed_deliveries" in data

