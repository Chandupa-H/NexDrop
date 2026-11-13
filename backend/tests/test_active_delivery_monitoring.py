import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from app.modules.dispatch.service import DispatchService
from app.modules.dispatch.events import handle_delivery_event
from app.integrations.rabbitmq.client import rabbitmq_client
from app.integrations.websockets.manager import ws_manager


@pytest.mark.asyncio
async def test_get_active_deliveries_endpoint(async_client: AsyncClient):
    """Verify active deliveries endpoint returns valid response structure and counts."""
    response = await async_client.get("/api/v1/dispatch/active-deliveries?limit=10&offset=0")
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert "in_transit_count" in data
    assert "out_for_delivery_count" in data
    assert "picked_up_count" in data
    assert data["limit"] == 10
    assert data["offset"] == 0


@pytest.mark.asyncio
async def test_get_active_deliveries_with_filters(async_client: AsyncClient):
    """Verify active deliveries endpoint works with status and search filters."""
    response = await async_client.get(
        "/api/v1/dispatch/active-deliveries?status=in_transit&city=Colombo&limit=5"
    )
    assert response.status_code == 200
    data = response.json()
    assert data["limit"] == 5


@pytest.mark.asyncio
async def test_update_active_delivery_status_publishes_rabbitmq_event():
    """Verify updating delivery status publishes parcel.status.updated event to RabbitMQ."""
    mock_repo = AsyncMock()
    mock_repo.update_active_delivery_status.return_value = {
        "parcel_id": 42,
        "tracking_number": "NXD-TEST-123",
        "status": "in_transit",
        "delivery_city": "Colombo",
        "courier_id": 7,
        "current_latitude": 6.9271,
        "current_longitude": 79.8612,
        "notes": "En route to recipient",
        "updated_at": "2026-11-12T16:00:00Z",
    }

    service = DispatchService(mock_repo)

    with patch.object(rabbitmq_client, "publish_message", new_callable=AsyncMock) as mock_publish:
        result = await service.update_active_delivery_status(
            parcel_id=42,
            status_value="in_transit",
            current_latitude=6.9271,
            current_longitude=79.8612,
            notes="En route to recipient",
        )

        assert result["parcel_id"] == 42
        assert result["status"] == "in_transit"
        mock_publish.assert_called_once()
        routing_key, payload = mock_publish.call_args[0]
        assert routing_key == "parcel.status.updated"
        assert payload["parcel_id"] == 42
        assert payload["status"] == "in_transit"
        assert payload["current_latitude"] == 6.9271


@pytest.mark.asyncio
async def test_delivery_event_consumer_broadcasts_to_websockets():
    """Verify RabbitMQ consumer consumes events and broadcasts live updates to dashboard WebSockets."""
    test_event = {
        "event": "ParcelStatusUpdated",
        "parcel_id": 99,
        "tracking_number": "NXD-LIVE-99",
        "status": "out_for_delivery",
        "delivery_city": "Kandy",
    }

    with patch.object(ws_manager, "broadcast_to_channel", new_callable=AsyncMock) as mock_broadcast:
        await handle_delivery_event("parcel.status.updated", test_event)

        assert mock_broadcast.call_count == 3
        channels = [call[0][0] for call in mock_broadcast.call_args_list]
        assert "dispatcher" in channels
        assert "deliveries" in channels
        assert "global" in channels

        broadcast_msg = mock_broadcast.call_args_list[0][0][1]
        assert broadcast_msg["type"] == "ACTIVE_DELIVERY_UPDATE"
        assert broadcast_msg["data"]["parcel_id"] == 99
        assert broadcast_msg["data"]["status"] == "out_for_delivery"


@pytest.mark.asyncio
async def test_update_active_delivery_status_not_found(async_client: AsyncClient):
    """Verify updating a non-existent delivery returns 404."""
    response = await async_client.patch(
        "/api/v1/dispatch/active-deliveries/999999/status",
        json={"status": "in_transit", "notes": "Not found test"},
    )
    assert response.status_code == 404

