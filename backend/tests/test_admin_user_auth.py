from unittest.mock import AsyncMock, Mock

import httpx
import pytest
from fastapi import HTTPException

from app.modules.admin import auth, routes
from app.modules.admin.schemas import AdminUserCreate
from app.core.config import settings


@pytest.fixture
def payload():
    return AdminUserCreate(full_name='Test Courier', email='courier@example.com', password='Password123', role='courier')


@pytest.mark.asyncio
async def test_provision_creates_confirmed_account_with_trusted_role(monkeypatch, payload):
    request = AsyncMock(return_value=httpx.Response(200, json={'id': 'auth-id'}))
    monkeypatch.setattr(auth, 'auth_request', request)
    assert await auth.provision_auth_user(payload) == 'auth-id'
    body = request.call_args.kwargs['body']
    assert body['password'] == payload.password
    assert body['email_confirm'] is True
    assert body['app_metadata'] == {'role': 'courier'}
    assert body['ban_duration'] == 'none'


@pytest.mark.asyncio
async def test_inactive_account_is_banned(monkeypatch, payload):
    payload.is_active = False
    request = AsyncMock(return_value=httpx.Response(200, json={'id': 'auth-id'}))
    monkeypatch.setattr(auth, 'auth_request', request)
    await auth.provision_auth_user(payload)
    assert request.call_args.kwargs['body']['ban_duration'] != 'none'


@pytest.mark.asyncio
async def test_duplicate_auth_account_returns_conflict(monkeypatch, payload):
    monkeypatch.setattr(auth, 'auth_request', AsyncMock(return_value=httpx.Response(422, json={'code': 'email_exists'})))
    with pytest.raises(HTTPException) as error:
        await auth.provision_auth_user(payload)
    assert error.value.status_code == 409


@pytest.mark.asyncio
async def test_missing_settings_fails_closed(monkeypatch):
    monkeypatch.setattr(settings, 'SUPABASE_SERVICE_ROLE_KEY', None)
    with pytest.raises(HTTPException) as error:
        await auth.auth_request('POST', '/admin/users')
    assert error.value.status_code == 503


@pytest.mark.asyncio
async def test_commit_failure_removes_new_auth_account(monkeypatch, payload):
    session = AsyncMock()
    result = Mock()
    result.scalars.return_value.first.return_value = None
    session.execute.return_value = result
    session.add = Mock()
    session.commit.side_effect = RuntimeError('commit failed')
    provision = AsyncMock(return_value='auth-id')
    cleanup = AsyncMock()
    monkeypatch.setattr(routes, 'provision_auth_user', provision)
    monkeypatch.setattr(routes, 'remove_auth_user', cleanup)
    with pytest.raises(RuntimeError):
        await routes.create_admin_user(payload, session)
    cleanup.assert_awaited_once_with('auth-id')
    session.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_auth_failure_rolls_back_without_committing(monkeypatch, payload):
    session = AsyncMock()
    result = Mock()
    result.scalars.return_value.first.return_value = None
    session.execute.return_value = result
    session.add = Mock()
    monkeypatch.setattr(routes, 'provision_auth_user', AsyncMock(side_effect=HTTPException(502, 'Unavailable')))
    with pytest.raises(HTTPException):
        await routes.create_admin_user(payload, session)
    session.commit.assert_not_awaited()
    session.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_untrusted_user_metadata_cannot_grant_admin(monkeypatch):
    session = AsyncMock()
    result = Mock()
    result.scalars.return_value.first.return_value = None
    session.execute.return_value = result
    monkeypatch.setattr(auth, 'auth_request', AsyncMock(return_value=httpx.Response(200, json={
        'email': 'attacker@example.com', 'user_metadata': {'role': 'admin'},
    })))
    from fastapi.security import HTTPAuthorizationCredentials
    with pytest.raises(HTTPException) as error:
        await auth.require_admin(HTTPAuthorizationCredentials(scheme='Bearer', credentials='token'), session)
    assert error.value.status_code == 403

@pytest.mark.asyncio
async def test_success_saves_profile_and_provisions_login(monkeypatch, payload):
    from datetime import datetime, timezone
    session = AsyncMock()
    result = Mock()
    result.scalars.return_value.first.return_value = None
    session.execute.return_value = result
    def add(record):
        from app.modules.users.models import User
        if isinstance(record, User):
            record.id = 7
            record.created_at = datetime.now(timezone.utc)
    session.add = Mock(side_effect=add)
    provision = AsyncMock(return_value='auth-id')
    monkeypatch.setattr(routes, 'provision_auth_user', provision)
    response = await routes.create_admin_user(payload, session)
    assert response.email == payload.email
    assert response.role == 'Courier'
    assert session.add.call_count == 2
    provision.assert_awaited_once_with(payload)
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_create_route_requires_authentication(async_client):
    response = await async_client.post('/api/v1/admin/users', json={
        'full_name': 'Test User', 'email': 'new@example.com',
        'password': 'Password123', 'role': 'admin',
    })
    assert response.status_code == 401
