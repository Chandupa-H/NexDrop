from types import SimpleNamespace
from unittest.mock import AsyncMock, Mock

import pytest
from fastapi import FastAPI
from httpx import AsyncClient, ASGITransport
from pydantic import ValidationError
from sqlalchemy.exc import SQLAlchemyError, OperationalError

from app.modules.customers.routes import router
from app.modules.customers.dependencies import (
    VerifiedCustomerProfileIdentity, get_verified_customer_profile_identity,
    get_customer_profile_service,
)
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.service import CustomerService
from app.modules.customers.schemas import CustomerProfileUpdateRequest


PROFILE = dict(id=42, full_name="Test Customer", email="test@example.invalid",
               phone="0771234567", default_address="Test street", city="Test city",
               postal_code="00100", role="customer")


def account_app(verified=False):
    app = FastAPI()
    app.include_router(router, prefix="/api/v1")
    service = SimpleNamespace(get_profile=AsyncMock(return_value=dict(PROFILE)),
                              update_profile=AsyncMock(return_value=dict(PROFILE)))
    if verified:
        # Trusted server-side test dependency ONLY. No client ID is accepted.
        app.dependency_overrides[get_verified_customer_profile_identity] = lambda: VerifiedCustomerProfileIdentity(7)
        app.dependency_overrides[get_customer_profile_service] = lambda: service
    return app, service


@pytest.mark.asyncio
@pytest.mark.parametrize("method", ["GET", "PUT", "DELETE"])
async def test_missing_identity_blocks_before_database_access(method):
    app, service = account_app()
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.request(method, "/api/v1/customers/customer/me?user_id=7",
                                        json={"full_name": "Test Customer"} if method == "PUT" else None)
    assert response.status_code == 503
    assert "identity verification is unavailable" in response.json()["detail"]
    service.get_profile.assert_not_awaited()
    service.update_profile.assert_not_awaited()


@pytest.mark.asyncio
async def test_reads_use_resolved_identity_and_never_fabricate_a_missing_profile():
    app, service = account_app(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/customers/customer/me")
        assert response.json() == PROFILE
        service.get_profile.assert_awaited_once_with(7)
        service.get_profile.return_value = None
        response = await client.get("/api/v1/customers/customer/me")
    assert response.status_code == 404
    assert "Dihini" not in response.text


@pytest.mark.asyncio
async def test_partial_updates_preserve_omitted_fields_and_propagate_commit_errors():
    app, service = account_app(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.put("/api/v1/customers/customer/me", json={"full_name": "  New Name  "})
        assert response.status_code == 200
        service.update_profile.assert_awaited_once_with(7, {"full_name": "New Name"})
        service.update_profile.side_effect = SQLAlchemyError("private database details")
        response = await client.put("/api/v1/customers/customer/me", json={"full_name": "New Name"})
        assert response.status_code == 500
        assert "private" not in response.text
        service.update_profile.side_effect = OperationalError("private SQL", {}, Exception("private credentials"))
        response = await client.put("/api/v1/customers/customer/me", json={"phone": "0771234567"})
        assert response.status_code == 503
        assert "private" not in response.text


@pytest.mark.asyncio
async def test_deletion_remains_unimplemented_even_with_verified_test_identity():
    app, service = account_app(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.delete("/api/v1/customers/customer/me")
    assert response.status_code == 501
    service.update_profile.assert_not_awaited()


@pytest.mark.parametrize("payload", [
    {}, {"full_name": None}, {"full_name": " "}, {"full_name": "A"},
    {"full_name": "a" * 151}, {"phone": "123"}, {"phone": 1234567},
    {"default_address": " "}, {"city": "A"}, {"postal_code": ""},
    {"email": "other@example.invalid"}, {"role": "admin"}, {"user_id": 99},
    {"id": 99}, {"is_active": False},
])
def test_invalid_or_protected_fields_are_rejected(payload):
    with pytest.raises(ValidationError):
        CustomerProfileUpdateRequest(**payload)


@pytest.mark.asyncio
@pytest.mark.parametrize("field", ["role", "email", "user_id", "id"])
async def test_protected_updates_are_rejected_at_api_boundary(field):
    app, service = account_app(True)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.put("/api/v1/customers/customer/me", json={field: "not permitted"})
    assert response.status_code == 422
    service.update_profile.assert_not_awaited()


def test_valid_fields_are_trimmed_and_omissions_remain_absent():
    data = CustomerProfileUpdateRequest(phone=" 0771234567 ")
    assert data.model_dump(exclude_unset=True) == {"phone": "0771234567"}


@pytest.mark.parametrize("identity", [None, "uuid-not-a-legacy-id", True, 0, -1])
def test_adapter_contract_cannot_accept_a_uuid_or_invalid_integer(identity):
    with pytest.raises(ValueError):
        VerifiedCustomerProfileIdentity(identity)


def repository_fixture(found=True):
    user = SimpleNamespace(full_name=PROFILE["full_name"], email=PROFILE["email"], role="customer")
    customer = SimpleNamespace(**{key: PROFILE[key] for key in ("id", "phone", "default_address", "city", "postal_code")})
    result = Mock()
    result.first.return_value = (customer, user) if found else None
    session = SimpleNamespace(execute=AsyncMock(return_value=result), flush=AsyncMock(),
                              commit=AsyncMock(), rollback=AsyncMock())
    return CustomerRepository(session), customer, user


@pytest.mark.asyncio
async def test_repository_reads_missing_data_without_fallback_or_commit():
    repository, _, _ = repository_fixture(False)
    assert await repository.get_customer_profile(7) is None
    assert 7 in repository.session.execute.call_args.args[0].compile().params.values()
    repository.session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_repository_updates_only_requested_stored_fields_and_commits():
    repository, customer, user = repository_fixture()
    profile = await CustomerService(repository).update_profile(7, {"full_name": "New Name"})
    assert profile["full_name"] == user.full_name == "New Name"
    assert customer.phone == PROFILE["phone"]
    repository.session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_repository_commit_failure_rolls_back_and_never_returns_success():
    repository, _, _ = repository_fixture()
    repository.session.commit.side_effect = SQLAlchemyError("commit failed")
    with pytest.raises(SQLAlchemyError):
        await CustomerService(repository).update_profile(7, {"city": "New city"})
    repository.session.rollback.assert_awaited_once()
