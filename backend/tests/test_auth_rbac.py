from types import SimpleNamespace
from uuid import UUID

import jwt
import pytest
from httpx import AsyncClient, ASGITransport
from fastapi import FastAPI, Depends, HTTPException
from cryptography.hazmat.primitives.asymmetric import ec

from app.core.auth import (
    AuthenticatedUser,
    create_token_for_user,
    get_current_user,
    require_role,
    require_permission,
)
from app.core.config import settings
from app.modules.auth import dependencies as supabase_auth
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
async def test_admin_rbac_accepts_supabase_es256_token(auth_client, monkeypatch):
    supabase_url = "https://example.supabase.co"
    monkeypatch.setattr(settings, "SUPABASE_URL", supabase_url)
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "legacy-hs256-secret")
    private_key = ec.generate_private_key(ec.SECP256R1())
    subject = UUID("f0f9b33e-2c2d-4c46-9e2f-a659819f5901")
    token = jwt.encode(
        {
            "sub": str(subject),
            "aud": "authenticated",
            "role": "authenticated",
            "email": "admin@example.com",
            "app_metadata": {"role": "admin", "permissions": []},
            "exp": 4_102_444_800,
            "iss": f"{supabase_url}/auth/v1",
        },
        private_key,
        algorithm="ES256",
        headers={"kid": "test-key"},
    )

    class TestJwksClient:
        def get_signing_key_from_jwt(self, _token):
            return SimpleNamespace(key=private_key.public_key())

    monkeypatch.setattr(
        supabase_auth,
        "_get_supabase_jwks_client",
        lambda _url: TestJwksClient(),
    )

    response = await auth_client.get(
        "/admin-only",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Welcome Admin", "user_id": str(subject)}

    header, payload, signature = token.split(".")
    replacement = "A" if signature[0] != "A" else "B"
    tampered_token = f"{header}.{payload}.{replacement}{signature[1:]}"

    async def reject_invalid_token(_token):
        raise HTTPException(status_code=401, detail="Invalid access token.")

    monkeypatch.setattr(
        supabase_auth,
        "_verify_access_token_with_supabase",
        reject_invalid_token,
    )
    rejected = await auth_client.get(
        "/admin-only",
        headers={"Authorization": f"Bearer {tampered_token}"},
    )

    assert rejected.status_code == 401


@pytest.mark.asyncio
async def test_admin_rbac_preserves_server_role_when_supabase_auth_verifies_token(
    auth_client, monkeypatch
):
    supabase_url = "https://example.supabase.co"
    monkeypatch.setattr(settings, "SUPABASE_URL", supabase_url)
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", "legacy-hs256-secret")
    monkeypatch.setattr(settings, "SUPABASE_KEY", "test-api-key")
    subject = UUID("3fef9310-d055-4143-ad67-a9b1280717ed")
    token = jwt.encode(
        {"sub": str(subject), "exp": 4_102_444_800},
        ec.generate_private_key(ec.SECP256R1()),
        algorithm="ES256",
        headers={"kid": "rotated-key"},
    )
    monkeypatch.setattr(
        supabase_auth,
        "_verify_asymmetric_supabase_access_token",
        lambda _token: None,
    )

    class AuthResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "id": str(subject),
                "email": "admin@example.com",
                "app_metadata": {"role": "admin", "permissions": []},
            }

    class AuthClient:
        def __init__(self, *, timeout):
            assert timeout == 5.0

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, _url, *, headers):
            assert headers["Authorization"] == f"Bearer {token}"
            return AuthResponse()

    monkeypatch.setattr(supabase_auth.httpx, "AsyncClient", AuthClient)

    response = await auth_client.get(
        "/admin-only",
        headers={"Authorization": f"Bearer {token}"},
    )

    assert response.status_code == 200
    assert response.json() == {"message": "Welcome Admin", "user_id": str(subject)}


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

