# 构建上下文为仓库根目录：docker compose 里 context: .
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

COPY --from=ghcr.io/astral-sh/uv:0.11 /uv /uvx /bin/

WORKDIR /app/backend
COPY backend/pyproject.toml backend/uv.lock ./
# 独立保存下载缓存，依赖层重建时复用已下载的软件包。
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev --no-install-project

COPY backend/ ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# 上游素材快照随镜像发布，导入命令从这里读取
COPY resources/ /app/resources/

ENV PATH="/app/backend/.venv/bin:$PATH" \
    ATLAS_ENV=production \
    ATLAS_RESOURCES_DIR=/app/resources/image-inspirer \
    ATLAS_MEDIA_ROOT=/data/media

RUN useradd --create-home --uid 1000 atlas && mkdir -p /data/media && chown -R atlas /data/media
USER atlas

EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/api/v1/healthz', timeout=4)"

# 启动前执行数据库迁移；--proxy-headers 让登录限流拿到 Nginx 转发的真实 IP
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2 --proxy-headers --forwarded-allow-ips='*'"]
