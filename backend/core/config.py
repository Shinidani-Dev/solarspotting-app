import os.path
from typing import Optional, List
from pydantic import PostgresDsn, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from pathlib import Path


BACKEND_DIR = Path(__file__).parent.parent.absolute()
LOG_DIR = os.path.join(BACKEND_DIR, "logs")
ENV_FILE_PATH = os.path.join(BACKEND_DIR, ".env")


class Settings(BaseSettings):
    """Application settings for the SolarSpotting App"""
    # Project info
    PROJECT_NAME: str = "SolarSpotting-App"
    API_V1_STR: str = "/api/v1"

    # JWT Settings
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Environment settings
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Server Settings
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # CORS Settings
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000"
    cors_origins: List[str] = []

    # Database connection
    DATABASE_URL: PostgresDsn
    SQLALCHEMY_DATABASE_URI: Optional[str] = None

    # Admin user settings
    ADMIN_EMAIL: str
    ADMIN_USERNAME: str
    ADMIN_PASSWORD: str
    ADMIN_FIRSTNAME: str
    ADMIN_LASTNAME: str

    # Storage Settings
    STORAGE_TYPE: str
    STORAGE_PATH: str

    # ML Settings
    MODEL_PATH: str
    USE_GPU: bool

    # API Data
    # Add here if needed

    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int

    # Redis Cache
    REDIS_URL: str
    CACHE_TIMEOUT: int

    # Logging Settings
    LOG_FORMAT: str = "json"
    ENABLE_ACCESS_LOG: bool

    # Configuration for Pydantic
    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        case_sensitive=True,
    )

    @model_validator(mode="after")
    def validate_settings(self) -> "Settings":
        """Post-processing of settings after loading"""
        # Process CORS origins
        if isinstance(self.ALLOWED_ORIGINS, str):
            self.cors_origins = [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

        # Process database URL
        if not self.SQLALCHEMY_DATABASE_URI and self.DATABASE_URL:
            db_url = str(self.DATABASE_URL)
            if db_url.startswith("postgresql://"):
                self.SQLALCHEMY_DATABASE_URI = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)
            else:
                self.SQLALCHEMY_DATABASE_URI = db_url

        return self


# Create settings instance
settings = Settings()


# Helper function to get CORS origins
def get_cors_origins() -> List[str]:
    return settings.cors_origins

