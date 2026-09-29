---
title: 本地开发
status: active
updated: 2026-09-29
---

# 本地开发

本地开发不需要 Docker：本机运行 PostgreSQL 与 Meilisearch，后端用 uv、前端用 pnpm，前端开发服务器把 `/api` 与 `/media` 代理到后端。首次搭建约 5 分钟（其中导入约 40 秒）。

## 环境要求

| 工具 | 版本 | macOS 安装 |
| --- | --- | --- |
| Python + uv | 3.12 / uv 0.11+ | `brew install uv`，`uv python install 3.12` |
| Node + pnpm | Node 24 / pnpm 10.33.0 | `brew install node pnpm`（pnpm 会按 `frontend/package.json` 的 `packageManager` 自动切换版本） |
| PostgreSQL | 16 | `brew install postgresql@16 && brew services start postgresql@16` |
| Meilisearch | 1.x | `brew install meilisearch` |

## 首次搭建

```bash
# 数据库与搜索（Meilisearch 单独开一个终端）
createdb ai_images
createdb ai_images_test          # 后端测试用
meilisearch --master-key dev-master-key-change-me-0123456789 --db-path backend/.data/meili --no-analytics

# 后端
cd backend
cp .env.example .env             # 修改数据库连接与 Meilisearch 密钥
uv sync
uv run alembic upgrade head
uv run atlas import              # 导入上游快照
uv run atlas create-admin admin  # 交互输入密码
uv run uvicorn app.main:app --reload --port 8000

# 前端（另开终端）
cd frontend
pnpm install
pnpm dev                         # http://127.0.0.1:5173
```

后台地址 <http://127.0.0.1:5173/admin>；后端接口文档 <http://127.0.0.1:8000/api/docs>（仅非生产环境）。

## 配置

后端读取 `backend/.env` 与环境变量，前缀 `ATLAS_`，定义在 [`core/config.py`](../../backend/app/core/config.py)：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `ATLAS_ENV` | `development` | `production` 时关闭接口文档页、不挂载 `/media` |
| `ATLAS_DATABASE_URL` | `postgresql+asyncpg://localhost:5432/ai_images` | 必须使用 asyncpg 驱动 |
| `ATLAS_MEILI_URL` / `ATLAS_MEILI_MASTER_KEY` / `ATLAS_MEILI_INDEX` | `http://127.0.0.1:7700` / — / `cases` | Meilisearch 连接 |
| `ATLAS_MEDIA_ROOT` / `ATLAS_MEDIA_URL_PREFIX` | `backend/media` / `/media/` | 图片存储目录与访问前缀 |
| `ATLAS_RESOURCES_DIR` | `resources/image-inspirer` | 上游快照目录 |
| `ATLAS_JWT_SECRET` / `ATLAS_JWT_EXPIRE_MINUTES` | — / 10080 | 会话签名密钥与有效期 |
| `ATLAS_COOKIE_SECURE` | `false` | 生产环境 HTTPS 下设为 `true` |
| `ATLAS_MAX_UPLOAD_BYTES` | 10485760 | 单张上传上限 |

前端开发服务器的后端地址可用 `ATLAS_BACKEND_URL` 覆盖（默认 `http://127.0.0.1:8000`）。

## 日常工作流

按 [文档驱动开发流程](../process/doc-driven-development.md) 进行。常用命令（仓库根目录）：

| 命令 | 作用 |
| --- | --- |
| `make check` | 提交前运行：后端 lint 与测试、前端类型检查与测试、文档检查 |
| `make docs` | 重新生成接口文档与追溯矩阵 |
| `make docs-check` | 只运行文档检查 |
| `cd frontend && pnpm gen:api` | 后端接口变化后重新生成前端类型 |
| `cd backend && uv run alembic revision --autogenerate -m "说明"` | 修改模型后生成迁移，生成后务必人工检查 |

## 常见问题

| 现象 | 原因与处理 |
| --- | --- |
| uv 提示 `VIRTUAL_ENV ... does not match` | 终端激活了别的虚拟环境（如 pyenv）；可忽略，或先 `unset VIRTUAL_ENV`。Makefile 已处理 |
| 本机设置了 `ALL_PROXY` 等代理 | 后端连接 Meilisearch 时会自动忽略代理；用 curl 调试本地服务时加 `--noproxy '*'` |
| 搜索结果提示「已切换为基础匹配」 | Meilisearch 没启动或密钥不对；启动后执行 `uv run atlas reindex` |
| VS Code 提示「未安装包」 | 把 Python 解释器切换到 `backend/.venv` |
| 前端类型报错说字段不存在 | 后端接口变了，运行 `pnpm gen:api` |
