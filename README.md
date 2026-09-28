# AI 图集

浏览 AI 生成图片案例并一键复制提示词的图库，带管理后台和站内搜索。由 [ai-image-atlas](../ai-image-atlas) 重构而来：前端 React，后端 Python（FastAPI），数据存 PostgreSQL，搜索用 Meilisearch。

需求与架构见 [AI图集重构-需求与架构.md](AI图集重构-需求与架构.md)。素材来自 [wukongnotnull/image-inspirer](https://github.com/wukongnotnull/image-inspirer)（Apache-2.0），快照在 `resources/image-inspirer`。

## 目录

```text
backend/     FastAPI 应用、导入命令、数据库迁移、测试
frontend/    React SPA（图库 + 管理后台）、单元测试与端到端测试
deploy/      Nginx 配置、备份脚本
resources/   上游素材快照（随仓库提交）
docker-compose.yml  生产部署
```

## 本地开发

需要：Python 3.12 + [uv](https://docs.astral.sh/uv/)、Node 24 + pnpm、PostgreSQL 16、Meilisearch 1.x（macOS 可 `brew install postgresql@16 meilisearch`）。

```bash
# 1. 数据库与搜索服务
createdb ai_images
meilisearch --master-key dev-master-key-change-me-0123456789 --db-path backend/.data/meili --no-analytics

# 2. 后端（另开终端）
cd backend
cp .env.example .env            # 按本机情况修改数据库连接和 Meilisearch 密钥
uv sync
uv run alembic upgrade head
uv run atlas import             # 导入上游快照（约 40 秒，生成缩略图并建搜索索引）
uv run atlas create-admin admin # 创建管理员，交互输入密码
uv run uvicorn app.main:app --reload --port 8000

# 3. 前端（另开终端）
cd frontend
pnpm install
pnpm dev                        # http://127.0.0.1:5173 ，/api 和 /media 代理到 8000
```

管理后台：<http://127.0.0.1:5173/admin>

> 如果本机设置了 `ALL_PROXY`/`HTTP_PROXY` 等代理变量：后端连接 Meilisearch 时会自动忽略代理；用 curl 调试本地服务时记得加 `--noproxy '*'`。

### 常用命令

| 位置 | 命令 | 作用 |
| --- | --- | --- |
| backend | `uv run atlas import` | 导入/同步上游快照（幂等，不覆盖后台手工改过的字段） |
| backend | `uv run atlas reindex` | 用数据库全量重建搜索索引 |
| backend | `uv run atlas create-admin <用户名> [--reset]` | 创建管理员或重置密码 |
| backend | `uv run pytest` | 后端测试（需要 `createdb ai_images_test`） |
| backend | `uv run ruff check app tests && uv run ruff format app tests` | 检查与格式化 |
| backend | `uv run alembic revision --autogenerate -m "说明"` | 修改模型后生成迁移 |
| frontend | `pnpm test` | 单元测试 |
| frontend | `pnpm test:e2e` | 端到端测试（需先启动前后端；默认用本机 Chrome，管理员账号见 `e2e/admin.spec.ts`） |
| frontend | `pnpm gen:api` | 后端接口变化后，重新生成 `src/api/generated` 类型 |
| frontend | `pnpm build` | 类型检查并构建 |

## 更新上游素材

1. 用上游仓库新版本替换 `resources/image-inspirer/db`，并更新 `UPSTREAM_COMMIT`
2. 提交并部署
3. 后台「导入与索引」点「重新导入上游快照」，或在服务器执行 `docker compose exec api atlas import`

导入按「分类 + 上游编号」更新；管理员在后台改过的字段（标题、提示词、图片、标签等）会保留，案例编辑页可以点「恢复上游同步」取消保留。

## 部署到阿里云 ECS

前提：已安装 Docker 和 Docker Compose；域名解析到境内服务器前需完成 ICP 备案。

```bash
git clone <仓库地址> /opt/ai-images && cd /opt/ai-images
cp .env.example .env                    # 填写所有密钥（openssl rand -hex 32）
docker compose up -d --build
docker compose exec api atlas import    # 首次导入
docker compose exec api atlas create-admin admin
```

- 服务：`web`（Nginx，托管前端并代理 `/api`、提供 `/media`）、`api`（FastAPI，启动时自动迁移数据库）、`postgres`、`meilisearch`（不暴露端口）
- 数据卷：`pgdata`（数据库）、`media`（图片）、`meili_data`（索引，可随时 `atlas reindex` 重建）
- 国内服务器拉取 Docker Hub / ghcr.io 镜像较慢时，可在 Docker daemon 中配置阿里云镜像加速器

### HTTPS

把证书放到 `deploy/certs/`，取消 `docker-compose.yml` 中证书挂载的注释，按 `deploy/nginx.conf` 末尾的注释启用 443 配置，然后 `docker compose up -d --build web`。在 HTTPS 生效前如需用 HTTP 登录后台，把 `.env` 的 `COOKIE_SECURE` 设为 `false`。

### 备份

`deploy/backup.sh` 把数据库和图片备份到 OSS（需要安装配置 [ossutil](https://help.aliyun.com/zh/oss/developer-reference/ossutil) 并设置 `.env` 中的 `OSS_BACKUP_URI`）。脚本注释里有 crontab 示例。

## 与需求文档的差异

- 前端使用 Vite 8 与 TypeScript 6（文档写的是 Vite 7；`@vitejs/plugin-react` 新版要求 Vite 8；TypeScript 7 是原生重写版，代码生成工具尚不兼容）
- `@hey-api/openapi-ts` 只生成类型，请求函数手写在 `src/api/endpoints.ts`
- 比例标签（如 3:4、16:9）在导入时从提示词中自动识别
