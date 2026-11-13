import pytest
from pydantic import ValidationError
from app.modules.merchants.models import ApprovalStatus
from app.modules.merchants.service import MerchantService
from app.modules.merchants.schemas import (
    MerchantRegisterRequest,
    MerchantOrderCreate,
    MerchantOrderStatusUpdate,
    WebhookConfigUpdate,
)


def run_coro(coro):
    """Helper to run coroutines synchronously without requiring Windows network socketpair."""
    try:
        coro.send(None)
    except StopIteration as exc:
        return exc.value
    raise RuntimeError("Coroutine did not finish synchronously")


def test_merchant_register_request_passwords_match():
    """Verify that matching passwords pass validation."""
    data = {
        "email": "test@merchant.com",
        "full_name": "Test Merchant",
        "password": "Password123",
        "confirm_password": "Password123",
        "business_name": "Acme Retail Ltd",
        "registration_number": "BR12345",
        "contact_phone": "+94771234567",
        "business_address": "123 Galle Road, Colombo",
        "business_type": "retail",
        "website_url": "https://acme.com",
    }
    req = MerchantRegisterRequest(**data)
    assert req.email == "test@merchant.com"
    assert req.business_name == "Acme Retail Ltd"


def test_merchant_register_request_passwords_mismatch():
    """Verify that mismatched passwords raise a ValidationError."""
    data = {
        "email": "test@merchant.com",
        "full_name": "Test Merchant",
        "password": "Password123",
        "confirm_password": "DifferentPassword123",
        "business_name": "Acme Retail Ltd",
        "registration_number": "BR12345",
        "contact_phone": "+94771234567",
        "business_address": "123 Galle Road, Colombo",
    }
    with pytest.raises(ValidationError) as exc_info:
        MerchantRegisterRequest(**data)
    assert "Passwords do not match" in str(exc_info.value)


def test_approval_status_enum():
    """Verify approval status enum values."""
    assert ApprovalStatus.PENDING == "pending"
    assert ApprovalStatus.APPROVED == "approved"
    assert ApprovalStatus.REJECTED == "rejected"


def test_merchant_service_get_orders():
    """Verify listing merchant orders with initial empty state or dynamically created orders."""
    service = MerchantService()
    # Initial state should be empty as mock data was cleared for live testing
    orders = run_coro(service.get_orders("me"))
    assert isinstance(orders, list)


def test_merchant_service_filter_orders():
    """Verify creating and filtering orders by status and keyword search."""
    service = MerchantService()
    # Create test orders
    p1 = MerchantOrderCreate(
        recipientName="Sunil Perera",
        recipientPhone="+94771234567",
        deliveryAddress="12 Main Street, Matara",
        deliveryCity="Matara",
        weightKg=1.0,
        codAmount=2500,
        isPrepaid=False,
    )
    order1 = run_coro(service.create_order("me", p1))
    run_coro(service.update_order_status(order1.id, MerchantOrderStatusUpdate(status="in_transit")))

    in_transit_orders = run_coro(service.get_orders("me", status="in_transit"))
    assert any(o.status == "in_transit" for o in in_transit_orders)

    search_orders = run_coro(service.get_orders("me", search="Matara"))
    assert len(search_orders) > 0
    assert any("Matara" in (o.delivery_address or "") or "Matara" in o.delivery_city for o in search_orders)


def test_merchant_service_create_order():
    """Verify creating a new shipment order."""
    service = MerchantService()
    payload = MerchantOrderCreate(
        recipientName="Ruwan Gunasekara",
        recipientPhone="+94779876543",
        deliveryAddress="50 Dharmapala Mawatha",
        deliveryCity="Colombo 07",
        weightKg=1.8,
        codAmount=5200,
        isPrepaid=False,
        specialInstructions="Call on arrival",
    )
    new_order = run_coro(service.create_order("me", payload))
    assert new_order.tracking_number.startswith("ND-LK-")
    assert new_order.status == "created"
    assert new_order.recipient_name == "Ruwan Gunasekara"
    assert new_order.cod_amount == 5200.0


def test_merchant_service_kpis():
    """Verify KPI calculation invariant."""
    service = MerchantService()
    kpis = run_coro(service.get_kpis("me"))
    all_orders = run_coro(service.get_orders("me"))
    assert kpis.total_orders == len(all_orders)
    assert 0 <= kpis.success_rate <= 100


def test_merchant_service_credentials_and_regeneration():
    """Verify getting credentials and regenerating live API key."""
    service = MerchantService()
    creds = run_coro(service.get_credentials("me"))
    assert creds.merchant_id.startswith("MER-")
    assert creds.live_key.startswith("nd_live_")

    updated = run_coro(service.regenerate_key("me", "live"))
    assert updated.live_key.startswith("nd_live_")
    assert updated.live_key != creds.live_key


def test_merchant_service_webhooks_and_test_ping():
    """Verify webhook config, update, test ping, and log generation."""
    service = MerchantService()
    config = run_coro(service.get_webhook_config("me"))
    assert "https://" in config.target_url

    updated_config = run_coro(
        service.update_webhook_config(
            "me",
            WebhookConfigUpdate(targetUrl="https://example.com/api/webhooks"),
        )
    )
    assert updated_config.target_url == "https://example.com/api/webhooks"

    ping_result = run_coro(service.send_test_webhook("me", "order.delivered"))
    assert ping_result.log.status == 200
    assert ping_result.log.event == "order.delivered"

    logs = run_coro(service.get_webhook_logs("me"))
    assert len(logs) > 0
    assert logs[0].event == "order.delivered"


def test_merchant_registration_and_status_flow():
    """Verify registering a new merchant and checking application status."""
    service = MerchantService()
    reg = MerchantRegisterRequest(
        email="artisan@lanka.com",
        full_name="Nalin Dias",
        password="Password123!",
        confirm_password="Password123!",
        business_name="Lanka Craftworks",
        registration_number="PV-TEST-1002",
        contact_phone="+94771239999",
        business_address="88 Galle Road, Bentota",
        business_type="manufacturer",
    )
    merchant = run_coro(service.register_merchant(reg))
    assert merchant["id"] > 0
    assert merchant["approval_status"] == ApprovalStatus.PENDING

    # Check status
    status_info = run_coro(service.get_merchant_by_identifier(str(merchant["id"])))
    assert status_info is not None
    assert status_info["business_name"] == "Lanka Craftworks"
    assert status_info["approval_status"] == ApprovalStatus.PENDING
