import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_get_pricing_rules(async_client: AsyncClient):
    """Verify GET /api/v1/pricing/rules returns platform rates in Rs."""
    response = await async_client.get("/api/v1/pricing/rules")
    assert response.status_code == 200
    data = response.json()
    assert data["currency_symbol"] == "Rs."
    assert data["currency"] == "LKR"
    assert data["base_fare"] >= 100.0  # In Rs. (default 350.0)
    assert data["per_km_rate"] >= 50.0  # In Rs. (default 120.0)
    assert data["express_surcharge"] >= 100.0  # In Rs. (default 250.0)


@pytest.mark.asyncio
async def test_update_pricing_rules(async_client: AsyncClient):
    """Verify PUT /api/v1/pricing/rules updates rates in Rs."""
    payload = {
        "base_fare": 400.0,
        "per_km_rate": 130.0,
        "express_surcharge": 300.0,
        "peak_surge_max": 1.75,
    }
    response = await async_client.put("/api/v1/pricing/rules", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["base_fare"] == 400.0
    assert data["per_km_rate"] == 130.0
    assert data["express_surcharge"] == 300.0
    assert data["peak_surge_max"] == 1.75
    assert data["currency_symbol"] == "Rs."


@pytest.mark.asyncio
async def test_list_pricing_tiers_in_rs(async_client: AsyncClient):
    """Verify GET /api/v1/pricing/tiers returns tiers in Rs."""
    response = await async_client.get("/api/v1/pricing/tiers")
    assert response.status_code == 200
    tiers = response.json()
    assert len(tiers) >= 1
    standard = tiers[0]
    assert standard["currency"] == "Rs."
    assert standard["base_rate"] > 0
    assert standard["per_km_rate"] > 0


@pytest.mark.asyncio
async def test_calculate_estimate_in_rs(async_client: AsyncClient):
    """Verify POST /api/v1/pricing/estimate computes instant price in Rs."""
    response = await async_client.post(
        "/api/v1/pricing/estimate",
        json={"tier_name": "Standard", "distance_km": 10.0, "weight_kg": 2.0},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["currency"] == "Rs."
    # 350 base + (10 * 120) distance + (2 * 50) weight = 350 + 1200 + 100 = 1650
    assert data["total_price"] > 1000.0
    assert data["distance_cost"] > 0
    assert data["weight_cost"] > 0

