from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Order & Subscription Management System"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"

    # ── Database (Supabase) ─────────────────────────────────────────────
    # Paste the Session Pooler URI straight from the Supabase dashboard.
    # The scheme is auto-normalised to postgresql+asyncpg:// at startup.
    # Format: postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/osms_app"

    # Pool tuning — sensible defaults for Supabase session pooler
    database_pool_size: int = 20
    database_max_overflow: int = 10
    database_pool_timeout: int = 30
    database_pool_recycle: int = 300  # recycle connections every 5 min (Supavisor friendly)

    # Set to True when connecting through Supabase Supavisor pooler
    database_use_supabase_pooler: bool = False

    @property
    def async_database_url(self) -> str:
        """Return the database URL with the asyncpg driver scheme.

        Supabase dashboard gives ``postgresql://`` URIs which default to
        the synchronous psycopg2 driver.  This property rewrites the
        scheme so it always uses ``asyncpg`` — the async driver required
        by SQLAlchemy's asyncio extension.
        """
        url = self.database_url
        if url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        if url.startswith("postgres://"):
            return url.replace("postgres://", "postgresql+asyncpg://", 1)
        if url.startswith("postgresql+psycopg2://"):
            return url.replace("postgresql+psycopg2://", "postgresql+asyncpg://", 1)
        return url

    # Redis (optional — not used in MVP)
    enable_redis: bool = False
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # S3 / MinIO (optional — not used in MVP)
    enable_minio: bool = False
    s3_endpoint: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket: str = "osms"

    # PayMongo
    paymongo_secret_key: str = ""
    paymongo_public_key: str = ""
    paymongo_webhook_secret: str = ""

    # Seed / Default Tenant & Admin
    seed_tenant_id: str = "00000000-0000-0000-0000-000000000001"
    seed_tenant_name: str = "Default Tenant"
    seed_tenant_slug: str = "default"
    seed_business_name: str = "Default Business"
    seed_timezone: str = "Asia/Manila"
    seed_admin_email: str = "admin@example.com"
    seed_admin_password: str = "changeme123"
    seed_admin_first_name: str = "Admin"
    seed_admin_last_name: str = "User"

    # Template data seeding — set to false to skip sample meals, plans, zones, etc.
    seed_template_data: bool = True

    model_config = {
        "env_file": ("../.env", ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
