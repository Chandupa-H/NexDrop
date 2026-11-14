"""Customer-account boundary. No request-supplied identity or guessed mapping."""
from dataclasses import dataclass
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import Optional
from app.db.session import get_optional_db
from app.modules.customers.repository import CustomerRepository
from app.modules.customers.service import CustomerService


@dataclass(frozen=True)
class VerifiedCustomerProfileIdentity:
    """Platform adapter must supply the resolved, active customer User's integer ID.

    A Supabase UUID, request body/header user ID, or email lookup is not this contract.
    Token verification, role checks and UUID mapping belong to Platform integration.
    """
    user_id: int

    def __post_init__(self):
        if type(self.user_id) is not int or self.user_id <= 0:
            raise ValueError("A resolved application user identity is required")


async def get_verified_customer_profile_identity() -> VerifiedCustomerProfileIdentity:
    # Deliberately has no request parameters or production override switch.
    raise HTTPException(503, detail="Customer account identity verification is unavailable. Profile changes are disabled until Platform integration is ready.")


def get_customer_profile_service(
    identity: VerifiedCustomerProfileIdentity = Depends(get_verified_customer_profile_identity),
    session: Optional[AsyncSession] = Depends(get_optional_db),
) -> CustomerService:
    # Identity resolves before the DB dependency. Missing identity never opens a session.
    if session is None:
        raise HTTPException(503, detail="Customer account storage is unavailable.")
    return CustomerService(CustomerRepository(session))
