import pytest
from uuid import UUID
from pydantic import ValidationError
from app.modules.merchants import service as merchant_service_module
from app.modules.merchants.models import ApprovalStatus, Merchant
from app.modules.merchants.service import MerchantService
from app.modules.merchants.schemas import (
    MerchantRegisterRequest,
    MerchantOrderCreate,
    MerchantOrderStatusUpdate,
)
from app.modules.users.models import User, UserRole


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


class RegistrationSession:
    def __init__(self, users=None, merchants=None):
        self.users = list(users or [])
        self.merchants = list(merchants or [])

    def add(self, instance):
        records = self.users if isinstance(instance, User) else self.merchants
        if instance not in records:
            records.append(instance)

    async def flush(self):
        for index, user in enumerate(self.users, start=1):
            if user.id is None:
                user.id = index
        for index, merchant in enumerate(self.merchants, start=1):
            if merchant.id is None:
                merchant.id = index

    async def refresh(self, _instance):
        return None


class RegistrationUserRepository:
    def __init__(self, session):
        self.session = session

    async def get_by_supabase_user_id(self, subject, *, for_update=False):
        return next((user for user in self.session.users if user.supabase_user_id == subject), None)

    async def list_by_normalized_email(self, email):
        return [
            user for user in self.session.users
            if user.email.strip().lower() == email.strip().lower()
        ]


class RegistrationMerchantRepository:
    def __init__(self, session):
        self.session = session

    async def get_by_user_id(self, user_id):
        return next((merchant for merchant in self.session.merchants if merchant.user_id == user_id), None)

    async def get_by_registration_number(self, registration_number):
        return next(
            (merchant for merchant in self.session.merchants
             if merchant.registration_number == registration_number),
            None,
        )


def registration_payload(**updates):
    values = {
        "email": "artisan@lanka.com",
        "full_name": "Nalin Dias",
        "business_name": "Lanka Craftworks",
        "registration_number": "PV-TEST-1002",
        "contact_phone": "+94771239999",
        "business_address": "88 Galle Road, Bentota",
        "business_type": "manufacturer",
    }
    values.update(updates)
    return MerchantRegisterRequest(**values)


@pytest.fixture
def registration_service(monkeypatch):
    session = RegistrationSession()
    monkeypatch.setattr(merchant_service_module, "UserRepository", RegistrationUserRepository)
    repository = RegistrationMerchantRepository(session)
    return MerchantService(repository), session


@pytest.mark.asyncio
async def test_merchant_registration_creates_subject_mapped_pending_application(registration_service):
    service, session = registration_service
    subject = UUID("f0f9b33e-2c2d-4c46-9e2f-a659819f5901")

    merchant = await service.register_merchant(
        registration_payload(),
        supabase_user_id=subject,
        authenticated_email="artisan@lanka.com",
    )

    assert merchant.approval_status == ApprovalStatus.PENDING
    assert len(session.users) == len(session.merchants) == 1
    assert session.users[0].supabase_user_id == subject
    assert session.users[0].role == UserRole.MERCHANT
    assert session.users[0].is_active is False
    assert merchant.user_id == session.users[0].id


@pytest.mark.asyncio
async def test_merchant_registration_retry_is_idempotent(registration_service):
    service, session = registration_service
    subject = UUID("f0f9b33e-2c2d-4c46-9e2f-a659819f5901")
    payload = registration_payload()

    original = await service.register_merchant(
        payload,
        supabase_user_id=subject,
        authenticated_email="artisan@lanka.com",
    )
    retry = await service.register_merchant(
        payload,
        supabase_user_id=subject,
        authenticated_email="artisan@lanka.com",
    )

    assert retry is original
    assert len(session.users) == len(session.merchants) == 1


@pytest.mark.asyncio
async def test_merchant_registration_rejects_a_different_second_application(
    registration_service,
):
    service, session = registration_service
    subject = UUID("f0f9b33e-2c2d-4c46-9e2f-a659819f5901")
    await service.register_merchant(
        registration_payload(),
        supabase_user_id=subject,
        authenticated_email="artisan@lanka.com",
    )

    with pytest.raises(ValueError, match="application already exists"):
        await service.register_merchant(
            registration_payload(business_name="Different Business"),
            supabase_user_id=subject,
            authenticated_email="artisan@lanka.com",
        )

    assert len(session.users) == len(session.merchants) == 1


@pytest.mark.asyncio
async def test_merchant_registration_only_links_verified_imported_unassigned_user(
    registration_service,
):
    service, session = registration_service
    existing_user = User(
        id=19,
        email="artisan@lanka.com",
        full_name="Nalin Dias",
        hashed_password="supabase-managed:previous-import",
        role=UserRole.UNASSIGNED,
        is_active=True,
    )
    session.users.append(existing_user)
    subject = UUID("f0f9b33e-2c2d-4c46-9e2f-a659819f5901")

    merchant = await service.register_merchant(
        registration_payload(),
        supabase_user_id=subject,
        authenticated_email="artisan@lanka.com",
    )

    assert len(session.users) == 1
    assert existing_user.supabase_user_id == subject
    assert existing_user.role == UserRole.MERCHANT
    assert existing_user.is_active is False
    assert merchant.user_id == existing_user.id


@pytest.mark.asyncio
async def test_merchant_registration_rejects_unmanaged_unassigned_email_match(
    registration_service,
):
    service, session = registration_service
    existing_user = User(
        id=19,
        email="artisan@lanka.com",
        full_name="Nalin Dias",
        hashed_password="not-a-supabase-import",
        role=UserRole.UNASSIGNED,
        is_active=True,
    )
    session.users.append(existing_user)

    with pytest.raises(ValueError, match="different or unmanaged"):
        await service.register_merchant(
            registration_payload(),
            supabase_user_id=UUID("f0f9b33e-2c2d-4c46-9e2f-a659819f5901"),
            authenticated_email="artisan@lanka.com",
        )

    assert existing_user.supabase_user_id is None
    assert not session.merchants


@pytest.mark.asyncio
async def test_merchant_registration_rejects_email_mismatch(registration_service):
    service, session = registration_service

    with pytest.raises(ValueError, match="must match"):
        await service.register_merchant(
            registration_payload(email="other@lanka.com"),
            supabase_user_id=UUID("f0f9b33e-2c2d-4c46-9e2f-a659819f5901"),
            authenticated_email="artisan@lanka.com",
        )

    assert not session.users
    assert not session.merchants
