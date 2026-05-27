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
    razorpay_webhook_secret: str = ""
    resend_api_key: str = ""
    email_from_welcome: str = "Adviso AI <welcome@adviso.ai>"
    email_from_support: str = "Adviso AI Support <support@adviso.ai>"
    email_reply_to: str = "support@adviso.ai"
    app_public_url: str = "https://adviso.ai"
    email_logo_url: str = ""
    email_hero_image_url: str = ""
    email_validation_require_mx: bool = True
    email_validation_allowed_public_domains: str = (
        "gmail.com,googlemail.com,outlook.com,hotmail.com,live.com,msn.com,"
        "yahoo.com,ymail.com,icloud.com,me.com,mac.com,proton.me,protonmail.com,"
        "zoho.com,hey.com,aol.com"
    )
    email_validation_blocked_domains: str = ""
    database_url: str = ""
    auto_create_tables: bool = True
    db_pool_min_size: int = 1
    db_pool_max_size: int = 10
    db_pool_timeout_seconds: float = 10
    redis_url: str = ""
    ai_cache_ttl_seconds: int = 900
    celery_result_expires_seconds: int = 86_400
    celery_worker_prefetch_multiplier: int = 1
    celery_worker_concurrency: int = 2
    celery_task_soft_time_limit_seconds: int = 900
    celery_task_time_limit_seconds: int = 1_200
    supabase_url: str = ""
    supabase_service_role_key: str = ""
    supabase_storage_bucket: str = "datasets"
    max_upload_size_bytes: int = 262_144_000
    firebase_project_id: str = "advisoai-497313"
    firebase_credentials_json: str = ""
    firebase_credentials_path: str = ""
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000
    rate_limit_per_minute: int = 120
    upload_rate_limit_per_minute: int = 10
    ai_rate_limit_per_minute: int = 30
    websocket_rate_limit_per_minute: int = 60
    abandoned_job_minutes: int = 45
    expired_cache_cleanup_limit: int = 500
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
