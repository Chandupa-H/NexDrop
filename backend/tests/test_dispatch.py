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


@pytest.mark.asyncio
async def test_get_unassigned_parcels_endpoint(async_client: AsyncClient):
    response = await async_client.get("/api/v1/dispatch/unassigned-parcels?limit=5&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "cities" in data
    assert data["limit"] == 5
    assert data["offset"] == 0


@pytest.mark.asyncio
async def test_get_unassigned_parcel_not_found(async_client: AsyncClient):
    response = await async_client.get("/api/v1/dispatch/unassigned-parcels/999999")
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_dispatch_history_endpoint(async_client: AsyncClient):
    response = await async_client.get("/api/v1/dispatch/history?limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "statuses" in data
    assert "couriers" in data
    assert data["limit"] == 10
    assert data["offset"] == 0
    assert "completed" in data["statuses"]
    assert "rejected" in data["statuses"]


@pytest.mark.asyncio
async def test_get_dispatch_history_with_filters(async_client: AsyncClient):
    # Test completed filter
    resp_completed = await async_client.get("/api/v1/dispatch/history?status=completed")
    assert resp_completed.status_code == 200

    # Test failed filter
    resp_failed = await async_client.get("/api/v1/dispatch/history?status=failed")
    assert resp_failed.status_code == 200

    # Test search query
    resp_search = await async_client.get("/api/v1/dispatch/history?search=Colombo&limit=5")
    assert resp_search.status_code == 200
    assert resp_search.json()["limit"] == 5


@pytest.mark.asyncio
async def test_get_dispatch_history_detail_not_found(async_client: AsyncClient):
    response = await async_client.get("/api/v1/dispatch/history/999999")
    assert response.status_code == 404

