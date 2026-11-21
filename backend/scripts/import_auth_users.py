"""Import missing Supabase identities as Unassigned. Dry-run unless --apply."""
import argparse
import asyncio
import json
import secrets
import sys
from pathlib import Path
from uuid import UUID

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db.session import get_session_factory
from app.modules.admin.auth import auth_request
from app.modules.users.models import User, UserRole


async def run(apply=False):
    accounts = []
    page = 1
    while True:
        response = await auth_request("GET", f"/admin/users?page={page}&per_page=100")
        response.raise_for_status()
        batch = response.json().get("users", [])
        accounts.extend(batch)
        if len(batch) < 100:
            break
        page += 1

    factory = get_session_factory()
    if factory is None:
        raise RuntimeError("Application database is not configured")
    async with factory() as session:
        rows = (await session.execute(select(User.email, User.supabase_user_id))).all()
        existing_by_email = {}
        existing_subjects = set()
        for email, supabase_user_id in rows:
            existing_by_email.setdefault(email.strip().lower(), []).append(
                supabase_user_id
            )
            if supabase_user_id is not None:
                existing_subjects.add(supabase_user_id)

        missing = []
        already_linked = 0
        existing_unlinked = 0
        conflicts = 0
        for identity in accounts:
            email = identity.get("email")
            subject = identity.get("id")
            if not isinstance(email, str) or not email.strip():
                conflicts += 1
                continue
            try:
                supabase_user_id = UUID(subject)
            except (TypeError, ValueError):
                conflicts += 1
                continue

            email_key = email.strip().lower()
            email_rows = existing_by_email.get(email_key, [])
            if email_rows:
                if len(email_rows) == 1 and email_rows[0] == supabase_user_id:
                    already_linked += 1
                elif len(email_rows) == 1 and email_rows[0] is None:
                    existing_unlinked += 1
                else:
                    conflicts += 1
                continue
            if supabase_user_id in existing_subjects:
                conflicts += 1
                continue
            missing.append((identity, email_key, supabase_user_id))

        imported = 0
        if apply:
            for identity, email, supabase_user_id in missing:
                metadata = identity.get("user_metadata") or {}
                name = metadata.get("full_name") or metadata.get("name") or email.split("@")[0]
                result = await session.execute(insert(User).values(
                    supabase_user_id=supabase_user_id,
                    email=email,
                    full_name=str(name)[:255],
                    hashed_password="supabase-managed:" + secrets.token_urlsafe(32),
                    role=UserRole.UNASSIGNED,
                    is_active=True,
                ).on_conflict_do_nothing().returning(User.id))
                if result.scalar_one_or_none():
                    imported += 1

            await session.commit()

        print(json.dumps({
            "mode": "applied" if apply else "dry-run",
            "missing_backend_users": len(missing),
            "already_linked": already_linked,
            "existing_unlinked_requires_verified_signup": existing_unlinked,
            "conflicts_or_invalid_supabase_ids": conflicts,
            "imported": imported,
        }, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    asyncio.run(run(parser.parse_args().apply))
