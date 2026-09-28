---
title: ADR-0001 前后端分离的单仓库：FastAPI + React
status: accepted
updated: 2026-09-28
requirements: [F08, F10, F11]
---

# ADR-0001 前后端分离的单仓库：FastAPI + React

## 背景

原站是构建时生成 JSON 的纯静态页面，内容只能改代码再发布。重构目标是在线维护内容（F10）、导入与索引（F08、F11），团队要求前端用 React、后端用 Python。

## 决定

前端 React SPA 与后端 FastAPI 放在同一个仓库（`frontend/`、`backend/`），前端只通过 `/api/v1` 与后端通信。后端使用 FastAPI + Pydantic v2 + SQLAlchemy 2（异步）+ Alembic，PostgreSQL 16 作为唯一数据源，uv 管理依赖；接口契约以 FastAPI 生成的 OpenAPI 为准，前端类型由它生成。

## 备选方案

| 方案 | 优点 | 缺点 | 为什么没选 |
| --- | --- | --- | --- |
| Django + DRF | 自带后台 | 后台样式与交互难以定制；异步支持弱 | 后台需要图片上传、导入记录等定制交互，自带 admin 省不了多少事 |
| 前后端分两个仓库 | 权限隔离 | 接口变更要跨仓库同步 | 单人/小团队，单仓库一次提交即可保持契约一致 |
| SQLite | 零运维 | 并发写与在线备份弱 | 生产需要可靠备份与并发 |

## 后果

- 前后端在一个 PR 中修改，OpenAPI 生成前端类型，契约不易漂移。
- 部署需要运行 Python 服务与数据库，不能再用 GitHub Pages。
