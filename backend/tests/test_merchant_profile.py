from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.db.session import get_db
from app.modules.auth.dependencies import get_authenticated_merchant_profile
from app.main import app
from app.modules.merchants.models import ApprovalStatus
from app.modules.merchants import routes
from app.modules.users.models import User
from fastapi import HTTPException


@pytest.fixture
def merchant_profile_dependencies():
    user = SimpleNamespace(
        id=27,
        email="merchant@example.com",
        full_name="Merchant Owner",
        contact_phone="+94 77 123 4567",
        is_active=True,
        created_at=datetime(2026, 1, 15, tzinfo=timezone.utc),
    )
    merchant = SimpleNamespace(
        id=42,
        user_id=user.id,
        business_name="Ceylon Crafts",
        registration_number="PV12984-2024",
        contact_phone="+94 71 123 4567",
        business_address="45 Galle Road, Colombo",
        business_type="retail",
        website_url="https://ceylon.example.com",
        approval_status=ApprovalStatus.APPROVED,
        rejection_reason=None,
        created_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
    )

    class ProfileSession:
        async def get(self, model, object_id):
            return user if model is User and object_id == user.id else None

        async def commit(self):
            pass

        async def refresh(self, instance):
            assert instance in (user, merchant)

    session = ProfileSession()

    async def override_db():
        yield session

    original_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_authenticated_merchant_profile] = lambda: merchant
    app.dependency_overrides[get_db] = override_db
    try:
        yield user, merchant
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(original_overrides)


@pytest.mark.asyncio
async def test_profile_get_and_patch_read_and_update_authenticated_merchant(
    merchant_profile_dependencies,
):
    user, merchant = merchant_profile_dependencies
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        initial = await client.get("/api/v1/merchants/me/profile")
        assert initial.status_code == 200
        assert initial.json() == {
            "id": 42,
            "full_name": "Merchant Owner",
            "email": "merchant@example.com",
            "contact_phone": "+94 77 123 4567",
            "business_name": "Ceylon Crafts",
            "registration_number": "PV12984-2024",
            "business_contact_phone": "+94 71 123 4567",
            "business_address": "45 Galle Road, Colombo",
            "business_type": "retail",
            "website_url": "https://ceylon.example.com",
            "approval_status": "approved",
            "rejection_reason": None,
            "joined_date": "2026-02-01",
        }

        updated = await client.patch(
            "/api/v1/merchants/me/profile",
            json={
                "full_name": "Updated Merchant",
                "contact_phone": "+94 76 555 1234",
                "business_name": "Ceylon Craftworks",
                "business_contact_phone": "+94 71 555 9876",
                "business_address": "12 Main Street, Kandy",
                "business_type": "manufacturing",
                "website_url": "https://crafts.example.com",
            },
        )

    assert updated.status_code == 200
    assert updated.json()["full_name"] == "Updated Merchant"
    assert updated.json()["business_name"] == "Ceylon Craftworks"
    assert updated.json()["business_contact_phone"] == "+94 71 555 9876"
    assert user.full_name == "Updated Merchant"
    assert merchant.business_name == "Ceylon Craftworks"


@pytest.mark.asyncio
async def test_profile_requires_authenticated_merchant():
    original_overrides = app.dependency_overrides.copy()

    async def override_db():
        yield object()

    app.dependency_overrides[get_db] = override_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/merchants/me/profile")
        assert response.status_code == 401
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(original_overrides)


@pytest.mark.asyncio
async def test_profile_patch_rejects_invalid_fields(merchant_profile_dependencies):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        invalid_phone = await client.patch(
            "/api/v1/merchants/me/profile",
            json={
                "business_contact_phone": "not-a-phone",
            },
        )
        attempt_to_change_registration_number = await client.patch(
            "/api/v1/merchants/me/profile",
            json={
                "full_name": "Merchant Owner",
                "registration_number": "OTHER-REGISTRATION",
            },
        )

    assert invalid_phone.status_code == 422
    assert attempt_to_change_registration_number.status_code == 422


@pytest.mark.asyncio
async def test_profile_authentication_requires_an_active_approved_merchant():
    user = SimpleNamespace(
        id=27,
        email="merchant@example.com",
        is_active=True,
        role="merchant",
    )
    merchant = SimpleNamespace(
        user_id=user.id,
        approval_status=ApprovalStatus.APPROVED,
    )

    class ScalarResult:
        def __init__(self, value):
            self.value = value

        def scalars(self):
            return self

        def first(self):
            return self.value

    class ProfileSession:
        def __init__(self, values):
            self.values = iter(values)

        async def execute(self, _statement):
            return ScalarResult(next(self.values))

    result = await get_authenticated_merchant_profile(
        {"email": user.email},
        ProfileSession([user, merchant]),
    )
    assert result is merchant

    inactive_user = SimpleNamespace(**{**vars(user), "is_active": False})
    with pytest.raises(HTTPException) as error:
        await get_authenticated_merchant_profile(
            {"email": user.email},
            ProfileSession([inactive_user]),
        )
    assert error.value.status_code == 403


@pytest.mark.asyncio
async def test_password_change_reauthenticates_and_updates_supabase_merchant(
    merchant_profile_dependencies, monkeypatch
):
    user, _ = merchant_profile_dependencies
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(settings, "SUPABASE_KEY", "test-api-key")
    requests = []

    class AuthResponse:
        def __init__(self, status_code, payload=None):
            self.status_code = status_code
            self.payload = payload or {}

        def json(self):
            return self.payload

    class AuthClient:
        def __init__(self, *, timeout):
            assert timeout == 10.0

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def post(self, url, *, headers, json):
            requests.append(("post", url, headers, json))
            return AuthResponse(200, {"access_token": "reauthenticated-token"})

        async def put(self, url, *, headers, json):
            requests.append(("put", url, headers, json))
            return AuthResponse(200)

    monkeypatch.setattr(routes.httpx, "AsyncClient", AuthClient)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/merchants/me/profile/change-password",
            json={
                "current_password": "current-password",
                "new_password": "new-password-at-least-12",
                "confirm_password": "new-password-at-least-12",
            },
        )

    assert response.status_code == 200
    assert requests[0][1] == "https://example.supabase.co/auth/v1/token?grant_type=password"
    assert requests[0][3] == {
        "email": user.email,
        "password": "current-password",
    }
    assert requests[1][1] == "https://example.supabase.co/auth/v1/user"
    assert requests[1][2]["Authorization"] == "Bearer reauthenticated-token"
    assert requests[1][3] == {"password": "new-password-at-least-12"}


@pytest.mark.asyncio
async def test_password_change_rejects_mismatched_confirmation(
    merchant_profile_dependencies,
):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/merchants/me/profile/change-password",
            json={
                "current_password": "current-password",
                "new_password": "new-password-at-least-12",
                "confirm_password": "different-password-123",
            },
        )
    assert response.status_code == 422
