import asyncio
import base64
import binascii
import hashlib
import hmac
import json
import time
from typing import Any

import httpx
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.modules.couriers.models import Courier
from app.modules.users.models import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)
_supabase_verification_tasks: dict[str, asyncio.Task[dict[str, Any]]] = {}
_supabase_jwks_clients: dict[str, jwt.PyJWKClient] = {}
_asymmetric_verification_tasks: dict[
    str, asyncio.Task[dict[str, Any] | None]
] = {}
_verified_token_claims_cache: dict[str, tuple[dict[str, Any], float]] = {}


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


def _get_supabase_jwks_client(supabase_url: str) -> jwt.PyJWKClient:
    client = _supabase_jwks_clients.get(supabase_url)
    if client is None:
        client = jwt.PyJWKClient(
            f"{supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json",
            cache_jwk_set=True,
            lifespan=300,
            timeout=5,
        )
        _supabase_jwks_clients[supabase_url] = client
    return client


def _verify_asymmetric_supabase_access_token(token: str) -> dict[str, Any] | None:
    if not settings.SUPABASE_URL:
        return None

    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError:
        return None

    algorithm = header.get("alg")
    if algorithm not in {"ES256", "RS256"}:
        return None

    signing_key = _get_supabase_jwks_client(
        settings.SUPABASE_URL
    ).get_signing_key_from_jwt(token)
    claims = jwt.decode(
        token,
        signing_key.key,
        algorithms=[algorithm],
        audience="authenticated",
        issuer=f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1",
    )
    if claims.get("role") != "authenticated":
        raise jwt.InvalidTokenError("Invalid Supabase access token role")
    if not isinstance(claims.get("email"), str) or not claims["email"]:
        raise jwt.InvalidTokenError("Supabase access token is missing an email")
    return claims


async def get_verified_token_claims(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict[str, Any]:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _unauthorized()

    try:
        return verify_supabase_access_token(credentials.credentials)
    except HTTPException as error:
        if error.status_code not in (status.HTTP_401_UNAUTHORIZED, status.HTTP_503_SERVICE_UNAVAILABLE):
            raise

    token_fingerprint = hashlib.sha256(
        credentials.credentials.encode("utf-8")
    ).hexdigest()
    cached_claims = _verified_token_claims_cache.get(token_fingerprint)
    if cached_claims is not None:
        claims, expires_at = cached_claims
        if expires_at > time.monotonic():
            return claims
        _verified_token_claims_cache.pop(token_fingerprint, None)

    verification_task = _asymmetric_verification_tasks.get(token_fingerprint)
    if verification_task is None:
        verification_task = asyncio.create_task(
            asyncio.to_thread(
                _verify_asymmetric_supabase_access_token,
                credentials.credentials,
            )
        )
        _asymmetric_verification_tasks[token_fingerprint] = verification_task

        def remove_asymmetric_task(
            completed_task: asyncio.Task[dict[str, Any] | None],
        ) -> None:
            if (
                _asymmetric_verification_tasks.get(token_fingerprint)
                is completed_task
            ):
                _asymmetric_verification_tasks.pop(token_fingerprint, None)

        verification_task.add_done_callback(remove_asymmetric_task)

    try:
        asymmetric_claims = await asyncio.shield(verification_task)
        if asymmetric_claims is not None:
            cache_lifetime = min(
                30,
                max(0, int(asymmetric_claims["exp"] - time.time())),
            )
            if cache_lifetime:
                now = time.monotonic()
                for expired_fingerprint, (_, expires_at) in list(
                    _verified_token_claims_cache.items()
                ):
                    if expires_at <= now:
                        _verified_token_claims_cache.pop(
                            expired_fingerprint, None
                        )
                # Cache briefly to avoid repeated Supabase lookups without delaying revocation.
                _verified_token_claims_cache[token_fingerprint] = (
                    asymmetric_claims,
                    now + cache_lifetime,
                )
            return asymmetric_claims
    except (httpx.RequestError, jwt.PyJWTError, OSError):
        # Retain Supabase Auth verification as a fallback for unavailable or rotated signing keys.
        pass

    task = _supabase_verification_tasks.get(token_fingerprint)
    if task is None:
        task = asyncio.create_task(
            _verify_access_token_with_supabase(credentials.credentials)
        )
        _supabase_verification_tasks[token_fingerprint] = task

        def remove_completed_task(
            completed_task: asyncio.Task[dict[str, Any]],
        ) -> None:
            if _supabase_verification_tasks.get(token_fingerprint) is completed_task:
                _supabase_verification_tasks.pop(token_fingerprint, None)

        task.add_done_callback(remove_completed_task)

    return await asyncio.shield(task)


async def _verify_access_token_with_supabase(token: str) -> dict[str, Any]:
    if not settings.SUPABASE_URL:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase URL is not configured for token verification.",
        )
    api_key = settings.SUPABASE_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
    if not api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase API key is not configured for token verification.",
        )

    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(
                f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user",
                headers={
                    "apikey": api_key,
                    "Authorization": f"Bearer {token}",
                },
            )
    except httpx.RequestError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify the access token with Supabase.",
        ) from error

    if response.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN):
        raise _unauthorized()
    if response.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase could not verify the access token right now.",
        )

    try:
        user = response.json()
    except ValueError as error:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Supabase returned an invalid token verification response.",
        ) from error

    user_id = user.get("id") if isinstance(user, dict) else None
    email = user.get("email") if isinstance(user, dict) else None
    if not isinstance(user_id, str) or not user_id:
        raise _unauthorized()
    if not isinstance(email, str) or not email:
        raise _unauthorized()

    return {
        "sub": user_id,
        "email": email,
        "aud": "authenticated",
        "role": "authenticated",
        "iss": f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1",
    }


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
