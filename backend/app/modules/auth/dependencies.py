import base64
import binascii
import hashlib
import hmac
import json
import time
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.modules.couriers.models import Courier
from app.modules.users.models import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


def _unauthorized() -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or missing bearer token",
        headers={"WWW-Authenticate": "Bearer"},
    )


def _decode_segment(segment: str) -> dict[str, Any]:
    padding = "=" * (-len(segment) % 4)
    value = json.loads(base64.urlsafe_b64decode(segment + padding))
    if not isinstance(value, dict):
        raise ValueError("JWT segment must contain an object")
    return value


def verify_supabase_access_token(token: str) -> dict[str, Any]:
    secret = settings.SUPABASE_JWT_SECRET
    supabase_url = settings.SUPABASE_URL
    if not secret or not supabase_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase JWT verification settings are not configured.",
        )

    try:
        encoded_header, encoded_claims, encoded_signature = token.split(".")
        header = _decode_segment(encoded_header)
        claims = _decode_segment(encoded_claims)
        signature = base64.urlsafe_b64decode(
            encoded_signature + "=" * (-len(encoded_signature) % 4)
        )
    except (ValueError, TypeError, json.JSONDecodeError, binascii.Error):
        raise _unauthorized() from None

    if header.get("alg") != "HS256":
        raise _unauthorized()

    try:
        signing_input = f"{encoded_header}.{encoded_claims}".encode("ascii")
    except UnicodeEncodeError:
        raise _unauthorized() from None
    expected_signature = hmac.new(
        secret.encode("utf-8"), signing_input, hashlib.sha256
    ).digest()
    if not hmac.compare_digest(signature, expected_signature):
        raise _unauthorized()

    expiration = claims.get("exp")
    if (
        isinstance(expiration, bool)
        or not isinstance(expiration, (int, float))
        or expiration <= time.time()
    ):
        raise _unauthorized()

    not_before = claims.get("nbf")
    if isinstance(not_before, (int, float)) and not_before > time.time():
        raise _unauthorized()

    audience = claims.get("aud")
    if not (
        audience == "authenticated"
        or isinstance(audience, list) and "authenticated" in audience
    ):
        raise _unauthorized()
    if claims.get("role") != "authenticated":
        raise _unauthorized()

    issuer = f"{supabase_url.rstrip('/')}/auth/v1"
    if claims.get("iss") != issuer:
        raise _unauthorized()

    if not isinstance(claims.get("email"), str) or not claims["email"]:
        raise _unauthorized()

    return claims


async def get_verified_token_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()
    return verify_supabase_access_token(credentials.credentials)


async def get_authenticated_courier(
    claims: dict[str, Any] = Depends(get_verified_token_claims),
    session: AsyncSession = Depends(get_db),
) -> Courier:
    result = await session.execute(
        select(User).where(User.email == claims["email"])
    )
    user = result.scalars().first()
    if user is None or not user.is_active or user.role != UserRole.COURIER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The authenticated user is not an active courier.",
        )

    courier_result = await session.execute(
        select(Courier).where(Courier.user_id == user.id)
    )
    courier = courier_result.scalars().first()
    if courier is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No courier profile is associated with the authenticated user.",
        )
    return courier
