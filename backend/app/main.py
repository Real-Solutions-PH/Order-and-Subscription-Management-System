"""FastAPI application factory."""

import logging
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import ORJSONResponse

from app.config import get_settings
from app.middleware.logging import RequestLoggingMiddleware
from app.middleware.tenant import TenantContextMiddleware
from app.repo.session import close_db, init_db


def _setup_logging() -> None:
    """Configure structured logging."""
    settings = get_settings()
    log_level = getattr(logging, settings.LOG_LEVEL.upper(), logging.INFO)

    handler = logging.StreamHandler(sys.stdout)
    if settings.LOG_FORMAT == "json":
        formatter = logging.Formatter(
            '{"time":"%(asctime)s","level":"%(levelname)s","logger":"%(name)s","message":"%(message)s"}'
        )
    else:
        formatter = logging.Formatter("%(asctime)s | %(levelname)-8s | %(name)s | %(message)s")

    handler.setFormatter(formatter)

    root_logger = logging.getLogger("prepflow")
    root_logger.setLevel(log_level)
    root_logger.addHandler(handler)

    # Quiet noisy loggers
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: startup and shutdown events."""
    _setup_logging()
    logger = logging.getLogger("prepflow.app")
    logger.info("Starting PrepFlow API...")

    await init_db()
    logger.info("Database connections established")

    yield

    await close_db()
    logger.info("Database connections closed. Shutting down.")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Order & Subscription Management System API",
        docs_url="/docs" if settings.is_development else None,
        redoc_url="/redoc" if settings.is_development else None,
        openapi_url="/openapi.json" if settings.is_development else None,
        default_response_class=ORJSONResponse,
        lifespan=lifespan,
    )

    # --- Middleware (order matters: last added = first executed) ---
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)
    app.add_middleware(TenantContextMiddleware)

    # --- Register routers ---
    _register_routers(app, settings.API_V1_PREFIX)

    # --- Health check ---
    @app.get("/health", tags=["health"])
    async def health_check():
        return {"status": "healthy", "version": settings.APP_VERSION}

    return app


def _register_routers(app: FastAPI, prefix: str) -> None:
    """Register all API v1 routers."""
    from app.routes.v1.analytics import router as analytics_router
    from app.routes.v1.auth import router as auth_router
    from app.routes.v1.cart import router as cart_router
    from app.routes.v1.catalogs import router as catalogs_router
    from app.routes.v1.fulfillment import router as fulfillment_router
    from app.routes.v1.integrations import router as integrations_router
    from app.routes.v1.notifications import router as notifications_router
    from app.routes.v1.orders import router as orders_router
    from app.routes.v1.payments import router as payments_router
    from app.routes.v1.products import router as products_router
    from app.routes.v1.subscriptions import router as subscriptions_router
    from app.routes.v1.tenant import router as tenant_router
    from app.routes.v1.users import router as users_router

    app.include_router(auth_router, prefix=prefix)
    app.include_router(users_router, prefix=prefix)
    app.include_router(tenant_router, prefix=prefix)
    app.include_router(products_router, prefix=prefix)
    app.include_router(catalogs_router, prefix=prefix)
    app.include_router(subscriptions_router, prefix=prefix)
    app.include_router(cart_router, prefix=prefix)
    app.include_router(orders_router, prefix=prefix)
    app.include_router(payments_router, prefix=prefix)
    app.include_router(fulfillment_router, prefix=prefix)
    app.include_router(notifications_router, prefix=prefix)
    app.include_router(analytics_router, prefix=prefix)
    app.include_router(integrations_router, prefix=prefix)


app = create_app()
