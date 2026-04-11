from contextlib import asynccontextmanager

import boto3
import redis.asyncio as aioredis
from botocore.config import Config as BotoConfig
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import get_settings
from app.logger import get_logger, setup_logging

settings = get_settings()
setup_logging()
logger = get_logger(__name__)


async def _ping_database() -> None:
    from app.database import engine

    async with engine.connect() as conn:
        await conn.execute(text("SELECT 1"))
    logger.info("Database connection OK")


async def _ping_redis() -> None:
    client = aioredis.from_url(settings.redis_url, socket_connect_timeout=5)
    try:
        if not await client.ping():
            raise ConnectionError("Redis PING returned False")
        logger.info("Redis connection OK")
    finally:
        await client.aclose()


def _ping_minio() -> None:
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        config=BotoConfig(connect_timeout=5, read_timeout=5),
    )
    s3.head_bucket(Bucket=settings.s3_bucket)
    logger.info("MinIO connection OK (bucket=%s)", settings.s3_bucket)


async def _warmup() -> None:
    """Ping every external service at startup; log failures but don't block."""
    checks: list[tuple[str, callable]] = [
        ("Database", _ping_database()),
        ("Redis", _ping_redis()),
    ]
    for name, coro in checks:
        try:
            await coro
        except Exception:
            logger.warning("%s warmup ping failed", name, exc_info=True)

    # MinIO uses synchronous boto3
    try:
        _ping_minio()
    except Exception:
        logger.warning("MinIO warmup ping failed", exc_info=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await _warmup()
    # Prepopulate seed data (skips if data already exists)
    try:
        from app.seed import seed_database

        await seed_database()
    except Exception:
        logger.warning("Database seeding skipped (DB may be unavailable)", exc_info=True)
    yield
    # Shutdown
    from app.database import engine

    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register module routers ──────────────────────────────────────────

from app.modules.analytics.routes import router as analytics_router  # noqa: E402
from app.modules.fulfillment.routes import router as fulfillment_router  # noqa: E402
from app.modules.iam.routes import router as iam_router  # noqa: E402
from app.modules.notification_hub.routes import router as notification_router  # noqa: E402
from app.modules.order_management.routes import router as order_router  # noqa: E402
from app.modules.payment_processing.routes import router as payment_router  # noqa: E402
from app.modules.product_catalog.routes import router as product_catalog_router  # noqa: E402
from app.modules.subscription_engine.routes import router as subscription_router  # noqa: E402
from app.modules.tenant_config.routes import router as tenant_config_router  # noqa: E402

api_prefix = "/api/v1"

app.include_router(iam_router, prefix=api_prefix)
app.include_router(tenant_config_router, prefix=api_prefix)
app.include_router(product_catalog_router, prefix=api_prefix)
app.include_router(subscription_router, prefix=api_prefix)
app.include_router(order_router, prefix=api_prefix)
app.include_router(payment_router, prefix=api_prefix)
app.include_router(fulfillment_router, prefix=api_prefix)
app.include_router(notification_router, prefix=api_prefix)
app.include_router(analytics_router, prefix=api_prefix)


@app.get("/health")
async def health_check():
    services: dict[str, str] = {}

    try:
        await _ping_database()
        services["database"] = "ok"
    except Exception:
        services["database"] = "unavailable"

    try:
        await _ping_redis()
        services["redis"] = "ok"
    except Exception:
        services["redis"] = "unavailable"

    try:
        _ping_minio()
        services["minio"] = "ok"
    except Exception:
        services["minio"] = "unavailable"

    all_ok = all(v == "ok" for v in services.values())
    return {
        "status": "healthy" if all_ok else "degraded",
        "version": settings.app_version,
        "services": services,
    }
