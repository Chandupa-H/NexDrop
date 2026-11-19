"""Server-only Supabase provisioning for administrator-created accounts."""
import logging

import httpx
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.modules.admin.schemas import AdminUserCreate
from app.modules.users.models import User, UserRole

logger = logging.getLogger(__name__)
bearer = HTTPBearer(auto_error=False)


async def auth_request(method: str, path: str, *, token: str | None = None, body=None):
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(503, "Supabase admin authentication is not configured.")
    headers = {"apikey": settings.SUPABASE_SERVICE_ROLE_KEY}
    # Secret API keys use apikey; only user access tokens belong in Authorization.
    if token:
        headers["Authorization"] = f"Bearer {token}"
    elif settings.SUPABASE_SERVICE_ROLE_KEY.startswith("eyJ"):
        headers["Authorization"] = f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            return await client.request(
                method, f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1{path}",
                headers=headers, json=body,
            )
    except httpx.RequestError:
        raise HTTPException(502, "Unable to reach Supabase authentication. Please try again.") from None


async def require_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    session: AsyncSession = Depends(get_db),
):
    if credentials is None:
        raise HTTPException(401, "Administrator authentication is required.")
    response = await auth_request("GET", "/user", token=credentials.credentials)
    if response.status_code != 200:
        raise HTTPException(401, "Invalid or expired session.")
    identity = response.json()
    result = await session.execute(select(User).where(User.email == identity.get("email")))
    user = result.scalars().first()
    # Existing administrators may be represented in trusted auth metadata or the app DB.
    if user is not None and not user.is_active:
        raise HTTPException(403, "Administrator account is suspended.")
    if not (
        identity.get("app_metadata", {}).get("role") == "admin"
        or user is not None and user.role == UserRole.ADMIN
    ):
        raise HTTPException(403, "Administrator access is required.")
    return identity


async def find_auth_user(email: str) -> dict:
    page = 1
    while True:
        response = await auth_request("GET", f"/admin/users?page={page}&per_page=100")
        if response.is_error:
            raise HTTPException(502, "Unable to find the Supabase login account.")
        users = response.json().get("users", [])
        for user in users:
            if (user.get("email") or "").lower() == email.lower():
                return user
        if len(users) < 100:
            raise HTTPException(409, "This user has no Supabase login account. Provision their login before editing.")
        page += 1


async def update_auth_user(user_id: str, body: dict) -> None:
    response = await auth_request("PUT", f"/admin/users/{user_id}", body=body)
    if response.is_error:
        raise HTTPException(502, "Supabase could not update the login account.")


async def provision_auth_user(payload: AdminUserCreate) -> str:
    response = await auth_request("POST", "/admin/users", body={
        "email": str(payload.email),
        "password": payload.password,
        "email_confirm": True,
        "app_metadata": {"role": payload.role.lower()},
        "user_metadata": {"full_name": payload.full_name},
        "ban_duration": "none" if payload.is_active else "876000h",
    })
    if response.is_error:
        data = response.json()
        code = data.get("error_code") or data.get("code")
        if code in {"email_exists", "user_already_exists"}:
            raise HTTPException(409, "This email already has a Supabase login account.")
        if response.status_code in {400, 422}:
            raise HTTPException(400, data.get("msg") or data.get("message") or "Supabase rejected the account details.")
        raise HTTPException(502, "Supabase could not create the login account.")
    return response.json()["id"]


async def remove_auth_user(user_id: str) -> None:
    """Compensate when the application database transaction fails."""
    try:
        response = await auth_request("DELETE", f"/admin/users/{user_id}")
        if response.is_error:
            logger.error("Supabase account cleanup failed for user %s", user_id)
    except HTTPException:
        logger.error("Supabase account cleanup unavailable for user %s", user_id)
