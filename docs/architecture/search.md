---
title: 搜索
status: active
updated: 2026-09-28
requirements: [F02, F03, F11]
---

# 搜索

带关键词的列表、分类计数和随机请求走 Meilisearch，其余走 PostgreSQL；写操作先落库再增量同步索引，索引出错时可从数据库全量重建，Meilisearch 不可用时自动降级为数据库 ILIKE 查询。选型理由见 [ADR-0002](../adr/0002-meilisearch-for-site-search.md)，实现在 [`backend/app/search/index.py`](../../backend/app/search/index.py) 与 [`backend/app/services/cases.py`](../../backend/app/services/cases.py)。

## 索引设置

应用启动和每次全量重建前都会执行 `ensure_index()`：索引不存在则创建（主键 `id`），并写入以下设置。

| 设置 | 值 | 说明 |
| --- | --- | --- |
| 可搜索字段 | `title` → `tags` → `prompt_zh` → `prompt_en` → `prompt` → `source` → `category` | 顺序即权重，标题命中排在提示词命中之前（N03） |
| 可筛选字段 | `category_slug`、`tag_ids`、`has_image` | 对应前台的分类、标签、仅有图 |
| 可排序字段 | `id`、`created_at` | 预留 |
| 语言 | `title`、`prompt_zh`、`category`、`tags` 固定为中文（cmn）；`prompt_en` 固定为英文 | 避免短文本语言识别错误导致分词不对 |

查询统一使用 `matchingStrategy: all`：所有词都要命中，结果数与用户直觉一致。

## 查询

| 场景 | 接口 | 做法 |
| --- | --- | --- |
| 搜索列表 | `GET /cases?q=…` | Meilisearch 按 offset 分页（`cursor` 即 offset），取回 id 与高亮后从数据库加载完整案例，按命中顺序返回，`search_engine: "meilisearch"` |
| 分类计数 | `GET /categories?q=…` | 两次 `limit=0` 查询取 `category_slug` 分面：一次不限图片（total），一次 `has_image = true`（with_image） |
| 随机 | `GET /cases/random?q=…` | 取最多 1000 个命中 id，随机选一个 |
| 无关键词 | 以上接口不带 `q` | 直接查数据库；浏览列表按 id 游标分页，翻页不受新增数据影响 |

## 高亮

- 命中词用控制字符 `\u0002` 与 `\u0003` 包裹（而不是 `<em>`），前端 [`Highlighted`](../../frontend/src/components/Highlighted.tsx) 按字符拆分渲染为 `<mark>`，提示词中的 `<`、`>` 不会被当作 HTML。
- 中文分词后相邻词会被分别包裹（`[赛][博][朋克]`），后端合并为一段。
- 返回 `highlight.title`（标题有命中时）和 `highlight.excerpt`（依次在中文、英文、原文、来源中找第一个有命中的字段，截取约 48 个词）。

## 同步

| 触发 | 动作 |
| --- | --- |
| 后台增删改案例、上下线、上传/删除图片 | `sync_cases([id])`：已发布的写入（upsert），其余从索引删除 |
| 修改分类名称或 slug | 同步该分类下全部案例 |
| 修改或删除标签 | 同步带该标签的全部案例 |
| 导入完成 | `reindex_all()`：清空索引后按 500 条一批写入全部已发布案例 |
| 手动 | 后台「重建搜索索引」或 `atlas reindex` |

增量同步不等待 Meilisearch 任务完成，失败只记日志（带 case id），不影响业务写入。全量重建期间索引短暂为空，数据量小时约 1 秒。

## 降级

搜索相关的三个查询捕获任何异常后改用数据库：`title`、`prompt`、`prompt_zh`、`prompt_en`、`source_text` 的 ILIKE 子串匹配（转义 `%`、`_`、`\`），offset 分页，不返回高亮，`search_engine: "database"`；前端据此提示「搜索服务暂不可用，已切换为基础匹配」。`/meta` 的 `search_available` 与 `/healthz` 的 `search` 字段反映 Meilisearch 健康状况。

## 系统代理

SDK 内部的 httpx 客户端会读取 `ALL_PROXY` 等环境变量，并在初始化时就创建 SOCKS 传输。Meilisearch 是内网服务，[`client()`](../../backend/app/search/index.py) 在构造客户端时临时移除这些变量。
