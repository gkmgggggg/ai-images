---
title: 文档中心
status: active
updated: 2026-09-28
---

# 文档中心

本项目采用文档驱动开发：功能变更先写规格、再写代码，文档与代码在同一次提交中保持一致，`make docs-check` 自动检查。先读 [文档驱动开发流程](process/doc-driven-development.md)。

## 按角色阅读

| 我想… | 从这里开始 |
| --- | --- |
| 了解项目做什么、做到哪了 | [需求清单](product/requirements.md) → [路线图](product/roadmap.md) |
| 第一次跑起来 | [本地开发](guides/development.md) |
| 提一个新功能 | [文档驱动开发流程](process/doc-driven-development.md) → [规格模板](specs/_template.md) |
| 理解系统怎么工作 | [架构总览](architecture/overview.md) |
| 知道为什么这样设计 | [ADR 索引](adr/README.md) |
| 调接口 | [接口约定](api/README.md) → [接口清单](api/endpoints.md) |
| 部署或处理线上问题 | [部署](guides/deployment.md) → [运维手册](guides/operations.md) |

## 目录

| 位置 | 内容 |
| --- | --- |
| [product/](product/) | [需求清单](product/requirements.md)（需求编号的唯一来源）、[路线图](product/roadmap.md)、[追溯矩阵](product/traceability.md)（生成） |
| [specs/](specs/README.md) | 功能规格：每次功能变更一份，批准后才实现 |
| [adr/](adr/README.md) | 架构决策记录：为什么这样选 |
| [architecture/](architecture/overview.md) | 系统现状：[总览](architecture/overview.md)、[数据模型](architecture/data-model.md)、[搜索](architecture/search.md)、[导入管线](architecture/import-pipeline.md)、[前端](architecture/frontend.md)、[安全](architecture/security.md) |
| [api/](api/README.md) | [接口约定](api/README.md)、[接口清单](api/endpoints.md)（生成） |
| [guides/](guides/) | [本地开发](guides/development.md)、[测试](guides/testing.md)、[部署](guides/deployment.md)、[运维手册](guides/operations.md) |
| [process/](process/doc-driven-development.md) | [文档驱动开发流程](process/doc-driven-development.md)、[写作规范](process/documentation-guide.md) |
| [glossary.md](glossary.md) | 术语表 |
| [archive/](archive/) | 已归档文档，仅作历史参考 |

仓库根目录另有 [CHANGELOG.md](../CHANGELOG.md)（版本记录）和 [CLAUDE.md](../CLAUDE.md)（AI 助手工作约定）。
