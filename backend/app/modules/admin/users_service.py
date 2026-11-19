"""Administrative edits keep application and authentication roles in sync."""
import logging
import secrets

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.admin.auth import find_auth_user, update_auth_user
from app.modules.admin.schemas import AdminUserUpdate
from app.modules.couriers.models import Courier
from app.modules.merchants.models import Merchant, ApprovalStatus
from app.modules.users.models import User, UserRole

logger = logging.getLogger(__name__)


async def edit_user(session: AsyncSession, user_id: int, payload: AdminUserUpdate, caller: dict):
    user = (await session.execute(select(User).where(User.id == user_id).with_for_update())).scalars().first()
    if user is None:
        raise HTTPException(404, "User not found.")
    if user.email.lower() == (caller.get("email") or "").lower() and payload.role != UserRole.ADMIN:
        raise HTTPException(400, "You cannot remove your own administrator access.")

    identity = await find_auth_user(user.email)
    previous = {
        "app_metadata": identity.get("app_metadata") or {},
        "user_metadata": identity.get("user_metadata") or {},
    }
    synchronized = False
    try:
        user.full_name = payload.full_name
        user.role = payload.role
        if payload.role == UserRole.COURIER:
            courier = (await session.execute(select(Courier).where(Courier.user_id == user.id))).scalars().first()
            if courier is None:
                session.add(Courier(user_id=user.id, vehicle_type=payload.vehicle_type,
                                    license_plate=payload.license_plate, is_available=user.is_active))
        if payload.role == UserRole.MERCHANT:
            merchant = (await session.execute(select(Merchant).where(Merchant.user_id == user.id))).scalars().first()
            if merchant is None:
                if not all([payload.business_name, payload.registration_number, payload.phone, payload.business_address]):
                    raise HTTPException(422, "Business name, registration number, phone and address are required for a new merchant profile.")
                duplicate = (await session.execute(select(Merchant).where(Merchant.registration_number == payload.registration_number))).scalars().first()
                if duplicate:
                    raise HTTPException(409, "This business registration number is already in use.")
                session.add(Merchant(user_id=user.id, business_name=payload.business_name,
                    registration_number=payload.registration_number, contact_phone=payload.phone,
                    business_address=payload.business_address,
                    approval_status=ApprovalStatus.APPROVED if user.is_active else ApprovalStatus.PENDING,
                    api_key=f"nd_live_{secrets.token_hex(16)}" if user.is_active else None))
        await session.flush()
        await update_auth_user(identity["id"], {
            "app_metadata": {**previous["app_metadata"], "role": payload.role.value},
            "user_metadata": {**previous["user_metadata"], "full_name": payload.full_name, "role": payload.role.value},
        })
        synchronized = True
        await session.commit()
    except Exception:
        await session.rollback()
        if synchronized:
            try:
                await update_auth_user(identity["id"], previous)
            except HTTPException:
                logger.error("Unable to restore Supabase metadata for user %s", identity["id"])
        raise
