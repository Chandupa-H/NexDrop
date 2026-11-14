from datetime import datetime, timezone
from types import SimpleNamespace

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.modules.auth.dependencies import get_authenticated_courier
from app.modules.couriers import routes
from app.modules.users.models import User


@pytest.fixture
def courier_profile_dependencies():
    user = SimpleNamespace(
        id=17,
        email="courier@example.com",
        full_name="Courier Example",
        contact_phone="+94 77 123 4567",
        is_active=True,
        created_at=datetime(2026, 1, 15, tzinfo=timezone.utc),
    )
    courier = SimpleNamespace(
        id=42,
        user_id=user.id,
        created_at=datetime(2026, 2, 1, tzinfo=timezone.utc),
    )

    class ProfileSession:
        async def get(self, model, object_id):
            return user if model is User and object_id == user.id else None

        async def commit(self):
            pass

        async def refresh(self, instance):
            assert instance is user

    session = ProfileSession()

    async def override_db():
        yield session

    original_overrides = app.dependency_overrides.copy()
    app.dependency_overrides[get_authenticated_courier] = lambda: courier
    app.dependency_overrides[get_db] = override_db
    try:
        yield user
    finally:
        app.dependency_overrides.clear()
        app.dependency_overrides.update(original_overrides)


@pytest.mark.asyncio
async def test_profile_get_and_patch_read_and_update_authenticated_database_profile(
    courier_profile_dependencies,
):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        initial = await client.get("/api/v1/couriers/courier/profile")
        assert initial.status_code == 200
        assert initial.json() == {
            "id": 42,
            "full_name": "Courier Example",
            "email": "courier@example.com",
            "contact_phone": "+94 77 123 4567",
            "status": "ACTIVE",
            "joined_date": "2026-02-01",
        }

        updated = await client.patch(
            "/api/v1/couriers/courier/profile",
            json={
                "full_name": "Updated Courier",
                "contact_phone": "+94 71 555 1234",
            },
        )
        assert updated.status_code == 200
        assert updated.json()["full_name"] == "Updated Courier"
        assert updated.json()["contact_phone"] == "+94 71 555 1234"
        assert courier_profile_dependencies.full_name == "Updated Courier"


@pytest.mark.asyncio
async def test_profile_requires_authenticated_courier():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/couriers/courier/profile")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_profile_patch_rejects_invalid_fields(courier_profile_dependencies):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        invalid_phone = await client.patch(
            "/api/v1/couriers/courier/profile",
            json={"full_name": "Courier Example", "contact_phone": "not-a-phone"},
        )
        assert invalid_phone.status_code == 422

        attempt_to_change_id = await client.patch(
            "/api/v1/couriers/courier/profile",
            json={
                "full_name": "Courier Example",
                "contact_phone": "+94 77 123 4567",
                "id": 2,
            },
        )
        assert attempt_to_change_id.status_code == 422


@pytest.mark.asyncio
async def test_password_change_reauthenticates_and_updates_supabase_user(
    courier_profile_dependencies, monkeypatch
):
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
            "/api/v1/couriers/courier/profile/change-password",
            json={
                "current_password": "current",
                "new_password": "new-password-at-least-12",
                "confirm_password": "new-password-at-least-12",
            },
        )

    assert response.status_code == 200
    assert requests[0][1] == "https://example.supabase.co/auth/v1/token?grant_type=password"
    assert requests[0][3] == {
        "email": "courier@example.com",
        "password": "current",
    }
    assert requests[1][1] == "https://example.supabase.co/auth/v1/user"
    assert requests[1][2]["Authorization"] == "Bearer reauthenticated-token"
    assert requests[1][3] == {"password": "new-password-at-least-12"}


@pytest.mark.asyncio
async def test_password_change_validates_confirmation(courier_profile_dependencies):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/couriers/courier/profile/change-password",
            json={
                "current_password": "current",
                "new_password": "new-password-at-least-12",
                "confirm_password": "a-different-password",
            },
        )
    assert response.status_code == 422
