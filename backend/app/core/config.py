import json
from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    PROJECT_NAME: str = "ShopOps"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "local"
    DEBUG: bool = False

    SECRET_KEY: str = "change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    DATABASE_URL: str = "postgresql+asyncpg://shopops:shopops@postgres:5432/shopops"
    REDIS_URL: str = "redis://redis:6379/0"

    BACKEND_CORS_ORIGINS: str = ""
    FRONTEND_URL_LOCAL: str = ""
    FRONTEND_URL_STAGING: str = ""
    FRONTEND_URL_PRODUCTION: str = ""
    RATE_LIMIT_DEFAULT: str = "100/minute"

    OTEL_ENABLED: bool = True
    OTEL_SERVICE_NAME: str = "shopops-api"
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://jaeger:4317"

    LOG_LEVEL: str = "INFO"
    LOGSTASH_ENABLED: bool = False
    LOGSTASH_HOST: str = "logstash"
    LOGSTASH_PORT: int = 5000

    @property
    def cors_origins(self) -> list[str]:
        explicit_origins: list[str] = []
        raw = self.BACKEND_CORS_ORIGINS.strip()
        if raw:
            if raw.startswith("["):
                try:
                    loaded = json.loads(raw)
                    if isinstance(loaded, list):
                        explicit_origins = [
                            str(origin).strip() for origin in loaded if str(origin).strip()
                        ]
                except json.JSONDecodeError:
                    explicit_origins = []
            else:
                explicit_origins = [origin.strip() for origin in raw.split(",") if origin.strip()]

        env_specific = [
            self.FRONTEND_URL_LOCAL.strip(),
            self.FRONTEND_URL_STAGING.strip(),
            self.FRONTEND_URL_PRODUCTION.strip(),
        ]

        deduped = {
            origin
            for origin in [*explicit_origins, *env_specific]
            if origin and origin.lower() != "none"
        }
        return sorted(deduped)

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, value: str) -> str:
        if len(value) < 32:
            raise ValueError("SECRET_KEY must be at least 32 characters")
        return value


@lru_cache
def get_settings() -> Settings:
    return Settings()
