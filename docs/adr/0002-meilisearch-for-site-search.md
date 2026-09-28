---
title: ADR-0002 站内搜索采用 Meilisearch，并保留数据库降级
status: accepted
updated: 2026-09-28
requirements: [F03, F11]
---

# ADR-0002 站内搜索采用 Meilisearch，并保留数据库降级

## 背景

提示词以中文为主，夹杂英文和 JSON。用户希望中文按词匹配、英文容忍拼写错误、结果按相关度排序并高亮（F03）。数据量与上游相当，约千条。

## 决定

使用 Meilisearch（单容器，只在内网可达）做站内搜索，索引只存已发布案例，PostgreSQL 仍是唯一数据源：写操作先落库再增量同步，导入后全量重建。Meilisearch 不可用时，搜索降级为 PostgreSQL ILIKE 子串匹配。后端用 meilisearch-python-sdk 的异步客户端。

## 备选方案

| 方案 | 优点 | 缺点 | 为什么没选 |
| --- | --- | --- | --- |
| PostgreSQL pg_trgm | 少一个组件，无同步问题 | 只有子串匹配，没有分词、错字容忍与相关度 | 满足不了 F03 的体验要求 |
| PostgreSQL + zhparser 中文分词 | 仍在数据库内 | 扩展需自行编译，云数据库支持有限；错字容忍仍需自己做 | 运维成本高 |
| Elasticsearch / OpenSearch | 功能最全 | 内存占用大，调优复杂 | 对千条数据过重 |

## 后果

- 多一个需要部署和监控的服务，以及数据库与索引的一致性问题；通过「落库优先 + 可重建 + 降级」控制风险，见 [搜索](../architecture/search.md)。
- Meilisearch 的中文分词对短文本的语言识别不稳定，已把中文字段固定为 cmn。
- 以后做以图搜图（F16）时可评估 Meilisearch 的向量检索。
