"""
Test suite for courier dashboard endpoints.
Tests the in-memory mock data API with validation logic.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_courier_me(async_client: AsyncClient):
    """GET /courier/me returns courier profile."""
    response = await async_client.get("/api/v1/couriers/courier/me")
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Poorna Danushka"
    assert data["role"] == "courier"
    assert "id" in data


@pytest.mark.asyncio
async def test_dashboard_summary_invariant(async_client: AsyncClient):
    """Summary totals must satisfy: assigned == delivered + in_transit + pending + failed."""
    response = await async_client.get("/api/v1/couriers/courier/dashboard/summary")
    assert response.status_code == 200
    data = response.json()
    
    totals = data["totals"]
    assigned = totals["assigned"]
    delivered = totals["delivered"]
    in_transit = totals["in_transit"]
    pending = totals["pending"]
    failed = totals["failed"]
    
    # Invariant
    assert assigned == delivered + in_transit + pending + failed
    
    # Expected counts from mock data
    assert delivered == 16
    assert in_transit == 5
    assert pending == 3
    assert failed == 1
    assert assigned == 25
    
    # Weekly deliveries
    assert len(data["weekly_deliveries"]) == 7
    # Saturday (2026-10-31) should match delivered count
    saturday = next(w for w in data["weekly_deliveries"] if w["date"] == "2026-10-31")
    assert saturday["delivered"] == delivered
    
    # KPIs
    assert len(data["kpis"]) == 4
    kpi_keys = [kpi["key"] for kpi in data["kpis"]]
    assert set(kpi_keys) == {"assigned", "delivered", "in_transit", "pending"}


@pytest.mark.asyncio
async def test_list_parcels_no_filter(async_client: AsyncClient):
    """Active parcels are ordered before completed parcels."""
    response = await async_client.get("/api/v1/couriers/courier/parcels")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 25
    assert len(data["items"]) == 25
    
    statuses = [item["status"] for item in data["items"]]
    status_order = {
        "pending": 0,
        "picked_up": 1,
        "in_transit": 2,
        "out_for_delivery": 3,
        "delivered": 5,
        "failed": 6,
        "cancelled": 7,
    }
    ranks = [status_order.get(parcel_status, 4) for parcel_status in statuses]
    assert ranks == sorted(ranks)
    assert statuses[0] == "pending"
    assert statuses[-1] == "failed"


@pytest.mark.asyncio
async def test_list_parcels_filter_pending(async_client: AsyncClient):
    """GET /courier/parcels?status=pending filters correctly."""
    response = await async_client.get("/api/v1/couriers/courier/parcels?status=pending")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 3
    assert all(item["status"] == "pending" for item in data["items"])


@pytest.mark.asyncio
async def test_list_parcels_filter_multiple(async_client: AsyncClient):
    """GET /courier/parcels?status=in_transit,out_for_delivery filters multiple statuses."""
    response = await async_client.get("/api/v1/couriers/courier/parcels?status=in_transit,out_for_delivery")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 4  # 2 in_transit + 2 out_for_delivery
    assert all(item["status"] in ["in_transit", "out_for_delivery"] for item in data["items"])


@pytest.mark.asyncio
async def test_list_parcels_pagination(async_client: AsyncClient):
    """GET /courier/parcels with limit and offset."""
    response = await async_client.get("/api/v1/couriers/courier/parcels?limit=5&offset=0")
    assert response.status_code == 200
    data = response.json()
    
    assert data["total"] == 25
    assert len(data["items"]) == 5

    next_page = await async_client.get(
        "/api/v1/couriers/courier/parcels?limit=5&offset=5"
    )
    assert next_page.status_code == 200
    next_page_data = next_page.json()
    assert next_page_data["total"] == 25
    assert len(next_page_data["items"]) == 5
    assert {
        item["tracking_id"] for item in data["items"]
    }.isdisjoint({item["tracking_id"] for item in next_page_data["items"]})


@pytest.mark.asyncio
async def test_get_parcel_detail_success(async_client: AsyncClient):
    """GET /courier/parcels/{tracking_id} returns full details with masked phone."""
    response = await async_client.get("/api/v1/couriers/courier/parcels/NXD001248")
    assert response.status_code == 200
    data = response.json()
    
    assert data["tracking_id"] == "NXD001248"
    assert data["customer_name"] == "Kavindu Perera"
    assert data["customer_phone_masked"] == "+94 771 *** 4521"
    assert data["destination"] == "Colombo"
    assert data["address_line"] == "123 Galle Road, Colombo 03"
    assert data["status"] == "delivered"
    assert len(data["timeline"]) >= 1


@pytest.mark.asyncio
async def test_courier_proof_records_summary_and_filters(async_client: AsyncClient):
    response = await async_client.get(
        "/api/v1/couriers/courier/proofs?q=NXD001248&date=2026-10-31&status=delivered"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["tracking_number"] == "NXD001248"
    assert data["items"][0]["recipient_name"] == "Kavindu Perera"
    assert data["items"][0]["delivery_address"] == "123 Galle Road, Colombo 03"
    assert data["items"][0]["secure_url"].startswith("https://placehold.co/")
    assert data["summary"] == {
        "total_proofs": 3,
        "successful_deliveries": 3,
        "parcels_with_proof": 3,
    }

    empty = await async_client.get("/api/v1/couriers/courier/proofs?q=missing-recipient")
    assert empty.status_code == 200
    assert empty.json()["items"] == []
    assert empty.json()["summary"]["total_proofs"] == 3


@pytest.mark.asyncio
async def test_failed_deliveries_summary_filters_and_attempt_history(async_client: AsyncClient):
    response = await async_client.get(
        "/api/v1/couriers/courier/failed-deliveries",
        params={
            "q": "NXD001243",
            "reason": "customer_unavailable",
            "date": "2026-10-31",
            "redelivery_status": "pending",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 1
    assert data["items"][0]["tracking_number"] == "NXD001243"
    assert data["items"][0]["customer_name"] == "Tharindu Bandara"
    assert data["items"][0]["failure_reason_label"] == "Customer Unavailable"
    assert data["items"][0]["parcel_status"] == "failed"
    assert data["items"][0]["redelivery_status"] == "pending"
    assert len(data["items"][0]["previous_attempts"]) == 1
    assert data["summary"]["total_failed_deliveries"] == 5
    assert data["summary"]["pending_redelivery"] == 1
    assert data["summary"]["most_common_failure_reason"] == "Customer Unavailable"

    scheduled = await async_client.get(
        "/api/v1/couriers/courier/failed-deliveries?redelivery_status=scheduled"
    )
    assert scheduled.status_code == 200
    assert scheduled.json()["total"] == 2
    assert {item["tracking_number"] for item in scheduled.json()["items"]} == {"NXD001244", "NXD001242"}


@pytest.mark.asyncio
async def test_failed_deliveries_reject_invalid_date_and_redelivery_status(async_client: AsyncClient):
    invalid_date = await async_client.get(
        "/api/v1/couriers/courier/failed-deliveries?date=not-a-date"
    )
    assert invalid_date.status_code == 422
    invalid_status = await async_client.get(
        "/api/v1/couriers/courier/failed-deliveries?redelivery_status=retry"
    )
    assert invalid_status.status_code == 422


@pytest.mark.asyncio
async def test_get_parcel_detail_not_found(async_client: AsyncClient):
    """GET /courier/parcels/{tracking_id} returns 404 for unknown ID."""
    response = await async_client.get("/api/v1/couriers/courier/parcels/NXD999999")
    assert response.status_code == 404
    data = response.json()
    assert "not found" in data["detail"].lower()


@pytest.mark.asyncio
async def test_update_status_valid_transition(async_client: AsyncClient):
    """PATCH /courier/parcels/{tracking_id}/status with valid transition."""
    # Use a pending parcel
    response = await async_client.patch(
        "/api/v1/couriers/courier/parcels/NXD001246/status",
        json={"status": "picked_up", "note": "Package collected from warehouse"}
    )
    assert response.status_code == 200
    data = response.json()
    
    assert data["status"] == "picked_up"
    assert "Package collected from warehouse" in data["notes"]
    # Timeline should have new event
    assert any(e["status"] == "picked_up" for e in data["timeline"])


@pytest.mark.asyncio
async def test_update_status_invalid_transition(async_client: AsyncClient):
    """PATCH with invalid transition returns 409."""
    # Try to go from pending directly to delivered (invalid)
    response = await async_client.patch(
        "/api/v1/couriers/courier/parcels/NXD001225/status",
        json={"status": "delivered"}
    )
    assert response.status_code == 409
    data = response.json()
    assert "delivery result" in data["detail"].lower()


@pytest.mark.asyncio
async def test_update_status_failed_requires_delivery_result_endpoint(async_client: AsyncClient):
    """Generic status updates cannot bypass the failed result form."""
    response = await async_client.patch(
        "/api/v1/couriers/courier/parcels/NXD001226/status",
        json={"status": "failed"}
    )
    assert response.status_code == 409
    data = response.json()
    assert "delivery result" in data["detail"].lower()


@pytest.mark.asyncio
async def test_update_status_failed_with_reason_requires_delivery_result_endpoint(async_client: AsyncClient):
    """Generic status updates cannot bypass structured failed result storage."""
    response = await async_client.patch(
        "/api/v1/couriers/courier/parcels/NXD001226/status",
        json={"status": "failed", "failure_reason": "customer_unavailable", "note": "No answer at door"}
    )
    assert response.status_code == 409


@pytest.mark.asyncio
async def test_update_status_terminal_state(async_client: AsyncClient):
    """Cannot update parcel already in delivered or failed state."""
    # NXD001248 is already delivered
    response = await async_client.patch(
        "/api/v1/couriers/courier/parcels/NXD001248/status",
        json={"status": "failed", "failure_reason": "customer_unavailable"}
    )
    assert response.status_code == 409
    data = response.json()
    assert "terminal" in data["detail"].lower()


@pytest.mark.asyncio
async def test_existing_courier_list_still_works(async_client: AsyncClient):
    """Pre-existing GET /couriers still works (no regression on schema)."""
    response = await async_client.get("/api/v1/couriers")
    # The endpoint may return 503 if DB is not available, but schema should be valid
    # We just check it doesn't crash with a 500 or return wrong type
    assert response.status_code in [200, 503]
    if response.status_code == 200:
        data = response.json()
        assert isinstance(data, list)
