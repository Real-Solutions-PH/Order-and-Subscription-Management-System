from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Order & Subscription Management System"
    app_version: str = "1.0.0"
    debug: bool = False
    log_level: str = "INFO"

    # Database — single database for everything
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/osms_app"

    # Redis
    redis_url: str = "redis://localhost:6379/0"

    # JWT
    jwt_secret_key: str = "change-me-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7

    # CORS
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    # S3 / MinIO
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

    model_config = {
        "env_file": ("../.env", ".env"),
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    return Settings()
