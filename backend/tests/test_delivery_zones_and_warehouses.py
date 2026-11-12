import pytest
from httpx import AsyncClient
from app.modules.zones.models import DeliveryZone
from app.modules.zones.schemas import DeliveryZoneCreate, DeliveryZoneResponse
from app.modules.warehouses.models import Warehouse
from app.modules.warehouses.schemas import WarehouseCreate, WarehouseResponse
from app.modules.parcels.models import (
    Parcel,
    ParcelStatus,
    DeliveryMethod,
    CurrentLocationType,
)
from app.modules.parcels.schemas import (
    ParcelCreate,
    ParcelResponse,
    ParcelStatusUpdate,
)


def test_delivery_zone_model_and_schema():
    """Verify DeliveryZone schema and model defaults."""
    payload = {
        "name": "Zone A - Colombo Central",
        "code": "ZONE-A",
        "description": "Commercial heart of Colombo",
        "postcodes": ["Colombo 01", "Colombo 02", "Colombo 03"],
        "is_active": True,
    }
    schema = DeliveryZoneCreate(**payload)
    assert schema.name == "Zone A - Colombo Central"
    assert schema.code == "ZONE-A"
    assert len(schema.postcodes) == 3

    zone = DeliveryZone(
        name=schema.name,
        code=schema.code,
        description=schema.description,
        postcodes=schema.postcodes,
        is_active=schema.is_active,
    )
    assert zone.name == "Zone A - Colombo Central"
    assert zone.code == "ZONE-A"
    assert zone.is_active is True
    assert "Colombo 01" in zone.postcodes


def test_warehouse_model_and_schema():
    """Verify Warehouse schema and model defaults."""
    payload = {
        "name": "Central Colombo Hub",
        "address": "45/2 Reclamation Road, Pettah",
        "city": "Colombo",
        "contact_number": "+94112345678",
        "is_active": True,
    }
    schema = WarehouseCreate(**payload)
    assert schema.name == "Central Colombo Hub"
    assert schema.city == "Colombo"

    warehouse = Warehouse(
        name=schema.name,
        address=schema.address,
        city=schema.city,
        contact_number=schema.contact_number,
        is_active=schema.is_active,
    )
    assert warehouse.name == "Central Colombo Hub"
    assert warehouse.contact_number == "+94112345678"
    assert warehouse.is_active is True


def test_parcel_model_warehouse_extensions():
    """Verify Parcel model supports delivery_method, current_location_type, and current_warehouse_id."""
    parcel = Parcel(
        tracking_number="ND-TEST1234",
        sender_id=1,
        recipient_name="John Doe",
        recipient_phone="+94771234567",
        delivery_address="123 Main St",
        delivery_city="Colombo",
        weight_kg=2.5,
        status=ParcelStatus.PENDING,
        delivery_method=DeliveryMethod.VIA_WAREHOUSE,
        current_location_type=CurrentLocationType.WAREHOUSE,
        current_warehouse_id=1,
    )
    assert parcel.delivery_method == DeliveryMethod.VIA_WAREHOUSE
    assert parcel.current_location_type == CurrentLocationType.WAREHOUSE
    assert parcel.current_warehouse_id == 1


def test_parcel_create_default_values():
    """Verify default values preserve existing parcel functionality."""
    payload = {
        "sender_id": 1,
        "recipient_name": "Jane Doe",
        "recipient_phone": "+94779876543",
        "delivery_address": "456 High St",
        "delivery_city": "Kandy",
    }
    schema = ParcelCreate(**payload)
    # Check that defaults exist and match expectations
    assert schema.delivery_method == DeliveryMethod.DIRECT
    assert schema.current_location_type == CurrentLocationType.SENDER
    assert schema.current_warehouse_id is None


def test_parcel_schema_serialization():
    """Verify ParcelCreate and ParcelResponse handle warehouse delivery fields."""
    create_payload = {
        "sender_id": 10,
        "recipient_name": "Alice Silva",
        "recipient_phone": "+94771112233",
        "delivery_address": "78 Galle Face Terrace",
        "delivery_city": "Colombo",
        "weight_kg": 1.5,
        "delivery_method": DeliveryMethod.VIA_WAREHOUSE,
        "current_location_type": CurrentLocationType.WAREHOUSE,
        "current_warehouse_id": 2,
    }
    schema = ParcelCreate(**create_payload)
    assert schema.delivery_method == DeliveryMethod.VIA_WAREHOUSE
    assert schema.current_location_type == CurrentLocationType.WAREHOUSE
    assert schema.current_warehouse_id == 2


@pytest.mark.asyncio
async def test_zones_api_validation(async_client: AsyncClient):
    """Submitting an invalid zone creation payload returns 422."""
    response = await async_client.post(
        "/api/v1/zones",
        json={"name": "Incomplete Zone"},  # missing code
    )
    assert response.status_code == 422


@pytest.mark.asyncio
async def test_warehouses_api_validation(async_client: AsyncClient):
    """Submitting an invalid warehouse creation payload returns 422."""
    response = await async_client.post(
        "/api/v1/warehouses",
        json={"name": "Incomplete Warehouse"},  # missing address, city, contact_number
    )
    assert response.status_code == 422
