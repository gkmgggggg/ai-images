from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_DIR / ".env", env_prefix="ATLAS_", extra="ignore")

    env: str = "development"
    database_url: str = "postgresql+asyncpg://localhost:5432/ai_images"

    meili_url: str = "http://127.0.0.1:7700"
    meili_master_key: str = "dev-master-key-change-me"
    meili_index: str = "cases"

    media_root: Path = BACKEND_DIR / "media"
    media_url_prefix: str = "/media/"
    resources_dir: Path = REPO_DIR / "resources" / "image-inspirer"

    jwt_secret: str = "dev-secret-change-me-please-32-bytes-min"
    jwt_expire_minutes: int = 60 * 24 * 7
    session_cookie: str = "atlas_session"
    cookie_secure: bool = False

    max_upload_bytes: int = 10 * 1024 * 1024
    thumb_size: int = 480
    medium_size: int = 1080

    @property
    def is_production(self) -> bool:
        return self.env == "production"


@lru_cache
def get_settings() -> Settings:
    return Settings()
