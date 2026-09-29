import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.v1 import admin, auth, public
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.search import index as search_index

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s %(message)s")
logger = logging.getLogger("app")


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncIterator[None]:
    try:
        await search_index.ensure_index(wait=False)
    except Exception:  # noqa: BLE001
        logger.warning("启动时无法连接 Meilisearch，搜索将降级为数据库查询", exc_info=True)
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="AI 图集 API",
        version="0.2.0",
        lifespan=lifespan,
        docs_url=None if settings.is_production else "/api/docs",
        openapi_url=None if settings.is_production else "/api/openapi.json",
    )
    install_error_handlers(app)

    api = APIRouter(prefix="/api/v1")
    api.include_router(public.router)
    api.include_router(auth.router)
    api.include_router(admin.router)
    app.include_router(api)

    if not settings.is_production:
        # 生产环境由 Nginx 直接提供 /media
        settings.media_root.mkdir(parents=True, exist_ok=True)
        app.mount("/media", StaticFiles(directory=settings.media_root), name="media")
    return app


app = create_app()
