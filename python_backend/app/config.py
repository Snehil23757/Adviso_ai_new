from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    openai_api_key: str = ""
    ai_model: str = "gpt-4o-mini"
    backend_host: str = "127.0.0.1"
    backend_port: int = 8000
    allowed_origins: str = (
        "http://localhost:3000,"
        "http://localhost:5173,"
        "https://advisoai-497313.web.app,"
        "https://advisoai-497313.firebaseapp.com"
    )
    allowed_origin_regex: str = r"https://.*\.(web\.app|firebaseapp\.com)"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
