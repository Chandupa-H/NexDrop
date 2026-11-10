"""Courier-only in-memory profile data for use while courier auth is unfinished."""

from copy import deepcopy


MOCK_COURIER_PROFILE: dict[str, int | str] = {
    "id": 1,
    "full_name": "Poorna Danushka",
    "email": "poorna.courier@nexdrop.io",
    "contact_phone": "+94 77 123 4567",
    "status": "ACTIVE",
    "joined_date": "2026-01-15",
    "role": "courier",
}


def get_mock_courier_profile() -> dict[str, int | str]:
    return deepcopy(MOCK_COURIER_PROFILE)


def update_mock_courier_profile(*, full_name: str, contact_phone: str) -> dict[str, int | str]:
    MOCK_COURIER_PROFILE.update(full_name=full_name, contact_phone=contact_phone)
    return get_mock_courier_profile()
