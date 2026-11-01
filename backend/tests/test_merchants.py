import pytest
from pydantic import ValidationError
from httpx import AsyncClient
from app.modules.merchants.schemas import MerchantRegisterRequest, ApprovalStatus


def test_merchant_register_request_passwords_match():
    """Verify that matching passwords pass validation."""
    data = {
        "email": "test@merchant.com",
        "full_name": "Test Merchant",
        "password": "Password123",
        "confirm_password": "Password123",
        "business_name": "Acme Retail Ltd",
        "registration_number": "BR12345",
        "contact_phone": "+94771234567",
        "business_address": "123 Galle Road, Colombo",
        "business_type": "retail",
        "website_url": "https://acme.com",
    }
    req = MerchantRegisterRequest(**data)
    assert req.email == "test@merchant.com"
    assert req.business_name == "Acme Retail Ltd"


def test_merchant_register_request_passwords_mismatch():
    """Verify that mismatched passwords raise a ValidationError."""
    data = {
        "email": "test@merchant.com",
        "full_name": "Test Merchant",
        "password": "Password123",
        "confirm_password": "DifferentPassword123",
        "business_name": "Acme Retail Ltd",
        "registration_number": "BR12345",
        "contact_phone": "+94771234567",
        "business_address": "123 Galle Road, Colombo",
    }
    with pytest.raises(ValidationError) as exc_info:
        MerchantRegisterRequest(**data)
    assert "Passwords do not match" in str(exc_info.value)


def test_approval_status_enum():
    """Verify approval status enum values."""
    assert ApprovalStatus.PENDING == "pending"
    assert ApprovalStatus.APPROVED == "approved"
    assert ApprovalStatus.REJECTED == "rejected"


@pytest.mark.asyncio
async def test_register_merchant_validation_failure(async_client: AsyncClient):
    """
    Submitting an incomplete registration payload should return 422 Unprocessable Entity.
    """
    response = await async_client.post(
        "/api/v1/merchants/register",
        json={"email": "not-an-email"},
    )
    assert response.status_code == 422
