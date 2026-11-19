from unittest.mock import AsyncMock, Mock
import pytest
from fastapi import HTTPException
from app.modules.admin import users_service as service
from app.modules.admin.schemas import AdminUserUpdate
from app.modules.users.models import User, UserRole


def result(value):
    query = Mock()
    query.scalars.return_value.first.return_value = value
    return query


@pytest.fixture
def context(monkeypatch):
    session = AsyncMock()
    session.add = Mock()
    user = User(id=8, email='test@example.com', full_name='Old Name', role=UserRole.UNASSIGNED, is_active=True, hashed_password='managed')
    session.execute.side_effect = [result(user), result(None), result(None)]
    identity = {'id': 'auth-id', 'app_metadata': {'provider': 'email'}, 'user_metadata': {'other': 'preserved'}}
    monkeypatch.setattr(service, 'find_auth_user', AsyncMock(return_value=identity))
    update = AsyncMock()
    monkeypatch.setattr(service, 'update_auth_user', update)
    return session, user, update


@pytest.mark.asyncio
async def test_assign_courier_creates_profile_and_syncs_role(context):
    session, user, update = context
    await service.edit_user(session, 8, AdminUserUpdate(full_name='New Name', role='courier'), {'email': 'admin@example.com'})
    assert user.role == UserRole.COURIER
    assert session.add.call_args.args[0].user_id == 8
    metadata = update.call_args.args[1]
    assert metadata['app_metadata'] == {'provider': 'email', 'role': 'courier'}
    assert metadata['user_metadata']['other'] == 'preserved'
    session.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_self_demotion_blocked(context):
    session, _, update = context
    with pytest.raises(HTTPException) as error:
        await service.edit_user(session, 8, AdminUserUpdate(full_name='New Name', role='customer'), {'email': 'test@example.com'})
    assert error.value.status_code == 400
    update.assert_not_awaited()


@pytest.mark.asyncio
async def test_merchant_details_required(context):
    session, _, update = context
    with pytest.raises(HTTPException) as error:
        await service.edit_user(session, 8, AdminUserUpdate(full_name='New Name', role='merchant'), {})
    assert error.value.status_code == 422
    update.assert_not_awaited()
    session.rollback.assert_awaited_once()


@pytest.mark.asyncio
async def test_auth_update_failure_rolls_back(context):
    session, _, update = context
    update.side_effect = HTTPException(502, 'Unavailable')
    with pytest.raises(HTTPException):
        await service.edit_user(session, 8, AdminUserUpdate(full_name='New Name', role='customer'), {})
    session.rollback.assert_awaited_once()
    session.commit.assert_not_awaited()


@pytest.mark.asyncio
async def test_commit_failure_restores_auth_metadata(context):
    session, _, update = context
    session.commit.side_effect = RuntimeError('Database unavailable')
    with pytest.raises(RuntimeError):
        await service.edit_user(session, 8, AdminUserUpdate(full_name='New Name', role='customer'), {})
    assert update.await_count == 2
    assert update.call_args.args[1]['app_metadata'] == {'provider': 'email'}


@pytest.mark.asyncio
async def test_update_endpoint_requires_session(async_client):
    response = await async_client.patch('/api/v1/admin/users/8', json={'full_name': 'New Name', 'role': 'admin'})
    assert response.status_code == 401
