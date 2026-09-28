# CLAUDE.md

AI 图集：AI 图片案例与提示词图库。后端 FastAPI + PostgreSQL + Meilisearch（`backend/`），前端 React + Vite（`frontend/`），上游素材快照在 `resources/`。文档在 `docs/`，入口 [docs/README.md](docs/README.md)。

## 本项目采用文档驱动开发

完整流程见 [docs/process/doc-driven-development.md](docs/process/doc-driven-development.md)。你必须遵守：

1. **先分级**：小改动（bug、文案、样式）直接做；功能变更（新功能、行为变化、接口或数据模型变更）必须有规格；架构决策（新组件、跨模块约定）必须有 ADR。拿不准按更高一级处理。
2. **没有已批准的规格，不写功能代码**。用户提出功能需求时：先在 `docs/specs/` 找相关规格；没有就按 `docs/specs/_template.md` 起草一份（`status: draft`），登记到 `docs/specs/README.md`，然后请用户评审。用户明确批准后再把状态改为 `approved` 并开始实现。
3. **实现时以规格为准**。发现规格有缺漏或与代码现状矛盾，停下来说明并修改规格，不要自行扩大范围。
4. **测试标注需求编号**：Python 写在测试函数的文档字符串里（`"""F08：…"""`），前端写在 `describe`/`it`/`test` 标题里。每条验收标准都要有测试。
5. **同一次改动里更新文档**：需求清单状态、受影响的 `docs/architecture/`、`docs/guides/`、`CHANGELOG.md`；改了接口运行 `make docs` 和 `cd frontend && pnpm gen:api`。
6. **收尾运行 `make check`**，全部通过后再报告完成；报告里列出改了哪些文档。

需求编号只在 [docs/product/requirements.md](docs/product/requirements.md) 中定义；规格描述一次变更（完成后冻结），架构文档描述系统现状（持续更新）。

## 常用命令

```bash
make check          # 提交前：后端 ruff + pytest，前端 tsc + vitest，文档检查
make docs           # 重新生成 docs/api/endpoints.md 与 docs/product/traceability.md
make docs-check     # 只检查文档
cd backend && uv run pytest tests/test_api.py -k 名称    # 单个后端测试
cd frontend && pnpm test:e2e                            # 端到端（需先启动前后端）
cd backend && uv run alembic revision --autogenerate -m "说明"   # 改模型后生成迁移，生成后人工检查
```

本地环境搭建见 [docs/guides/development.md](docs/guides/development.md)。

## 代码约定

- 代码注释、文档、提交说明、界面文字都用中文；标识符用英文。
- 后端：路由只做参数与响应，业务逻辑放 `app/services/`；写库后调用 `search_index.sync_cases`；新路由要写 `summary`。统一用 `AppError` 返回 `{code, message}`。
- 前端：接口函数写在 `src/api/endpoints.ts`，类型从 `src/api/generated/` 引入（生成文件不要手改）；筛选等可分享状态放 URL；后台写操作用 `useAdminMutation`。
- 异步 SQLAlchemy 中提交后不要访问已过期对象的属性（会触发同步懒加载报 MissingGreenlet），需要时先把 id 存到局部变量。

## 环境注意事项

- 终端可能激活了其他虚拟环境，uv 会提示 `VIRTUAL_ENV` 不匹配：先 `unset VIRTUAL_ENV`（Makefile 已处理）。
- 本机设置了 `ALL_PROXY` 等代理：后端已自动绕过；用 curl 访问本地服务加 `--noproxy '*'`。
- 后端测试会清空并重建 `ai_images_test` 库，不要把它指向开发库。
