"""Import missing Supabase identities as Unassigned. Dry-run unless --apply."""
import argparse
import asyncio
import json
import secrets
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import func, select
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
        existing = set((await session.execute(select(func.lower(User.email)))).scalars())
        missing = [u for u in accounts if u.get("email") and u["email"].strip().lower() not in existing]
        imported = []
        for identity in missing:
            email = identity["email"].strip().lower()
            metadata = identity.get("user_metadata") or {}
            name = metadata.get("full_name") or metadata.get("name") or email.split("@")[0]
            if apply:
                result = await session.execute(insert(User).values(
                    email=email, full_name=str(name)[:255],
                    hashed_password="supabase-managed:" + secrets.token_hex(32),
                    role=UserRole.UNASSIGNED, is_active=True,
                ).on_conflict_do_nothing(index_elements=[User.email]).returning(User.email))
                if result.scalar_one_or_none():
                    imported.append(email)
        if apply:
            await session.commit()
        print(json.dumps({"mode": "applied" if apply else "dry-run", "missing": [u["email"] for u in missing], "imported": imported}, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true")
    asyncio.run(run(parser.parse_args().apply))
