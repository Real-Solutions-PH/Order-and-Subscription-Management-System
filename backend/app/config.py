from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Application
    APP_NAME: str = "PrepFlow"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True
    APP_VERSION: str = "0.1.0"
    API_V1_PREFIX: str = "/api/v1"

    # Server
    SERVER_HOST: str = "0.0.0.0"
    SERVER_PORT: int = 8000
    SERVER_WORKERS: int = 1
    SERVER_RELOAD: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/prepflow"
    DATABASE_ECHO: bool = False
    DATABASE_POOL_SIZE: int = 20
    DATABASE_MAX_OVERFLOW: int = 10
    DATABASE_POOL_TIMEOUT: int = 30

    # IAM Database
    IAM_DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/prepflow_iam"

    # Redis
    REDIS_URL: str = "redis://localhost:6379/0"
    REDIS_CACHE_TTL: int = 300

    # JWT
    JWT_SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:8000"]

    # PayMongo
    PAYMONGO_SECRET_KEY: str = ""
    PAYMONGO_PUBLIC_KEY: str = ""
    PAYMONGO_WEBHOOK_SECRET: str = ""
    PAYMONGO_BASE_URL: str = "https://api.paymongo.com/v1"

    # Object Storage
    S3_ENDPOINT_URL: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET_NAME: str = "prepflow"
    S3_REGION: str = "us-east-1"

    # Email
    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = "noreply@prepflow.app"
    SMTP_FROM_NAME: str = "PrepFlow"
    SMTP_TLS: bool = False

    # SMS
    SMS_PROVIDER: str = ""
    SMS_API_KEY: str = ""
    SMS_SENDER_NAME: str = "PrepFlow"

    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Tenant Defaults
    DEFAULT_TIMEZONE: str = "Asia/Manila"
    DEFAULT_CURRENCY: str = "PHP"
    DEFAULT_TAX_RATE: float = 0.12
    DEFAULT_MAX_PAUSE_DAYS: int = 30
    DEFAULT_ORDER_CUTOFF_HOURS: int = 24

    @property
    def is_development(self) -> bool:
        return self.APP_ENV == "development"

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
