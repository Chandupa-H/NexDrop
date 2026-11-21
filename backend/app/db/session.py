import logging
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.pool import NullPool
from app.core.config import settings

logger = logging.getLogger(__name__)

_engine: Optional[AsyncEngine] = None
_sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None
_engine_loop = None

# Supabase session-mode pooler (port 5432) caps at 15 clients total.
# Using NullPool means SQLAlchemy does NOT maintain persistent connections —
# each session borrows a connection from PgBouncer and returns it immediately.
# This is the recommended pattern for serverless / PgBouncer session-mode setups.
_IS_SUPABASE_SESSION_MODE = False


def get_async_database_url(url: Optional[str]) -> Optional[str]:
    """
    Format database URL for asyncpg and Neon/Supabase PostgreSQL compatibility.
    """
    if not url:
        return None

    # Replace postgresql:// or postgres:// with postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    return url


def _detect_supabase_session_mode(url: str) -> bool:
    """Return True when using Supabase's session-mode pooler (port 5432)."""
    is_supabase = any(h in url for h in ("supabase.com", "supabase.co"))
    # Port 5432 = session mode, 6543 = transaction mode
    has_session_port = ":5432/" in url or url.endswith(":5432")
    return is_supabase and has_session_port


def _detect_supabase_transaction_mode(url: str) -> bool:
    """Return True when using Supabase's transaction-mode pooler (port 6543)."""
    is_supabase = any(h in url for h in ("supabase.com", "supabase.co"))
    has_transaction_port = ":6543/" in url or url.endswith(":6543")
    return is_supabase and has_transaction_port


def get_engine() -> Optional[AsyncEngine]:
    global _engine, _sessionmaker, _engine_loop, _IS_SUPABASE_SESSION_MODE
    try:
        import asyncio
        current_loop = asyncio.get_running_loop()
    except RuntimeError:
        current_loop = None

    if _engine is not None and _engine_loop is not None:
        if _engine_loop != current_loop:
            _engine = None
            _sessionmaker = None
            _engine_loop = None

    if _engine is None and settings.DATABASE_URL:
        db_url = get_async_database_url(settings.DATABASE_URL)
        if db_url:
            connect_args = {}
            is_supabase = any(h in db_url for h in ("neon.tech", "supabase.com", "supabase.co"))
            if is_supabase:
                connect_args["ssl"] = "require"

            _IS_SUPABASE_SESSION_MODE = _detect_supabase_session_mode(db_url)
            is_transaction_mode = _detect_supabase_transaction_mode(db_url)

            if is_transaction_mode:
                # Transaction mode: PgBouncer routes each transaction to a
                # potentially different backend connection, so asyncpg's prepared
                # statement handles become invalid immediately after the transaction.
                # Two settings are required:
                #   prepared_statement_cache_size=0  — stops asyncpg caching stmt handles
                #   statement_cache_size=0           — stops asyncpg using the extended
                #                                     (binary) query protocol entirely,
                #                                     which is what triggers the
                #                                     "_introspect_types" prepare call
                #                                     that fails on recycled connections.
                connect_args["prepared_statement_cache_size"] = 0
                connect_args["statement_cache_size"] = 0

            # Strip query params from the URL — asyncpg doesn't read them and
            # they cause connection errors. Settings are passed via connect_args.
            if "?" in db_url:
                db_url = db_url.split("?")[0]

            if _IS_SUPABASE_SESSION_MODE:
                # Session-mode: use NullPool so SQLAlchemy never holds idle
                # connections open, staying well under PgBouncer's 15-client cap.
                logger.info(
                    "Supabase session-mode pooler detected (port 5432). "
                    "Using NullPool — connections are opened/closed per request."
                )
                _engine = create_async_engine(
                    db_url,
                    echo=settings.DEBUG,
                    poolclass=NullPool,
                    connect_args=connect_args,
                )
            else:
                # Transaction mode (port 6543) or direct connection: use a
                # bounded SQLAlchemy pool for efficiency.
                # NOTE: pool_pre_ping MUST be False for transaction mode —
                # asyncpg's ping uses a prepared statement internally, which
                # PgBouncer destroys when it rotates the backend connection,
                # causing "prepared statement does not exist" errors.
                # PgBouncer manages connection health itself, so pre-ping is
                # neither needed nor safe here.
                logger.info(
                    "Using bounded connection pool "
                    f"(pool_size={settings.DATABASE_POOL_SIZE}, "
                    f"max_overflow={settings.DATABASE_MAX_OVERFLOW})."
                )
                _engine = create_async_engine(
                    db_url,
                    echo=settings.DEBUG,
                    pool_pre_ping=False,
                    pool_size=settings.DATABASE_POOL_SIZE,
                    max_overflow=settings.DATABASE_MAX_OVERFLOW,
                    pool_timeout=30,
                    pool_recycle=1800,
                    connect_args=connect_args,
                )

            _engine_loop = current_loop
            logger.info("SQLAlchemy async engine initialized.")
    return _engine


def get_session_factory() -> Optional[async_sessionmaker[AsyncSession]]:
    global _sessionmaker
    engine = get_engine()
    if engine is not None and _sessionmaker is None:
        _sessionmaker = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _sessionmaker


from fastapi import HTTPException, status

async def get_optional_db() -> AsyncGenerator[Optional[AsyncSession], None]:
    """
    Yields AsyncSession if configured, or None if database is unconfigured or offline.
    Useful for routes with offline fallbacks.
    """
    try:
        session_factory = get_session_factory()
    except Exception as exc:
        logger.warning("Database unavailable, falling back to in-memory mode: %s", exc)
        yield None
        return

    if session_factory is None:
        yield None
        return

    try:
        session = session_factory()
    except Exception as exc:
        logger.warning("Database session creation failed, falling back to in-memory mode: %s", exc)
        yield None
        return

    try:
        async with session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise
    except Exception:
        raise


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency yielding an async database session.
    If database is unconfigured, raises HTTP 503 Service Unavailable.
    """
    session_factory = get_session_factory()
    if session_factory is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database connection is not configured. Set DATABASE_URL in environment.",
        )

    async with session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
