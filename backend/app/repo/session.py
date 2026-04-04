"""Database session management with async SQLAlchemy 2.0 and connection pooling."""

from __future__ import annotations

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.repo.db import Base  # noqa: F401 -- re-exported for Alembic

_app_engine: AsyncEngine | None = None
_iam_engine: AsyncEngine | None = None
_AppSessionFactory: async_sessionmaker[AsyncSession] | None = None
_IamSessionFactory: async_sessionmaker[AsyncSession] | None = None


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
    """Initialise database engines and session factories.

    Call once during application startup (e.g. in a FastAPI lifespan handler).
    """
    global _app_engine, _iam_engine, _AppSessionFactory, _IamSessionFactory

    settings = get_settings()

    _app_engine = _build_engine(settings.DATABASE_URL)
    _iam_engine = _build_engine(settings.IAM_DATABASE_URL)

    _AppSessionFactory = async_sessionmaker(
        bind=_app_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    _IamSessionFactory = async_sessionmaker(
        bind=_iam_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )


async def close_db() -> None:
    """Dispose of database engines and release connection pools.

    Call during application shutdown.
    """
    global _app_engine, _iam_engine, _AppSessionFactory, _IamSessionFactory

    if _app_engine is not None:
        await _app_engine.dispose()
        _app_engine = None
    if _iam_engine is not None:
        await _iam_engine.dispose()
        _iam_engine = None

    _AppSessionFactory = None
    _IamSessionFactory = None


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


async def get_iam_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an async session for the IAM database."""
    assert _IamSessionFactory is not None, "Database not initialised -- call init_db() first"
    async with _IamSessionFactory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
