import base64
import hashlib
import hmac
import json
from types import SimpleNamespace
from uuid import UUID

import pytest
from fastapi import HTTPException

from app.core.config import settings
from app.modules.auth.dependencies import (
    get_verified_token_claims,
    verify_supabase_access_token,
)
from app.modules.merchants import routes
from app.modules.merchants.models import ApprovalStatus
from app.modules.merchants.schemas import MerchantRegisterRequest
from app.modules.users.models import UserRole


SUBJECT = UUID("f0f9b33e-2c2d-4c46-9e2f-a659819f5901")


def _encode_segment(value):
    encoded = base64.urlsafe_b64encode(json.dumps(value).encode()).decode()
    return encoded.rstrip("=")


def _signed_token(claims, secret):
    header = _encode_segment({"alg": "HS256", "typ": "JWT"})
    payload = _encode_segment(claims)
    signing_input = f"{header}.{payload}".encode()
    signature = hmac.new(secret.encode(), signing_input, hashlib.sha256).digest()
    encoded_signature = base64.urlsafe_b64encode(signature).decode().rstrip("=")
    return f"{header}.{payload}.{encoded_signature}"


def _registration_payload(email="merchant@example.com"):
    return MerchantRegisterRequest(
        email=email,
        full_name="Merchant Owner",
        business_name="Ceylon Crafts",
        registration_number="PV12984-2024",
        contact_phone="+94 71 123 4567",
        business_address="45 Galle Road, Colombo",
    )


def test_verified_supabase_token_requires_uuid_subject_and_valid_claims(monkeypatch):
    secret = "local-test-signing-secret"
    monkeypatch.setattr(settings, "SUPABASE_JWT_SECRET", secret)
    monkeypatch.setattr(settings, "SUPABASE_URL", "https://example.supabase.co")
    claims = {
        "sub": str(SUBJECT),
        "aud": "authenticated",
        "role": "authenticated",
        "email": "merchant@example.com",
        "exp": 4_102_444_800,
        "iss": "https://example.supabase.co/auth/v1",
    }

    assert verify_supabase_access_token(_signed_token(claims, secret))["sub"] == str(SUBJECT)

    invalid_subject = {**claims, "sub": "not-a-uuid"}
    with pytest.raises(HTTPException) as error:
        verify_supabase_access_token(_signed_token(invalid_subject, secret))
    assert error.value.status_code == 401


@pytest.mark.asyncio
async def test_verified_supabase_claims_reject_missing_bearer_token():
    with pytest.raises(HTTPException) as error:
        await get_verified_token_claims(None)

    assert error.value.status_code == 401


@pytest.mark.asyncio
async def test_merchant_registration_route_passes_verified_subject(monkeypatch):
    received = {}

    class FakeService:
        async def register_merchant(self, _payload, **kwargs):
            received.update(kwargs)
            return SimpleNamespace(id=44, approval_status=ApprovalStatus.PENDING)

    monkeypatch.setattr(routes, "MerchantService", lambda _repository: FakeService())
    response = await routes.register_merchant(
        _registration_payload("MERCHANT@example.com"),
        claims={"sub": str(SUBJECT), "email": "merchant@example.com"},
        session=object(),
    )

    assert response.merchant_id == 44
    assert response.approval_status == ApprovalStatus.PENDING
    assert received == {
        "supabase_user_id": SUBJECT,
        "authenticated_email": "merchant@example.com",
    }


@pytest.mark.asyncio
async def test_merchant_registration_rejects_email_not_matching_verified_claim():
    with pytest.raises(HTTPException) as error:
        await routes.register_merchant(
            _registration_payload("someone-else@example.com"),
            claims={"sub": str(SUBJECT), "email": "merchant@example.com"},
            session=object(),
        )

    assert error.value.status_code == 403


class _ScalarResult:
    def __init__(self, value):
        self.value = value

    def scalars(self):
        return self

    def first(self):
        return self.value


class _StatusSession:
    def __init__(self, values):
        self.values = iter(values)
        self.statements = []

    async def execute(self, statement):
        self.statements.append(statement)
        return _ScalarResult(next(self.values))


@pytest.mark.asyncio
async def test_merchant_status_resolves_application_from_verified_subject():
    user = SimpleNamespace(id=27, role=UserRole.MERCHANT)
    merchant = SimpleNamespace(
        id=42,
        user_id=user.id,
        business_name="Ceylon Crafts",
        approval_status=ApprovalStatus.PENDING,
        rejection_reason=None,
    )
    session = _StatusSession([user, merchant])

    response = await routes.get_my_merchant_status(
        {"sub": str(SUBJECT), "email": "merchant@example.com"},
        session,
    )

    assert response.merchant_id == merchant.id
    assert response.approval_status == ApprovalStatus.PENDING
    assert "users.supabase_user_id" in str(session.statements[0])


@pytest.mark.asyncio
async def test_merchant_status_does_not_fall_back_to_email_or_another_profile():
    session = _StatusSession([None])

    with pytest.raises(HTTPException) as error:
        await routes.get_my_merchant_status(
            {"sub": str(SUBJECT), "email": "merchant@example.com"},
            session,
        )

    assert error.value.status_code == 404
    assert len(session.statements) == 1
