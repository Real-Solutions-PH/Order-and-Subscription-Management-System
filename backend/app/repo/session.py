"""Database session management with async SQLAlchemy 2.0 and connection pooling."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy import text
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.repo.db import Base  # noqa: F401 -- re-exported for Alembic

_app_engine: AsyncEngine | None = None
_AppSessionFactory: async_sessionmaker[AsyncSession] | None = None


def _build_engine(url: str) -> AsyncEngine:
    """Create an async engine with pool settings from configuration."""
    settings = get_settings()
    return create_async_engine(
        url,
        echo=settings.DATABASE_ECHO,
        pool_size=settings.DATABASE_POOL_SIZE,
        max_overflow=settings.DATABASE_MAX_OVERFLOW,
        pool_timeout=settings.DATABASE_POOL_TIMEOUT,
        pool_pre_ping=True,
    )


async def init_db() -> None:
    """Initialise database engine and session factory.

    Call once during application startup (e.g. in a FastAPI lifespan handler).
    """
    global _app_engine, _AppSessionFactory

    settings = get_settings()

    _app_engine = _build_engine(settings.DATABASE_URL)

    _AppSessionFactory = async_sessionmaker(
        bind=_app_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    # Warmup: open one connection so the pool is primed before
    # the application starts accepting requests.
    async with _app_engine.connect() as conn:
        await conn.execute(text("SELECT 1"))


async def close_db() -> None:
    """Dispose of database engine and release connection pool.

    Call during application shutdown.
    """
    global _app_engine, _AppSessionFactory

    if _app_engine is not None:
        await _app_engine.dispose()
        _app_engine = None

    _AppSessionFactory = None


async def get_app_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async session for the application database."""
    assert _AppSessionFactory is not None, "Database not initialised -- call init_db() first"
    async with _AppSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
