---
title: 接口约定
status: active
updated: 2026-09-28
---

# 接口约定

接口以后端代码为准：路由与 Pydantic 模型生成 OpenAPI，再由它生成 [接口清单](endpoints.md)（`make docs`）和前端类型（`pnpm gen:api`）。本文只写所有接口共用的约定。

## 基本规则

| 项 | 约定 |
| --- | --- |
| 前缀 | `/api/v1`；不兼容的变更需要规格评审，必要时升级到 `/api/v2` |
| 格式 | 请求与响应都是 JSON（上传图片用 `multipart/form-data`，字段名 `file`） |
| 时间 | ISO 8601，带时区 |
| 图片地址 | 响应中直接给出 `/media/...` 相对地址，不经过接口 |
| 交互式文档 | 非生产环境 `/api/docs`（Swagger UI）、`/api/openapi.json` |

## 错误

所有错误返回同一结构，前端直接展示 `message`：

```json
{ "code": "not_found", "message": "案例不存在或已下线" }
```

参数校验失败（422）额外带 `errors: [{ "field": "limit", "message": "…" }]`。

| HTTP | code | 场景 |
| --- | --- | --- |
| 400 | `bad_request` | 业务校验失败，如分类不存在、图片格式不支持 |
| 401 | `unauthorized` | 访问后台接口但未登录或会话过期 |
| 401 | `invalid_credentials` | 用户名或密码错误 |
| 404 | `not_found` | 资源不存在，或案例未发布 |
| 409 | `conflict` | 名称或 slug 重复、同一图片重复上传、分类下仍有案例 |
| 409 | `import_running` | 已有导入任务在运行 |
| 413 | `file_too_large` | 上传超过 10 MB |
| 422 | `validation_error` | 参数不符合模型定义 |
| 429 | `too_many_attempts` | 登录失败次数过多 |
| 503 | `search_unavailable` | 手动重建索引时 Meilisearch 不可用 |

## 分页

| 接口 | 方式 |
| --- | --- |
| `GET /cases` | 游标：响应的 `next_cursor` 原样传回 `cursor` 取下一页，为 `null` 表示没有更多。浏览时游标是最后一条的 id，搜索时是偏移量，调用方不应解析它。`limit` 1–60，默认 24 |
| `GET /admin/cases` | 页码：`page`（从 1 开始）与 `page_size`（1–100，默认 20），响应带 `total` |

## 鉴权

管理员登录（`POST /auth/login`）后，服务端写入 HttpOnly Cookie `atlas_session`；浏览器同源请求自动携带，前端无需处理令牌。`/admin/*` 与 `/auth/me` 需要登录。详见 [安全](../architecture/security.md)。

## 搜索相关字段

- `CasePage.search_engine`：`meilisearch` 或 `database`（降级）。
- `CaseSummary.highlight`：命中词用 `\u0002` 与 `\u0003` 包裹，前端按字符拆分渲染，见 [搜索](../architecture/search.md#高亮)。

## 修改接口的流程

1. 在规格中写明接口变化（功能变更必须有规格）。
2. 修改路由与模型；给新路由写 `summary`，给参数写 `description`。
3. 运行 `make docs` 更新接口清单，`cd frontend && pnpm gen:api` 更新前端类型，一起提交。
