"""
Database engine & session factory.

Supports two modes:
  1. **Local PostgreSQL** (default) — standard asyncpg driver, no extras.
  2. **Supabase Session Pooler** — when DATABASE_USE_SUPABASE_POOLER=true the
     engine is configured with the connect-args needed by Supavisor
     (prepared_statement_cache_size=0) and sensible pool-recycle defaults so
     idle connections don't go stale behind the pooler.

Both modes use SQLAlchemy 2.x async with asyncpg.
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings

settings = get_settings()

# ── Connect args ────────────────────────────────────────────────────────
# Supabase Supavisor (session pooler) does NOT support prepared statements.
# Disabling the asyncpg prepared-statement cache avoids
# "prepared statement already exists" errors.
_connect_args: dict = {}
if settings.database_use_supabase_pooler:
    _connect_args["prepared_statement_cache_size"] = 0
    # Supabase requires SSL for remote connections
    _connect_args["ssl"] = "require"

# ── Engine ──────────────────────────────────────────────────────────────
engine = create_async_engine(
    settings.async_database_url,
    echo=settings.debug,
    pool_size=settings.database_pool_size,
    max_overflow=settings.database_max_overflow,
    pool_timeout=settings.database_pool_timeout,
    pool_recycle=settings.database_pool_recycle,
    pool_pre_ping=True,  # catch stale connections behind the pooler
    connect_args=_connect_args,
)

SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
