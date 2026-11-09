import pytest
from httpx import AsyncClient
from cloudinary.exceptions import AuthorizationRequired

from app.modules.couriers import routes
from app.modules.couriers import cloudinary_service
from app.modules.couriers.cloudinary_service import CloudinaryServiceError


@pytest.fixture
def result_parcel(monkeypatch):
    parcel = {
        "tracking_id": "NXD-RESULT-TEST",
        "customer_name": "Test Recipient",
        "phone": "+94770000000",
        "destination": "Colombo",
        "address": "Test address",
        "status": "out_for_delivery",
        "assigned_at": "2026-11-01T08:00:00+05:30",
        "eta": None,
        "notes": [],
        "timeline": [{
            "status": "out_for_delivery",
            "label": "Out for Delivery",
            "occurred_at": "2026-11-01T08:00:00+05:30",
        }],
    }
    monkeypatch.setattr(routes, "_MOCK_PARCELS", [parcel])
    return parcel


def png_file(content=b"\x89PNG\r\n\x1a\nmock-image"):
    return {"proof_file": ("proof.png", content, "image/png")}


@pytest.mark.asyncio
async def test_success_requires_recipient_and_uploaded_proof(async_client: AsyncClient, result_parcel):
    missing_name = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/success",
        json={"recipient_name": "  ", "confirmed": True},
    )
    assert missing_name.status_code == 422

    missing_proof = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/success",
        json={"recipient_name": "Recipient", "confirmed": True},
    )
    assert missing_proof.status_code == 422
    assert result_parcel["status"] == "out_for_delivery"


@pytest.mark.asyncio
async def test_proof_photo_required_by_upload_endpoint(async_client: AsyncClient, result_parcel):
    response = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/proof"
    )
    assert response.status_code == 422
    assert result_parcel["status"] == "out_for_delivery"


@pytest.mark.asyncio
async def test_proof_rejects_invalid_type_and_oversized_file(async_client: AsyncClient, result_parcel):
    invalid_type = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/proof",
        files={"proof_file": ("bad.svg", b"<svg/>", "image/svg+xml")},
    )
    assert invalid_type.status_code == 415

    oversized = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/proof",
        files=png_file(b"\x89PNG\r\n\x1a\n" + b"x" * (routes.MAX_PROOF_IMAGE_BYTES + 1)),
    )
    assert oversized.status_code == 413
    assert result_parcel["status"] == "out_for_delivery"


@pytest.mark.asyncio
async def test_cloudinary_upload_failure_keeps_status_unchanged(async_client: AsyncClient, result_parcel, monkeypatch):
    def fail_upload(*_args):
        raise CloudinaryServiceError("Cloudinary proof upload failed")

    monkeypatch.setattr(routes, "upload_cloudinary_image", fail_upload)
    response = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/proof",
        files=png_file(),
    )
    assert response.status_code == 502
    assert result_parcel["status"] == "out_for_delivery"
    assert "delivery_proof" not in result_parcel


def test_cloudinary_authorization_failure_is_reported_without_provider_details(monkeypatch, caplog):
    class UnauthorizedUploader:
        @staticmethod
        def upload(*_args, **_kwargs):
            raise AuthorizationRequired("API secret value must never be logged")

    monkeypatch.setattr(
        cloudinary_service,
        "_cloudinary",
        lambda: type("Cloudinary", (), {"uploader": UnauthorizedUploader})(),
    )

    with pytest.raises(CloudinaryServiceError, match="rejected the backend credentials"):
        cloudinary_service.upload_image(b"image-bytes", "proof.png")

    assert "HTTP 401" in caplog.text
    assert "API secret value" not in caplog.text


def test_cloudinary_sdk_uploader_submodule_is_loaded(monkeypatch):
    monkeypatch.setattr(cloudinary_service.settings, "CLOUDINARY_CLOUD_NAME", "test-cloud")
    monkeypatch.setattr(cloudinary_service.settings, "CLOUDINARY_API_KEY", "test-key")
    monkeypatch.setattr(cloudinary_service.settings, "CLOUDINARY_API_SECRET", "test-secret")

    sdk = cloudinary_service._cloudinary()

    assert hasattr(sdk, "uploader")
    assert callable(sdk.uploader.upload)


@pytest.mark.asyncio
async def test_successful_delivery_upload_and_result(async_client: AsyncClient, result_parcel, monkeypatch):
    monkeypatch.setattr(
        routes,
        "upload_cloudinary_image",
        lambda *_args: {"secure_url": "https://res.cloudinary.test/proof.jpg", "public_id": "proof-1"},
    )
    upload = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/proof",
        files=png_file(),
    )
    assert upload.status_code == 200
    assert result_parcel["status"] == "out_for_delivery"
    assert upload.json()["public_id"] == "proof-1"

    response = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/success",
        json={"recipient_name": "Recipient Name", "confirmed": True},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "delivered"
    assert data["delivery_result"]["recipient_name"] == "Recipient Name"
    assert data["delivery_proof"]["secure_url"] == "https://res.cloudinary.test/proof.jpg"
    assert data["delivery_proof"]["public_id"] == "proof-1"


