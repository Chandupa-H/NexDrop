import base64
import hashlib
import hmac
import json
import logging
import time
from typing import Callable, List, Optional, Sequence, Union

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field

from app.core.config import settings
from app.modules.users.models import UserRole

logger = logging.getLogger(__name__)

security_bearer = HTTPBearer(auto_error=False)


class AuthenticatedUser(BaseModel):
    """
    Normalized representation of an authenticated caller across services.
    Compatible with Supabase Auth JWT claims and internal database user records.
    """
    id: str
    email: Optional[str] = None
    role: UserRole = UserRole.CUSTOMER
    permissions: List[str] = Field(default_factory=list)


def _b64decode_url(data: str) -> bytes:
    """Helper to decode base64url without padding errors."""
    rem = len(data) % 4
    if rem > 0:
        data += "=" * (4 - rem)
    return base64.urlsafe_b64decode(data.encode("utf-8"))


def _b64encode_url(data: bytes) -> str:
    """Helper to encode base64url stripped of trailing '=' padding."""
    return base64.urlsafe_b64encode(data).decode("utf-8").rstrip("=")


def create_token_for_user(
    user_id: str,
    role: Union[UserRole, str],
    email: Optional[str] = None,
    permissions: Optional[List[str]] = None,
    expires_in: int = 3600,
    secret: Optional[str] = None,
) -> str:
    """
    Generates a valid signed HS256 JWT (standard Supabase/OAuth format)
    for testing and token generation.
    """
    signing_secret = secret or settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
    header = {"alg": "HS256", "typ": "JWT"}
    role_value = role.value if isinstance(role, UserRole) else str(role).lower()
    now = int(time.time())

    payload = {
        "sub": user_id,
        "email": email or f"{user_id}@nexdrop.com",
        "role": "authenticated",
        "app_metadata": {
            "role": role_value,
            "permissions": permissions or [],
        },
        "user_metadata": {
            "role": role_value,
        },
        "iat": now,
        "exp": now + expires_in,
    }

    h_b64 = _b64encode_url(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    p_b64 = _b64encode_url(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    msg = f"{h_b64}.{p_b64}".encode("utf-8")
    sig = hmac.new(signing_secret.encode("utf-8"), msg, hashlib.sha256).digest()
    s_b64 = _b64encode_url(sig)

    return f"{h_b64}.{p_b64}.{s_b64}"


def decode_and_verify_token(token: str) -> dict:
    """
    Decodes an HS256 JWT, checks expiration, and validates its cryptographic
    signature against SUPABASE_JWT_SECRET / SECRET_KEY.
    """
    parts = token.strip().split(".")
    if len(parts) != 3:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Malformed JWT token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    h_b64, p_b64, s_b64 = parts

    try:
        header = json.loads(_b64decode_url(h_b64).decode("utf-8"))
        payload = json.loads(_b64decode_url(p_b64).decode("utf-8"))
        provided_sig = _b64decode_url(s_b64)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to decode token claims.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if header.get("alg") != "HS256":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Unsupported token algorithm '{header.get('alg')}'. HS256 required.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Check expiration
    exp = payload.get("exp")
    if exp and isinstance(exp, (int, float)) and time.time() > exp:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Validate HMAC signature using SUPABASE_JWT_SECRET or SECRET_KEY
    signing_secret = settings.SUPABASE_JWT_SECRET or settings.SECRET_KEY
    if signing_secret:
        msg = f"{h_b64}.{p_b64}".encode("utf-8")
        expected_sig = hmac.new(
            signing_secret.encode("utf-8"), msg, hashlib.sha256
        ).digest()
        if not hmac.compare_digest(provided_sig, expected_sig):
            # Also check fallback SECRET_KEY if different
            if settings.SECRET_KEY and settings.SECRET_KEY != signing_secret:
                fallback_sig = hmac.new(
                    settings.SECRET_KEY.encode("utf-8"), msg, hashlib.sha256
                ).digest()
                if not hmac.compare_digest(provided_sig, fallback_sig):
                    raise HTTPException(
                        status_code=status.HTTP_401_UNAUTHORIZED,
                        detail="Invalid token signature.",
                        headers={"WWW-Authenticate": "Bearer"},
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token signature.",
                    headers={"WWW-Authenticate": "Bearer"},
                )

    return payload


def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> AuthenticatedUser:
    """
    FastAPI dependency requiring a valid Bearer JWT.
    Extracts identity, role, and permissions claims.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header with Bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    payload = decode_and_verify_token(token)

    sub = str(payload.get("sub") or "")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing 'sub' identifier.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Resolve application role from metadata claims or direct role claim
    app_meta = payload.get("app_metadata") or {}
    user_meta = payload.get("user_metadata") or {}
    raw_role = (
        app_meta.get("role")
        or user_meta.get("role")
        or payload.get("nexdrop_role")
        or (payload.get("role") if payload.get("role") not in ("authenticated", "anon") else None)
        or "customer"
    )

    try:
        role_enum = UserRole(str(raw_role).lower())
    except ValueError:
        role_enum = UserRole.CUSTOMER

    permissions = app_meta.get("permissions") or []

    return AuthenticatedUser(
        id=sub,
        email=payload.get("email"),
        role=role_enum,
        permissions=list(permissions),
    )


def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer),
) -> Optional[AuthenticatedUser]:
    """
    FastAPI dependency that extracts and validates the Bearer token if present,
    or returns None without raising an exception if unauthenticated.
    """
    if not credentials or not credentials.credentials:
        return None

    try:
        token = credentials.credentials
        payload = decode_and_verify_token(token)
        sub = str(payload.get("sub") or "")
        if not sub:
            return None

        app_meta = payload.get("app_metadata") or {}
        user_meta = payload.get("user_metadata") or {}
        raw_role = (
            app_meta.get("role")
            or user_meta.get("role")
            or payload.get("nexdrop_role")
            or (payload.get("role") if payload.get("role") not in ("authenticated", "anon") else None)
            or "customer"
        )

        try:
            role_enum = UserRole(str(raw_role).lower())
        except ValueError:
            role_enum = UserRole.CUSTOMER

        return AuthenticatedUser(
            id=sub,
            email=payload.get("email"),
            role=role_enum,
            permissions=list(app_meta.get("permissions") or []),
        )
    except Exception:
        return None


def require_role(*allowed_roles: Union[UserRole, str]) -> Callable[[AuthenticatedUser], AuthenticatedUser]:
    """
    FastAPI dependency factory enforcing that the authenticated user possesses
    one of the specified roles. Administrators have blanket access.
    """
    normalized_allowed = {
        (r.value if isinstance(r, UserRole) else str(r)).lower() for r in allowed_roles
    }

    def role_guard(
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        # Admin has system-wide operational clearance
        if user.role == UserRole.ADMIN or user.role.value in normalized_allowed:
            return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Access forbidden: role '{user.role.value}' is not permitted. "
                f"Required role: {', '.join(sorted(normalized_allowed))}."
            ),
        )

    return role_guard


def require_permission(permission_name: str) -> Callable[[AuthenticatedUser], AuthenticatedUser]:
    """
    FastAPI dependency factory enforcing fine-grained RBAC permission strings
    (e.g., 'orders:write', 'merchants:approve'). Administrators bypass permission checks.
    """
    def permission_guard(
        user: AuthenticatedUser = Depends(get_current_user),
    ) -> AuthenticatedUser:
        if user.role == UserRole.ADMIN or permission_name in user.permissions:
            return user

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access forbidden: missing required permission '{permission_name}'.",
        )

    return permission_guard

