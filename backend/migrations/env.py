import asyncio
from logging.config import fileConfig
import os
import sys

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config
from alembic import context

# Ensure app is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.config import settings
from app.db.base import Base

# Import all models to populate Base.metadata for autogenerate
from app.modules.users.models import User  # noqa: F401
from app.modules.customers.models import Customer  # noqa: F401
from app.modules.merchants.models import Merchant  # noqa: F401
from app.modules.couriers.models import Courier  # noqa: F401
from app.modules.parcels.models import Parcel  # noqa: F401
from app.modules.dispatch.models import DispatchAssignment  # noqa: F401
from app.modules.pricing.models import PricingTier  # noqa: F401
from app.modules.notifications.models import Notification  # noqa: F401
from app.modules.webhooks.models import WebhookSubscription  # noqa: F401

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def get_url() -> str:
    url = settings.DATABASE_URL or os.getenv("DATABASE_URL", "postgresql+asyncpg://postgres:postgres@localhost:5432/nexdrop")
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and "+asyncpg" not in url:
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def do_run_migrations(connection: Connection) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
    )
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    configuration["sqlalchemy.url"] = get_url()

    connect_args = {}
    db_url = configuration.get("sqlalchemy.url", "")
    if any(host in db_url for host in ("neon.tech", "supabase.com", "supabase.co")):
        connect_args["ssl"] = "require"

    connectable = async_engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args,
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


def run_migrations_offline() -> None:
    url = get_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
