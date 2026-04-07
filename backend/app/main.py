from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    yield
    # Shutdown
    from app.database import engine
    await engine.dispose()


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    lifespan=lifespan,
    root_path="/api/v1",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Register module routers ──────────────────────────────────────────

from app.modules.iam.routes import router as iam_router  # noqa: E402
from app.modules.tenant_config.routes import router as tenant_config_router  # noqa: E402
from app.modules.product_catalog.routes import router as product_catalog_router  # noqa: E402
from app.modules.subscription_engine.routes import router as subscription_router  # noqa: E402
from app.modules.order_management.routes import router as order_router  # noqa: E402
from app.modules.payment_processing.routes import router as payment_router  # noqa: E402
from app.modules.fulfillment.routes import router as fulfillment_router  # noqa: E402
from app.modules.notification_hub.routes import router as notification_router  # noqa: E402
from app.modules.analytics.routes import router as analytics_router  # noqa: E402

app.include_router(iam_router)
app.include_router(tenant_config_router)
app.include_router(product_catalog_router)
app.include_router(subscription_router)
app.include_router(order_router)
app.include_router(payment_router)
app.include_router(fulfillment_router)
app.include_router(notification_router)
app.include_router(analytics_router)


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": settings.app_version}
