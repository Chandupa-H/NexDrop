from copy import deepcopy

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.modules.couriers.profile_mock import MOCK_COURIER_PROFILE


@pytest.fixture
def courier_profile_mock():
    previous_profile = deepcopy(MOCK_COURIER_PROFILE)
    yield
    MOCK_COURIER_PROFILE.clear()
    MOCK_COURIER_PROFILE.update(previous_profile)


@pytest.mark.asyncio
async def test_profile_get_and_patch_persist_only_editable_fields(
    courier_profile_mock,
):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        initial = await client.get("/api/v1/couriers/courier/profile")
        assert initial.status_code == 200
        assert initial.json() == {
            "id": 1,
            "full_name": "Poorna Danushka",
            "email": "poorna.courier@nexdrop.io",
            "contact_phone": "+94 77 123 4567",
            "status": "ACTIVE",
            "joined_date": "2026-01-15",
        }

        updated = await client.patch(
            "/api/v1/couriers/courier/profile",
            json={
                "full_name": "Kasun Fernando",
                "contact_phone": "+94 71 555 1234",
            },
        )
        assert updated.status_code == 200
        assert updated.json()["full_name"] == "Kasun Fernando"
        assert updated.json()["contact_phone"] == "+94 71 555 1234"
        assert updated.json()["email"] == "poorna.courier@nexdrop.io"
        assert updated.json()["id"] == 1

        persisted = await client.get("/api/v1/couriers/courier/profile")
        assert persisted.status_code == 200
        assert persisted.json()["full_name"] == "Kasun Fernando"
        assert persisted.json()["contact_phone"] == "+94 71 555 1234"


@pytest.mark.asyncio
async def test_profile_patch_rejects_invalid_fields(courier_profile_mock):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        invalid_phone = await client.patch(
            "/api/v1/couriers/courier/profile",
            json={"full_name": "Kasun Perera", "contact_phone": "not-a-phone"},
        )
        assert invalid_phone.status_code == 422

        attempt_to_change_id = await client.patch(
            "/api/v1/couriers/courier/profile",
            json={
                "full_name": "Kasun Perera",
                "contact_phone": "+94 77 123 4567",
                "id": 2,
            },
        )
        assert attempt_to_change_id.status_code == 422


@pytest.mark.asyncio
async def test_profile_mock_endpoints_do_not_require_unfinished_authentication(
    courier_profile_mock,
):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/v1/couriers/courier/profile")
    assert response.status_code == 200
    assert response.json()["full_name"] == "Poorna Danushka"


@pytest.mark.asyncio
async def test_password_change_validates_request_and_reports_unimplemented_auth():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        mismatch = await client.post(
            "/api/v1/couriers/courier/profile/change-password",
            json={
                "current_password": "current",
                "new_password": "new-password-at-least-12",
                "confirm_password": "a-different-password",
            },
        )
        assert mismatch.status_code == 422

        valid = await client.post(
            "/api/v1/couriers/courier/profile/change-password",
            json={
                "current_password": "current",
                "new_password": "new-password-at-least-12",
                "confirm_password": "new-password-at-least-12",
            },
        )
        assert valid.status_code == 501
        assert "authentication service is implemented" in valid.json()["detail"]
