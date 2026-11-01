"""
Test suite for customer dashboard endpoints.
Tests the mock customer data API with invariant validation and parcel lifecycle rules.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_customer_me(async_client: AsyncClient):
    """GET /customers/customer/me returns customer profile."""
    response = await async_client.get("/api/v1/customers/customer/me")
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Kavindu Sandaruwan"
    assert data["role"] == "customer"
    assert "email" in data
    assert "default_address" in data


@pytest.mark.asyncio
async def test_customer_dashboard_summary_invariant(async_client: AsyncClient):
    """
    Summary totals must satisfy:
    total_orders == active_deliveries + delivered + pending + cancelled
    """
    response = await async_client.get("/api/v1/customers/customer/dashboard/summary")
    assert response.status_code == 200
    data = response.json()

    totals = data["totals"]
    total_orders = totals["total_orders"]
    active_deliveries = totals["active_deliveries"]
    delivered = totals["delivered"]
    pending = totals["pending"]
    cancelled = totals["cancelled"]

    # Invariant
    assert total_orders == active_deliveries + delivered + pending + cancelled

    # KPIs check
    assert len(data["kpis"]) == 4
    kpi_keys = [k["key"] for k in data["kpis"]]
    assert set(kpi_keys) == {"active_deliveries", "delivered", "pending", "total_orders"}

    # Weekly orders
    assert len(data["weekly_orders"]) == 7


@pytest.mark.asyncio
async def test_list_customer_parcels(async_client: AsyncClient):
    """GET /customers/customer/parcels returns customer parcels."""
    response = await async_client.get("/api/v1/customers/customer/parcels")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] >= 1
    assert len(data["items"]) == data["total"]


@pytest.mark.asyncio
async def test_get_customer_parcel_detail(async_client: AsyncClient):
    """GET /customers/customer/parcels/{tracking_id} returns full parcel details with masked phone."""
    response = await async_client.get("/api/v1/customers/customer/parcels/NXD-CUS-101")
    assert response.status_code == 200
    data = response.json()
    assert data["tracking_id"] == "NXD-CUS-101"
    assert "***" in data["recipient_phone_masked"]
    assert len(data["timeline"]) > 0


@pytest.mark.asyncio
async def test_cancel_non_pending_parcel_conflict(async_client: AsyncClient):
    """Cancelling a non-pending parcel should return 409 Conflict."""
    response = await async_client.post(
        "/api/v1/customers/customer/parcels/NXD-CUS-101/cancel",
        json={"reason": "Test cancel non-pending"},
    )
    assert response.status_code == 409
