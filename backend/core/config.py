"""Application settings loaded from environment variables via pydantic-settings."""
import json
import secrets
from typing import Any
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Application runtime
    ENVIRONMENT: str = "production"
    DEBUG: bool = False
    APP_NAME: str = "RailOpt AI"
    VERSION: str = "2.0.0"

    # PostgreSQL database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/railopt"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20

    # Authentication security
    SECRET_KEY: str = Field(default_factory=lambda: secrets.token_urlsafe(32))
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480

    # Google Gemini LLM
    GEMINI_API_KEY: str | None = None

    # Cross-Origin Resource Sharing
    CORS_ORIGINS: str | list[str] = ["http://localhost:3000", "http://localhost:5173"]

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url(cls, v: Any) -> str:
        """Ensure PostgreSQL URIs are formatted correctly for SQLAlchemy."""
        if not v:
            return "postgresql://postgres:postgres@localhost:5432/railopt"
        if isinstance(v, str) and v.startswith("postgres://"):
            return v.replace("postgres://", "postgresql://", 1)
        return str(v)

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> list[str]:
        """Support comma-separated strings, JSON lists, or wildcard * for CORS origins."""
        if isinstance(v, str):
            v = v.strip()
            if v == "*":
                return ["*"]
            if v.startswith("[") and v.endswith("]"):
                try:
                    parsed = json.loads(v)
                    if isinstance(parsed, list):
                        return [str(x).strip() for x in parsed if str(x).strip()]
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        if isinstance(v, list):
            return [str(origin).strip() for origin in v if str(origin).strip()]
        return ["*"]

    @field_validator("SECRET_KEY")
    @classmethod
    def validate_secret_key(cls, v: str) -> str:
        """Validate that SECRET_KEY is not a weak or placeholder value."""
        trivial_keys = {"secret", "changeme", "placeholder", "default", "admin", "12345678"}
        if v.lower() in trivial_keys or "change_me" in v.lower():
            raise ValueError("SECRET_KEY must be a strong, non-placeholder cryptographic secret.")
        if len(v) < 16:
            raise ValueError("SECRET_KEY must be at least 16 characters in length.")
        return v


settings = Settings()
