---
title: 功能规格
status: active
updated: 2026-09-28
---

# 功能规格

每个功能变更（新功能、行为变化、接口或数据模型变更）在动手前写一份规格，批准后才实现；完成后规格冻结，长期有效的设计沉淀到 `docs/architecture/`。流程见 [文档驱动开发流程](../process/doc-driven-development.md)。

新建：复制 [`_template.md`](_template.md) 为 `NNNN-英文-slug.md`（编号递增），写完登记到下表。`scripts/docs.py check` 会检查编号连续、已登记、状态合法。

F01–F14 在本流程之前实现，称为「基线」，没有单独的规格，以 [需求清单](../product/requirements.md) 为准。

| 编号 | 标题 | 需求 | 状态 |
| --- | --- | --- | --- |
| [0001](0001-stable-upstream-identity.md) | 用上游分类名定位上游案例，修复改分类后重复导入 | F08 | draft |
| [0002](0002-frontend-redesign.md) | 前端改版为「暗色沉浸」风格，图库改用瀑布流与吸顶栏 | F01、F03、F13 | done |
