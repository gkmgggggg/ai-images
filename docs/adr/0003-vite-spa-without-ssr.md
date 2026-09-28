---
title: ADR-0003 前端采用 Vite 单页应用，暂不做服务端渲染
status: accepted
updated: 2026-09-28
requirements: [F04, F18]
---

# ADR-0003 前端采用 Vite 单页应用，暂不做服务端渲染

## 背景

曾评估为了搜索引擎收录改用 Next.js 服务端渲染；2026-09-28 确认本期不需要被搜索引擎收录（F18 列为后续）。

## 决定

前端为 Vite 构建的 React 单页应用，由 Nginx 托管静态文件，所有未知路径回到 `index.html`。路由用 React Router 7（SPA 模式），数据用 TanStack Query，样式用 Tailwind CSS 4 与 shadcn 风格组件。

## 备选方案

| 方案 | 优点 | 缺点 | 为什么没选 |
| --- | --- | --- | --- |
| Next.js（SSR/ISR） | 利于 SEO；首屏 HTML 含内容 | 需要运行 Node 服务；后台改动后要刷新页面缓存 | 本期不需要 SEO |
| React Router 7 框架模式（SSR） | 贴近 Vite 生态 | 同样需要 Node 服务 | 同上 |

## 后果

- 部署只有静态文件，简单；首屏依赖 JS 执行，对搜索引擎不友好。
- 以后要做 SEO（F18）时需要新 ADR，优先评估 Next.js 或对案例页做预渲染。
