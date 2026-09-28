---
title: ADR-0007 前端工具链：Vite 8、TypeScript 6，接口类型由 OpenAPI 生成
status: accepted
updated: 2026-09-28
requirements: []
---

# ADR-0007 前端工具链：Vite 8、TypeScript 6，接口类型由 OpenAPI 生成

## 背景

需求初稿写的是 Vite 7。开工时最新的 `@vitejs/plugin-react` 6 要求 Vite 8；TypeScript 7 是原生（Go）重写版，不再提供代码生成工具依赖的 JS 编译器 API。

## 决定

- 使用 Vite 8 与 TypeScript 6.x；等 `@hey-api/openapi-ts` 等工具支持 TypeScript 7 后再升级。
- `@hey-api/openapi-ts` 只生成类型（`src/api/generated/`），请求函数手写在 `src/api/endpoints.ts`，便于统一错误处理与缓存策略。
- 单元测试用 Vitest，端到端测试用 Playwright 并默认驱动本机 Chrome（不下载浏览器）。

## 后果

- 后端改接口后要运行 `pnpm gen:api`，类型不匹配会在 `pnpm typecheck` 中暴露。
- 手写请求函数需要与生成的类型保持一致，由 TypeScript 检查兜底。