@pytest.mark.asyncio
async def test_success_requires_confirmation(async_client: AsyncClient, result_parcel, monkeypatch):
    result_parcel["delivery_proof"] = {"secure_url": "https://proof.test/a", "public_id": "proof-a"}
    response = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/success",
        json={"recipient_name": "Recipient", "confirmed": False},
    )
    assert response.status_code == 422
    assert result_parcel["status"] == "out_for_delivery"


@pytest.mark.asyncio
async def test_failed_delivery_requires_reason_and_stores_structured_result(async_client: AsyncClient, result_parcel):
    missing_reason = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/failure",
        json={"failure_reason": "  ", "confirmed": True},
    )
    assert missing_reason.status_code == 422

    response = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/failure",
        json={"failure_reason": "customer_unavailable", "note": "No response", "confirmed": True},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "failed"
    assert response.json()["delivery_result"]["failure_reason"] == "customer_unavailable"
    assert response.json()["delivery_result"]["note"] == "No response"


@pytest.mark.asyncio
async def test_failed_delivery_requires_explicit_confirmation(async_client: AsyncClient, result_parcel):
    response = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/failure",
        json={"failure_reason": "customer_unavailable", "confirmed": False},
    )
    assert response.status_code == 422
    assert result_parcel["status"] == "out_for_delivery"


@pytest.mark.asyncio
async def test_proof_delete_calls_cloudinary(async_client: AsyncClient, result_parcel, monkeypatch):
    result_parcel["delivery_proof"] = {"secure_url": "https://proof.test/a", "public_id": "proof-a"}
    deleted = []
    monkeypatch.setattr(routes, "delete_cloudinary_image", lambda public_id: deleted.append(public_id))

    response = await async_client.delete(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/proof"
    )
    assert response.status_code == 200
    assert deleted == ["proof-a"]
    assert result_parcel["delivery_proof"] is None


@pytest.mark.asyncio
async def test_replacement_retains_failed_cleanup_for_retry(async_client: AsyncClient, result_parcel, monkeypatch):
    result_parcel["delivery_proof"] = {"secure_url": "https://proof.test/old", "public_id": "old-proof"}
    monkeypatch.setattr(
        routes,
        "upload_cloudinary_image",
        lambda *_args: {"secure_url": "https://proof.test/new", "public_id": "new-proof"},
    )

    def fail_delete(_public_id):
        raise CloudinaryServiceError("Cloudinary proof deletion failed")

    monkeypatch.setattr(routes, "delete_cloudinary_image", fail_delete)
    replacement = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/proof",
        files=png_file(),
    )
    assert replacement.status_code == 200
    assert result_parcel["delivery_proof"]["public_id"] == "new-proof"
    assert result_parcel["proof_cleanup_pending"] == ["old-proof"]

    retried = []
    monkeypatch.setattr(routes, "delete_cloudinary_image", lambda public_id: retried.append(public_id))
    completed = await async_client.post(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/success",
        json={"recipient_name": "Recipient", "confirmed": True},
    )
    assert completed.status_code == 200
    assert retried == ["old-proof"]
    assert result_parcel["status"] == "delivered"
    assert result_parcel["proof_cleanup_pending"] == []


@pytest.mark.asyncio
async def test_failed_proof_deletion_preserves_reference_for_retry(async_client: AsyncClient, result_parcel, monkeypatch):
    result_parcel["delivery_proof"] = {"secure_url": "https://proof.test/a", "public_id": "proof-a"}

    def fail_delete(_public_id):
        raise CloudinaryServiceError("Cloudinary proof deletion failed")

    monkeypatch.setattr(routes, "delete_cloudinary_image", fail_delete)
    response = await async_client.delete(
        "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/delivery-result/proof"
    )
    assert response.status_code == 502
    assert result_parcel["delivery_proof"]["public_id"] == "proof-a"


@pytest.mark.asyncio
async def test_generic_status_cannot_bypass_result(async_client: AsyncClient, result_parcel):
    for result_status in ("delivered", "failed"):
        response = await async_client.patch(
            "/api/v1/couriers/courier/parcels/NXD-RESULT-TEST/status",
            json={"status": result_status, "failure_reason": "customer_unavailable"},
        )
        assert response.status_code == 409
    assert result_parcel["status"] == "out_for_delivery"
