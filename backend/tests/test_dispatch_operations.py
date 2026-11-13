import pytest
from unittest.mock import AsyncMock, patch
from httpx import AsyncClient
from app.modules.dispatch.models import DispatchAssignment, DispatchStatus
from app.modules.dispatch.schemas import (
    DispatchCreate,
    CourierReassignRequest,
    WarehouseReceiveRequest,
    WarehouseHandoverRequest,
    CourierWorkloadItem,
)
from app.modules.dispatch.service import DispatchService
from app.modules.parcels.models import Parcel, ParcelStatus, CurrentLocationType, DeliveryMethod
from app.modules.couriers.models import Courier
from app.modules.warehouses.models import Warehouse


@pytest.mark.asyncio
async def test_courier_assignment_validates_unavailable_courier():
    """Verify courier assignment raises error when courier is unavailable."""
    mock_repo = AsyncMock()
    mock_repo.get_parcel.return_value = Parcel(
        id=1, tracking_number="ND-1", sender_id=1, recipient_name="A",
        recipient_phone="1", delivery_address="B", delivery_city="C",
        status=ParcelStatus.PENDING
    )
    mock_repo.get_courier.return_value = Courier(
        id=10, user_id=5, vehicle_type="bike", is_available=False
    )

    service = DispatchService(mock_repo)
    with pytest.raises(Exception) as exc:
        await service.assign_parcel(DispatchCreate(parcel_id=1, courier_id=10))
    assert "unavailable" in str(exc.value)


@pytest.mark.asyncio
async def test_courier_assignment_publishes_event():
    """Verify successful assignment publishes CourierAssigned event."""
    mock_repo = AsyncMock()
    mock_repo.session = AsyncMock()
    mock_repo.get_parcel.return_value = Parcel(
        id=1, tracking_number="ND-1", sender_id=1, recipient_name="A",
        recipient_phone="1", delivery_address="B", delivery_city="C",
        status=ParcelStatus.PENDING
    )
    mock_repo.get_courier.return_value = Courier(
        id=10, user_id=5, vehicle_type="bike", is_available=True
    )
    mock_repo.create.side_effect = lambda a: a

    service = DispatchService(mock_repo)

    with patch("app.modules.dispatch.service.rabbitmq_client.publish_message", new_callable=AsyncMock) as mock_pub:
        assignment = await service.assign_parcel(DispatchCreate(parcel_id=1, courier_id=10))
        assert assignment.parcel_id == 1
        assert assignment.courier_id == 10
        mock_pub.assert_called_once()
        routing_key, event_data = mock_pub.call_args[0]
        assert routing_key == "dispatch.courier.assigned"
        assert event_data["event"] == "CourierAssigned"


@pytest.mark.asyncio
async def test_courier_reassignment_publishes_event():
    """Verify reassignment closes prior assignment, creates new, and publishes CourierReassigned."""
    mock_repo = AsyncMock()
    mock_repo.session = AsyncMock()
    existing_assignment = DispatchAssignment(
        id=5, parcel_id=1, courier_id=10, status=DispatchStatus.ASSIGNED
    )
    mock_repo.get_by_id.return_value = existing_assignment
    mock_repo.get_courier.return_value = Courier(
        id=20, user_id=6, vehicle_type="van", is_available=True
    )
    mock_repo.create.side_effect = lambda a: a

    service = DispatchService(mock_repo)

    with patch("app.modules.dispatch.service.rabbitmq_client.publish_message", new_callable=AsyncMock) as mock_pub:
        new_assignment = await service.reassign_courier(
            5, CourierReassignRequest(new_courier_id=20, reason="Breakdown")
        )
        assert existing_assignment.status == DispatchStatus.REJECTED
        assert new_assignment.courier_id == 20
        mock_pub.assert_called_once()
        routing_key, event_data = mock_pub.call_args[0]
        assert routing_key == "dispatch.courier.reassigned"
        assert event_data["event"] == "CourierReassigned"
        assert event_data["previous_courier_id"] == 10
        assert event_data["new_courier_id"] == 20


@pytest.mark.asyncio
async def test_warehouse_receive_parcel_publishes_event():
    """Verify warehouse receipt updates location to warehouse and publishes WarehouseParcelReceived."""
    mock_repo = AsyncMock()
    mock_repo.session = AsyncMock()
    parcel = Parcel(
        id=2, tracking_number="ND-2", sender_id=1, recipient_name="A",
        recipient_phone="1", delivery_address="B", delivery_city="C",
        status=ParcelStatus.PICKED_UP
    )
    mock_repo.get_parcel.return_value = parcel
    mock_repo.get_warehouse.return_value = Warehouse(
        id=3, name="Colombo Hub", address="Pettah", city="Colombo",
        contact_number="123", is_active=True
    )
    mock_repo.get_active_by_parcel.return_value = None

    service = DispatchService(mock_repo)

    with patch("app.modules.dispatch.service.rabbitmq_client.publish_message", new_callable=AsyncMock) as mock_pub:
        result = await service.warehouse_receive_parcel(
            WarehouseReceiveRequest(parcel_id=2, warehouse_id=3, notes="Arrived safely")
        )
        assert result["status"] == "success"
        assert parcel.current_warehouse_id == 3
        assert parcel.delivery_method == DeliveryMethod.VIA_WAREHOUSE
        assert parcel.current_location_type == CurrentLocationType.WAREHOUSE
        mock_pub.assert_called_once()
        routing_key, event_data = mock_pub.call_args[0]
        assert routing_key == "dispatch.warehouse.received"
        assert event_data["event"] == "WarehouseParcelReceived"


@pytest.mark.asyncio
async def test_courier_workload_calculation():
    """Verify workload schema mapping and status computation."""
    mock_repo = AsyncMock()
    mock_repo.get_couriers_workload.return_value = [
        {
            "courier_id": 1,
            "user_id": 101,
            "full_name": "Kamal Perera",
            "vehicle_type": "motorbike",
            "is_available": True,
            "active_assignments": 2,
            "workload_status": "OPTIMAL",
        },
        {
            "courier_id": 2,
            "user_id": 102,
            "full_name": "Sunil Shantha",
            "vehicle_type": "van",
            "is_available": False,
            "active_assignments": 0,
            "workload_status": "UNAVAILABLE",
        },
    ]

    service = DispatchService(mock_repo)
    workload = await service.get_courier_workload()
    assert len(workload) == 2
    assert workload[0].courier_id == 1
    assert workload[0].workload_status == "OPTIMAL"
    assert workload[1].workload_status == "UNAVAILABLE"
