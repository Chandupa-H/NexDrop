"""
Test suite for customer dashboard endpoints.
Tests the customer data API with invariant validation and parcel lifecycle rules.
"""

import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_customer_me(async_client: AsyncClient):
    """GET /customers/customer/me returns customer profile."""
    response = await async_client.get("/api/v1/customers/customer/me")
    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "Dihini Kankanamage"
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
    assert data["total"] >= 0
    assert len(data["items"]) == data["total"]


@pytest.mark.asyncio
async def test_create_and_get_customer_parcel_detail(async_client: AsyncClient):
    """POST /customers/customer/parcels creates a shipment, then GET detail verifies masked phone."""
    create_res = await async_client.post(
        "/api/v1/customers/customer/parcels",
        json={
            "recipient_name": "Test Recipient",
            "recipient_phone": "+94771234567",
            "delivery_address": "123 Main St",
            "delivery_city": "Kandy",
            "weight_kg": 1.5,
            "fee": 450.0,
        },
    )
    assert create_res.status_code == 201
    created = create_res.json()
    tracking_id = created["tracking_id"]
    assert created["status"] == "pending"

    # Detail check
    response = await async_client.get(f"/api/v1/customers/customer/parcels/{tracking_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["tracking_id"] == tracking_id
    assert "***" in data["recipient_phone_masked"]
    assert len(data["timeline"]) > 0


@pytest.mark.asyncio
async def test_cancel_pending_parcel(async_client: AsyncClient):
    """Cancelling a pending parcel should succeed."""
    create_res = await async_client.post(
        "/api/v1/customers/customer/parcels",
        json={
            "recipient_name": "Cancel Test",
            "recipient_phone": "+94779998877",
            "delivery_address": "45 Lake Road",
            "delivery_city": "Colombo",
            "weight_kg": 1.0,
            "fee": 350.0,
        },
    )
    assert create_res.status_code == 201
    tracking_id = create_res.json()["tracking_id"]

    cancel_res = await async_client.post(
        f"/api/v1/customers/customer/parcels/{tracking_id}/cancel",
        json={"reason": "Customer changed mind"},
    )
    assert cancel_res.status_code == 200
    cancelled_data = cancel_res.json()
    assert cancelled_data["status"] == "cancelled"

    # Cancelling again should return 409 Conflict
    conflict_res = await async_client.post(
        f"/api/v1/customers/customer/parcels/{tracking_id}/cancel",
        json={"reason": "Already cancelled"},
    )
    assert conflict_res.status_code == 409


@pytest.mark.asyncio
async def test_customer_addresses_crud(async_client: AsyncClient):
    """Test saved addresses list, create, update, default, and delete."""
    # 1. List addresses
    res = await async_client.get("/api/v1/customers/customer/addresses")
    assert res.status_code == 200
    addresses = res.json()
    assert isinstance(addresses, list)
    initial_count = len(addresses)

    # 2. Filter by type
    pickup_res = await async_client.get("/api/v1/customers/customer/addresses?type=pickup")
    assert pickup_res.status_code == 200
    assert all(a["address_type"] == "pickup" for a in pickup_res.json())

    # 3. Create address
    new_payload = {
        "address_type": "dropoff",
        "label": "Other",
        "custom_name": "Test Dropoff Location",
        "address": "99 Galle Road",
        "city": "Colombo 03",
        "postal_code": "00300",
        "contact_name": "Jane Doe",
        "phone": "+94 71 234 5678",
        "is_default": False,
    }
    create_res = await async_client.post(
        "/api/v1/customers/customer/addresses",
        json=new_payload,
    )
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["label"] == "Other"
    assert created["custom_name"] == "Test Dropoff Location"
    addr_id = created["id"]

    # 4. Set as default
    default_res = await async_client.patch(f"/api/v1/customers/customer/addresses/{addr_id}/default")
    assert default_res.status_code == 200
    assert default_res.json()["is_default"] is True

    # 5. Delete address
    del_res = await async_client.delete(f"/api/v1/customers/customer/addresses/{addr_id}")
    assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_track_parcel_nxd_cus_101_full_lifecycle(async_client: AsyncClient):
    """
    GET /customers/customer/parcels/NXD-CUS-101 returns complete delivered details:
    - Status: delivered
    - ETA: 2026-11-08T16:00:00Z
    - Weight: 1.5 kg
    - Dimensions: 25x20x10 cm
    - Masked phone
    - All 5 chronological milestone timeline events (Order Created -> Picked Up -> In Transit -> Out for Delivery -> Delivered)
    """
    res = await async_client.get("/api/v1/customers/customer/parcels/NXD-CUS-101")
    assert res.status_code == 200
    data = res.json()

    assert data["tracking_id"] == "NXD-CUS-101"
    assert data["status"] == "delivered"
    assert data["recipient_name"] == "Kasun Perera"
    assert data["delivery_city"] == "Kandy"
    assert data["weight_kg"] == 1.5
    assert data["fee"] == 650.0
    assert data["dimensions"] == "25x20x10 cm"
    assert data["eta"] == "2026-11-08T16:00:00Z"
    assert "***" in data["recipient_phone_masked"]

    timeline = data["timeline"]
    assert len(timeline) == 5
    statuses = [e["status"] for e in timeline]
    assert statuses == ["pending", "picked_up", "in_transit", "out_for_delivery", "delivered"]
    assert timeline[0]["label"] == "Order Created"
    assert timeline[1]["label"] == "Picked Up by Courier"
    assert timeline[2]["label"] == "Sorted at Central Hub"
    assert timeline[3]["label"] == "Out for Delivery"
    assert timeline[4]["label"] == "Delivered & Signed"
    assert all(e["location"] for e in timeline)


@pytest.mark.asyncio
async def test_track_parcel_cross_role_courier_update(async_client: AsyncClient):
    """
    Verify real-time cross-role integration:
    When a status update occurs for a parcel,
    the customer tracking endpoint immediately reflects the updated status and new timeline event.
    """
    create_res = await async_client.post(
        "/api/v1/customers/customer/parcels",
        json={
            "recipient_name": "Cross Role Recipient",
            "recipient_phone": "+94770001122",
            "delivery_address": "88 Galle Road",
            "delivery_city": "Galle",
            "weight_kg": 1.2,
            "fee": 420.0,
        },
    )
    assert create_res.status_code == 201
    tracking_id = create_res.json()["tracking_id"]

    # 1. Update from pending to picked_up
    patch_res = await async_client.patch(
        f"/api/v1/customers/customer/parcels/{tracking_id}/status",
        json={"status": "picked_up", "note": "Courier scan at collection", "location": "Colombo Collection Hub"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "picked_up"

    # 2. Customer tracks the parcel
    cust_res = await async_client.get(f"/api/v1/customers/customer/parcels/{tracking_id}")
    assert cust_res.status_code == 200
    cust_data = cust_res.json()

    assert cust_data["tracking_id"] == tracking_id
    assert cust_data["status"] == "picked_up"
    assert any(e["status"] == "picked_up" for e in cust_data["timeline"])
    assert "Courier scan at collection" in cust_data["notes"]


@pytest.mark.asyncio
async def test_customer_full_lifecycle_booking_to_delivery_receipt(async_client: AsyncClient):
    """
    Full end-to-end customer flow verification:
    1. Book delivery (status: pending, generates tracking ID and passcode).
    2. Progress through intermediate states: picked_up -> in_transit -> out_for_delivery -> delivered.
    3. Verify delivered parcel has confirmed delivery date, verified passcode, and full timeline.
    """
    create_res = await async_client.post(
        "/api/v1/customers/customer/parcels",
        json={
            "recipient_name": "Full Flow Recipient",
            "recipient_phone": "+94778881234",
            "delivery_address": "55 Lake Crescent",
            "delivery_city": "Kandy",
            "weight_kg": 2.0,
            "fee": 550.0,
        },
    )
    assert create_res.status_code == 201
    created = create_res.json()
    tracking_id = created["tracking_id"]
    assert created["status"] == "pending"
    assert len(created["delivery_passcode"]) == 6

    # Intermediate 1: Picked Up
    res_picked = await async_client.patch(
        f"/api/v1/customers/customer/parcels/{tracking_id}/status",
        json={"status": "picked_up", "note": "Collected from sender home", "location": "Colombo 07"},
    )
    assert res_picked.status_code == 200
    assert res_picked.json()["status"] == "picked_up"

    # Intermediate 2: In Transit
    res_transit = await async_client.patch(
        f"/api/v1/customers/customer/parcels/{tracking_id}/status",
        json={"status": "in_transit", "note": "Sorted at Central Hub", "location": "Peliyagoda Central Hub"},
    )
    assert res_transit.status_code == 200
    assert res_transit.json()["status"] == "in_transit"

    # Intermediate 3: Out for Delivery
    res_out = await async_client.patch(
        f"/api/v1/customers/customer/parcels/{tracking_id}/status",
        json={"status": "out_for_delivery", "note": "Assigned to Kandy courier", "location": "Kandy Dispatch Station"},
    )
    assert res_out.status_code == 200
    assert res_out.json()["status"] == "out_for_delivery"

    # Terminal: Delivered
    res_delivered = await async_client.patch(
        f"/api/v1/customers/customer/parcels/{tracking_id}/status",
        json={"status": "delivered", "note": "Handover OTP verified and signed", "location": "55 Lake Crescent, Kandy"},
    )
    assert res_delivered.status_code == 200
    delivered_data = res_delivered.json()
    assert delivered_data["status"] == "delivered"
    assert delivered_data["delivered_at"] is not None
    assert delivered_data["delivery_passcode_verified"] is True
    assert len(delivered_data["timeline"]) >= 5


