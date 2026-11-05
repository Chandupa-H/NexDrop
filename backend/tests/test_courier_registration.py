from datetime import date
from io import BytesIO

import pytest
from pydantic import ValidationError
from starlette.datastructures import UploadFile
from httpx import ASGITransport, AsyncClient

from app.modules.auth.service import AuthService
from app.modules.couriers.documents import DocumentValidationError, validate_and_store_documents
from app.modules.couriers.schemas import CourierRegistrationRequest
from app.main import app
from app.db.session import get_db
from app.modules.couriers.models import Courier
from app.modules.users.models import User


def valid_payload(**updates):
    payload = {
        "full_name": "Nimali Perera", "email": "nimali@example.com",
        "password": "StrongPass1!", "confirm_password": "StrongPass1!",
        "date_of_birth": "1995-06-10", "gender": "female", "nic_number": "950123456V",
        "nationality": "Sri Lankan", "phone": "0771234567", "alternative_phone": "",
        "residential_address": "12 Flower Road", "city": "Colombo", "district": "Colombo",
        "postal_code": "00300", "vehicle_type": "motorcycle", "license_plate": "ABC-1234",
        "vehicle_brand": "Honda", "vehicle_model": "Dio", "vehicle_color": "Red",
        "vehicle_year": 2022, "driving_licence_number": "B1234567",
        "driving_licence_expiry": "2030-06-10", "emergency_contact_name": "Saman Perera",
        "emergency_contact_relationship": "Parent", "emergency_contact_phone": "+94 77 987 6543",
        "agree_terms": True, "agree_privacy": True, "confirm_accuracy": True,
    }
    payload.update(updates)
    return payload


def test_registration_normalizes_nic_and_sri_lankan_phones():
    request = CourierRegistrationRequest.model_validate(valid_payload(nic_number="200012345678", phone="+94 77 123 4567"))
    assert request.nic_number == "200012345678"
    assert request.phone == "+94771234567"
    assert request.emergency_contact_phone == "+94779876543"


@pytest.mark.parametrize("nic", ["12345678V", "123456789A", "12345678901"])
def test_registration_rejects_invalid_nic(nic):
    with pytest.raises(ValidationError):
        CourierRegistrationRequest.model_validate(valid_payload(nic_number=nic))


def test_registration_rejects_underage_applicant_or_expired_licence():
    with pytest.raises(ValidationError, match="at least 18"):
        CourierRegistrationRequest.model_validate(valid_payload(date_of_birth="2015-01-01"))
    with pytest.raises(ValidationError, match="must not be expired"):
        CourierRegistrationRequest.model_validate(valid_payload(driving_licence_expiry=date.today().isoformat()))


def test_password_hash_is_salted_and_verifiable():
    first = AuthService.hash_password("StrongPass1!")
    second = AuthService.hash_password("StrongPass1!")
    assert first != second
    assert AuthService.verify_password("StrongPass1!", first)
    assert not AuthService.verify_password("WrongPass1!", first)


@pytest.mark.asyncio
async def test_document_storage_accepts_signatures_and_uses_opaque_names(tmp_path, monkeypatch):
    import app.modules.couriers.documents as docs

    monkeypatch.setattr(docs, "DOCUMENT_DIRECTORY", tmp_path)
    files = {
        "nic_front": UploadFile(filename="nic.jpg", file=BytesIO(b"\xff\xd8\xff" + b"x" * 20), headers={"content-type": "image/jpeg"}),
        "nic_back": UploadFile(filename="nic-back.pdf", file=BytesIO(b"%PDF-1.7 sample"), headers={"content-type": "application/pdf"}),
        "licence_front": UploadFile(filename="license.png", file=BytesIO(b"\x89PNG\r\n\x1a\n" + b"x" * 20), headers={"content-type": "image/png"}),
        "licence_back": None,
        "vehicle_registration": UploadFile(filename="vehicle.pdf", file=BytesIO(b"%PDF-1.7 sample"), headers={"content-type": "application/pdf"}),
        "profile_photo": UploadFile(filename="photo.webp", file=BytesIO(b"RIFF" + b"x" * 4 + b"WEBP" + b"x" * 10), headers={"content-type": "image/webp"}),
    }
    stored = await validate_and_store_documents(files)
    assert set(stored) == {"nic_front", "nic_back", "licence_front", "vehicle_registration", "profile_photo"}
    assert all("nic.jpg" not in filename and (tmp_path / filename).is_file() for filename in stored.values())


@pytest.mark.asyncio
async def test_document_storage_rejects_mismatched_and_oversized_files(tmp_path, monkeypatch):
    import app.modules.couriers.documents as docs

    monkeypatch.setattr(docs, "DOCUMENT_DIRECTORY", tmp_path)
    invalid = UploadFile(filename="forged.jpg", file=BytesIO(b"not an image"), headers={"content-type": "image/jpeg"})
    with pytest.raises(DocumentValidationError, match="valid JPG"):
        await validate_and_store_documents({"profile_photo": invalid})

    oversized = UploadFile(filename="large.jpg", file=BytesIO(b"\xff\xd8\xff" + b"x" * (5 * 1024 * 1024)), headers={"content-type": "image/jpeg"})
    with pytest.raises(DocumentValidationError, match="5 MB"):
        await validate_and_store_documents({"profile_photo": oversized})


@pytest.mark.asyncio
async def test_registration_endpoint_creates_pending_inactive_courier(tmp_path, monkeypatch):
    import app.modules.couriers.documents as docs

    monkeypatch.setattr(docs, "DOCUMENT_DIRECTORY", tmp_path)

    class EmptyResult:
        def scalars(self):
            return self

        def first(self):
            return None

    class FakeSession:
        def __init__(self):
            self.added = []

        async def execute(self, _query):
            return EmptyResult()

        def add(self, entity):
            self.added.append(entity)

        async def flush(self):
            entity = self.added[-1]
            entity.id = 71 if isinstance(entity, User) else 42

        async def refresh(self, _entity):
            return None

        async def commit(self):
            return None

        async def rollback(self):
            return None

    db_session = FakeSession()

    async def fake_db():
        yield db_session

    app.dependency_overrides[get_db] = fake_db
    form = valid_payload()
    form["date_of_birth"] = form["date_of_birth"].isoformat() if isinstance(form["date_of_birth"], date) else form["date_of_birth"]
    files = {
        "nic_front": ("nic.jpg", b"\xff\xd8\xff" + b"x" * 20, "image/jpeg"),
        "nic_back": ("nic-back.pdf", b"%PDF-1.7 sample", "application/pdf"),
        "licence_front": ("licence.png", b"\x89PNG\r\n\x1a\n" + b"x" * 20, "image/png"),
        "vehicle_registration": ("registration.pdf", b"%PDF-1.7 sample", "application/pdf"),
        "profile_photo": ("photo.jpg", b"\xff\xd8\xff" + b"x" * 20, "image/jpeg"),
    }
    try:
        async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
            response = await client.post("/api/v1/couriers/register", data=form, files=files)
        assert response.status_code == 201, response.text
        assert response.json()["approval_status"] == "pending"
        assert "pending administrator review" in response.json()["message"]
        user = next(entity for entity in db_session.added if isinstance(entity, User))
        courier = next(entity for entity in db_session.added if isinstance(entity, Courier))
        assert user.is_active is False
        assert user.role.value == "courier"
        assert AuthService.verify_password("StrongPass1!", user.hashed_password)
        assert courier.is_available is False
        assert courier.nic_number == "950123456V"
        assert len(courier.document_files) == 5
    finally:
        app.dependency_overrides.pop(get_db, None)
