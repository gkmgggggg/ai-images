---
title: 架构决策记录（ADR）
status: active
updated: 2026-09-28
---

# 架构决策记录（ADR）

ADR 记录「为什么这样选」：每个影响技术选型、跨模块约定或部署方式的决定写一篇，已接受的 ADR 不再修改内容，改变决定时写新的 ADR 并把旧的标为 `superseded`。何时需要 ADR 见 [文档驱动开发流程](../process/doc-driven-development.md#改动分级)。

新建：复制 [`_template.md`](_template.md) 为下一个编号，写完后登记到下表（`scripts/docs.py check` 会检查编号连续且已登记）。

| 编号 | 决定 | 状态 |
| --- | --- | --- |
| [0001](0001-monorepo-fastapi-react.md) | 前后端分离的单仓库：FastAPI + React | accepted |
| [0002](0002-meilisearch-for-site-search.md) | 站内搜索采用 Meilisearch，并保留数据库降级 | accepted |
| [0003](0003-vite-spa-without-ssr.md) | 前端采用 Vite 单页应用，暂不做服务端渲染 | accepted |
| [0004](0004-internal-ids-and-content-addressed-images.md) | 内部自增 ID 与上游编号解耦，图片按内容 hash 命名 | accepted |
| [0005](0005-protect-manual-edits-on-reimport.md) | 重新导入时保护管理员的手工修改 | accepted |
| [0006](0006-local-storage-first.md) | 图片先存服务器磁盘，通过存储接口预留 OSS | accepted |
| [0007](0007-frontend-toolchain-versions.md) | 前端工具链：Vite 8、TypeScript 6，接口类型由 OpenAPI 生成 | accepted |
| [0008](0008-single-host-docker-compose.md) | 生产环境为单台阿里云 ECS 上的 Docker Compose | accepted |
| [0009](0009-documentation-driven-development.md) | 采用文档驱动开发 | accepted |
| [0010](0010-frontend-visual-system.md) | 前端视觉系统：暗色沉浸风格、语义化设计令牌、系统字体与自己实现瀑布流 | accepted |
