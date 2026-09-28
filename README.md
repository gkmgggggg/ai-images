# AI 图集

浏览 AI 生成图片案例并一键复制提示词的图库，带管理后台和站内搜索。前端 React + Vite，后端 FastAPI + PostgreSQL + Meilisearch。素材来自 [wukongnotnull/image-inspirer](https://github.com/wukongnotnull/image-inspirer)（Apache-2.0），快照在 `resources/image-inspirer`。

**本项目采用文档驱动开发**：功能变更先写规格再写代码，文档与代码同步提交，由 `make docs-check` 检查。全部文档见 [docs/](docs/README.md)。

## 快速开始

需要 Python 3.12 + uv、Node 24 + pnpm、PostgreSQL 16、Meilisearch 1.x。完整步骤与配置说明见 [本地开发](docs/guides/development.md)。

```bash
createdb ai_images && createdb ai_images_test
meilisearch --master-key dev-master-key-change-me-0123456789 --db-path backend/.data/meili --no-analytics &

cd backend && cp .env.example .env && uv sync && uv run alembic upgrade head
uv run atlas import && uv run atlas create-admin admin
uv run uvicorn app.main:app --reload --port 8000 &

cd ../frontend && pnpm install && pnpm dev    # http://127.0.0.1:5173 ，后台 /admin
```

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `make check` | 提交前运行：后端检查与测试、前端类型检查与测试、文档检查 |
| `make docs` | 重新生成接口清单与需求追溯矩阵 |
| `cd backend && uv run atlas import` / `reindex` / `create-admin` | 导入上游快照 / 重建搜索索引 / 管理员账号 |

## 文档

| 我想… | 看这里 |
| --- | --- |
| 了解需求与进度 | [需求清单](docs/product/requirements.md)、[路线图](docs/product/roadmap.md) |
| 提新功能 | [文档驱动开发流程](docs/process/doc-driven-development.md) |
| 理解架构与设计理由 | [架构总览](docs/architecture/overview.md)、[ADR](docs/adr/README.md) |
| 调接口 | [接口约定](docs/api/README.md)、[接口清单](docs/api/endpoints.md) |
| 部署与运维 | [部署](docs/guides/deployment.md)、[运维手册](docs/guides/operations.md) |
| 版本变化 | [CHANGELOG.md](CHANGELOG.md) |
