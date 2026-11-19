import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI, Depends

from app.core.auth import (
    AuthenticatedUser,
    create_token_for_user,
    get_current_user,
    require_role,
    require_permission,
)
from app.modules.users.models import UserRole

# Test FastAPI app with guarded routes
test_app = FastAPI()


@test_app.get("/me")
async def read_me(user: AuthenticatedUser = Depends(get_current_user)):
    return {"id": user.id, "email": user.email, "role": user.role.value}


@test_app.get("/admin-only")
async def admin_only_endpoint(user: AuthenticatedUser = Depends(require_role(UserRole.ADMIN))):
    return {"message": "Welcome Admin", "user_id": user.id}


@test_app.get("/courier-only")
async def courier_only_endpoint(user: AuthenticatedUser = Depends(require_role(UserRole.COURIER))):
    return {"message": "Welcome Courier", "user_id": user.id}


@test_app.get("/permission-check")
async def permission_endpoint(user: AuthenticatedUser = Depends(require_permission("parcels:create"))):
    return {"message": "Permission granted", "user_id": user.id}


@pytest.fixture
def auth_client():
    transport = ASGITransport(app=test_app)
    return AsyncClient(transport=transport, base_url="http://test")


@pytest.mark.asyncio
async def test_unauthenticated_request_returns_401(auth_client: AsyncClient):
    response = await auth_client.get("/me")
    assert response.status_code == 401
    assert "Missing Authorization header" in response.json()["detail"]


@pytest.mark.asyncio
async def test_valid_token_resolves_authenticated_user(auth_client: AsyncClient):
    token = create_token_for_user("usr-101", role=UserRole.COURIER, email="rider@nexdrop.com")
    response = await auth_client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "usr-101"
    assert data["email"] == "rider@nexdrop.com"
    assert data["role"] == "courier"


@pytest.mark.asyncio
async def test_tampered_token_returns_401(auth_client: AsyncClient):
    token = create_token_for_user("usr-101", role=UserRole.ADMIN)
    tampered_token = token[:-4] + "fake"
    response = await auth_client.get("/me", headers={"Authorization": f"Bearer {tampered_token}"})
    assert response.status_code == 401
    assert "Invalid token signature" in response.json()["detail"]


@pytest.mark.asyncio
async def test_expired_token_returns_401(auth_client: AsyncClient):
    token = create_token_for_user("usr-101", role=UserRole.ADMIN, expires_in=-10)
    response = await auth_client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
    assert "Authentication token has expired" in response.json()["detail"]


@pytest.mark.asyncio
async def test_role_guard_allows_authorized_role(auth_client: AsyncClient):
    courier_token = create_token_for_user("c-1", role=UserRole.COURIER)
    response = await auth_client.get("/courier-only", headers={"Authorization": f"Bearer {courier_token}"})
    assert response.status_code == 200
    assert response.json()["message"] == "Welcome Courier"


@pytest.mark.asyncio
async def test_role_guard_blocks_unauthorized_role_with_403(auth_client: AsyncClient):
    courier_token = create_token_for_user("c-1", role=UserRole.COURIER)
    # Courier attempts to access admin endpoint
    response = await auth_client.get("/admin-only", headers={"Authorization": f"Bearer {courier_token}"})
    assert response.status_code == 403
    assert "Access forbidden" in response.json()["detail"]


@pytest.mark.asyncio
async def test_admin_has_universal_access_to_guarded_routes(auth_client: AsyncClient):
    admin_token = create_token_for_user("admin-1", role=UserRole.ADMIN)

    # Admin visits admin endpoint
    res1 = await auth_client.get("/admin-only", headers={"Authorization": f"Bearer {admin_token}"})
    assert res1.status_code == 200

    # Admin visits courier endpoint
    res2 = await auth_client.get("/courier-only", headers={"Authorization": f"Bearer {admin_token}"})
    assert res2.status_code == 200


@pytest.mark.asyncio
async def test_permission_guard_enforces_specific_permission(auth_client: AsyncClient):
    # User with parcels:create permission
    permitted_token = create_token_for_user(
        "m-1", role=UserRole.MERCHANT, permissions=["parcels:create", "orders:read"]
    )
    res_allowed = await auth_client.get(
        "/permission-check", headers={"Authorization": f"Bearer {permitted_token}"}
    )
    assert res_allowed.status_code == 200

    # User lacking parcels:create permission
    unpermitted_token = create_token_for_user(
        "m-2", role=UserRole.MERCHANT, permissions=["orders:read"]
    )
    res_blocked = await auth_client.get(
        "/permission-check", headers={"Authorization": f"Bearer {unpermitted_token}"}
    )
    assert res_blocked.status_code == 403
    assert "missing required permission 'parcels:create'" in res_blocked.json()["detail"]

