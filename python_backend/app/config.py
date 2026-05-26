from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


ROOT_ENV_FILE = Path(__file__).resolve().parents[2] / ".env"
BACKEND_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


class Settings(BaseSettings):
    openai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"
    razorpay_key_id: str = ""
    razorpay_key_secret: str = ""
    database_url: str = ""
    auto_create_tables: bool = True
    redis_url: str = ""
    ai_cache_ttl_seconds: int = 900
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "datasets"
    max_upload_size_bytes: int = 209_715_200
    firebase_project_id: str = "advisoai-497313"
    firebase_credentials_json: str = ""
    firebase_credentials_path: str = ""
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000
    rate_limit_per_minute: int = 120
    allowed_origins: str = (
        "https://advisoai.in,"
        "https://www.advisoai.in,"
        "https://advisoai-497313.web.app,"
    )
    allowed_origin_regex: str = ""

    model_config = SettingsConfigDict(
        # Keep backend-specific defaults available, but let the root project
        # .env win in local development because the frontend and backend share
        # Razorpay/Firebase/Supabase settings there.
        env_file=(BACKEND_ENV_FILE, ROOT_ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def origin_regex(self) -> str | None:
        regex = self.allowed_origin_regex.strip()
        return regex or None


@lru_cache
def get_settings() -> Settings:
    return Settings()
