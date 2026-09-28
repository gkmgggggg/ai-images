---
title: 测试
status: active
updated: 2026-09-28
---

# 测试

测试分三层：后端集成测试（真实 PostgreSQL，Meilisearch 故意不可用以覆盖降级路径）、前端单元测试、端到端测试（真实浏览器 + 本地前后端）。每个测试的名称或文档字符串写上它验证的需求编号，[追溯矩阵](../product/traceability.md) 据此生成。

## 运行

| 层 | 命令 | 前置条件 | 用时 |
| --- | --- | --- | --- |
| 后端 | `cd backend && uv run pytest` | 存在 `ai_images_test` 库（会被清空重建） | 约 1 秒 |
| 后端搜索集成 | `ATLAS_TEST_MEILI_URL=http://127.0.0.1:7700 ATLAS_TEST_MEILI_KEY=… uv run pytest tests/test_search_live.py` | 本机运行 Meilisearch；未设置时自动跳过 | 约 2 秒 |
| 前端单元 | `cd frontend && pnpm test` | — | 约 1 秒 |
| 端到端 | `cd frontend && pnpm test:e2e` | 前后端已启动并导入数据；管理员账号通过 `E2E_ADMIN_USER`、`E2E_ADMIN_PASSWORD` 提供；默认使用本机 Chrome | 约 5 秒 |

`make check` 运行后端测试、前端单元测试和文档检查；后端搜索集成测试和端到端测试依赖本地服务，目前手动运行。

## 写测试的约定

- **标注需求编号**：Python 测试在文档字符串中写，如 `"""F08：重复导入不产生变化。"""`；前端在 `describe`/`it`/`test` 的标题中写，如 `it('F06 复制当前语言', …)`。一个测试可以标多个编号。
- **测验收标准，不测实现细节**：后端通过 HTTP 接口测试（`httpx.AsyncClient` + ASGI 传输），前端用 Testing Library 按角色和文字查询元素。
- **端到端测试自己清理数据**：新建的案例在测试结束前删除。
- **不依赖网络**：测试图片用 Pillow 或内联 base64 生成。

## 后端测试环境

[`tests/conftest.py`](../../backend/tests/conftest.py) 在导入应用之前设置环境变量：数据库指向 `ai_images_test`（可用 `ATLAS_TEST_DATABASE_URL` 覆盖），Meilisearch 指向不可达的 `127.0.0.1:9`，媒体与快照目录放在临时目录，快照内容由测试生成。会话开始时删除并重建全部表，并创建管理员 `admin` / `secret-pass`。

## 覆盖情况

见 [追溯矩阵](../product/traceability.md)（`make docs` 生成）。「已实现」的需求如果没有任何测试引用，`make docs-check` 会失败。
