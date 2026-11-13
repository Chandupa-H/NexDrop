import logging
from typing import AsyncGenerator, Optional
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from app.core.config import settings

logger = logging.getLogger(__name__)

_engine: Optional[AsyncEngine] = None
_sessionmaker: Optional[async_sessionmaker[AsyncSession]] = None


def get_async_database_url(url: Optional[str]) -> Optional[str]:
    """
    Format database URL for asyncpg and Neon PostgreSQL compatibility.
    """
    if not url:
        return None

    # Replace postgresql:// or postgres:// with postgresql+asyncpg://
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Neon connections often require ssl
    return url


def get_engine() -> Optional[AsyncEngine]:
    global _engine
    if _engine is None and settings.DATABASE_URL:
        db_url = get_async_database_url(settings.DATABASE_URL)
        if db_url:
            # Neon serverless PostgreSQL works well with pre-ping
            connect_args = {}
            if any(host in db_url for host in ("neon.tech", "supabase.com", "supabase.co")):
                connect_args["ssl"] = "require"

            _engine = create_async_engine(
                db_url,
                echo=settings.DEBUG,
                pool_pre_ping=True,
                connect_args=connect_args,
            )
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
        finally:
            await session.close()
