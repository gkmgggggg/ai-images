---
title: 前端
status: active
updated: 2026-09-28
requirements: [F01, F02, F03, F04, F05, F06, F07, F13]
---

# 前端

前端是 Vite 构建的 React 单页应用：筛选状态放在 URL 里，服务端数据由 TanStack Query 管理，图库按行虚拟化渲染，案例详情以「背景路由 + 弹窗」的方式叠在图库上。技术栈见 [ADR-0003](../adr/0003-vite-spa-without-ssr.md) 与 [ADR-0007](../adr/0007-frontend-toolchain-versions.md)。

## 路由

| 路径 | 页面 | 说明 |
| --- | --- | --- |
| `/` | 图库 | 查询参数：`c` 分类 slug、`q` 关键词、`tag` 标签 id、`all=1` 包含无图案例 |
| `/cases/:id` | 案例详情 | 从图库点开时为弹窗；直接访问、刷新时为独立页面 |
| `/admin/login` | 登录 | `next` 参数只接受 `/admin` 开头的站内地址 |
| `/admin/cases`、`/admin/cases/new`、`/admin/cases/:id` | 案例列表与编辑 | 列表的筛选与页码也在 URL 中 |
| `/admin/categories`、`/admin/tags`、`/admin/imports` | 分类、标签、导入与索引 | — |

后台页面用 `React.lazy` 单独打包，访客不下载。

### 详情弹窗

图库中的卡片以 `state: { background: location }` 跳转到 `/cases/:id`。[`App.tsx`](../../frontend/src/App.tsx) 发现 `background` 时，用它渲染主路由（图库保持挂载、滚动位置不变），再额外渲染弹窗路由。弹窗内切换案例用 `replace`，关闭时 `navigate(-1)` 回到图库。

上一条/下一条：图库把当前已加载的 id 顺序写入 `GalleryOrderContext`，弹窗在其中定位；直接打开链接时退回后端返回的全站 `prev_id`/`next_id`。相邻案例会被预取。

## 数据获取

请求封装在 [`lib/api.ts`](../../frontend/src/lib/api.ts)（统一前缀 `/api/v1`、错误转为 `ApiError`），接口函数在 [`api/endpoints.ts`](../../frontend/src/api/endpoints.ts)，类型由 `pnpm gen:api` 从后端 OpenAPI 生成到 `api/generated/`，不要手改。

| 查询 key | 数据 | 备注 |
| --- | --- | --- |
| `['cases', filters]` | 图库列表（无限查询，`next_cursor` 翻页） | 切换筛选时保留旧数据并半透明显示 |
| `['categories', q, tag]` | 分类计数 | — |
| `['tags']`、`['meta']` | 标签、统计与上游信息 | 缓存 60 秒 |
| `['case', id]` | 案例详情 | 404 不重试 |
| `['admin', …]` | 后台数据 | 后台写操作成功后统一失效 `admin` 与前台相关 key |

全局规则：4xx 不重试；后台请求返回 401 时跳转登录页并带上当前地址。

## 图库

- **搜索**：输入框是本地状态，停止输入 300 ms 后写入 URL（`replace`，不产生历史记录）；浏览器前进后退时反向同步到输入框。
- **虚拟网格**（[`VirtualGrid.tsx`](../../frontend/src/features/gallery/VirtualGrid.tsx)）：按容器宽度决定列数（≥1180 px 4 列，≥840 px 3 列，≥340 px 2 列，否则 1 列），按行用 `useWindowVirtualizer` 虚拟化；卡片图片区 4:5，正文固定 124 px，行高可直接计算。可见区域接近最后一行时加载下一页。
- **占位**：图片加载前显示主色背景，加载后淡入；前 8 张 `loading="eager"`。

## 详情与复制

[`PromptBlock`](../../frontend/src/features/case-detail/PromptBlock.tsx) 按中文、英文、原文（与两者都不同时才出现）提供切换，复制当前所选。复制先用 Clipboard API，非安全上下文或被拒绝时用 `execCommand('copy')`，仍失败则选中文本并提示手动复制。JSON 格式的原文会格式化并为键、字符串、数字着色。

## 主题

`ThemeProvider` 把偏好（浅色/深色/跟随系统）存在 `localStorage` 的 `atlas-theme`，给 `<html>` 切换 `dark` 类；[`index.html`](../../frontend/index.html) 中的内联脚本在首帧前应用主题，避免闪白。颜色全部是 CSS 变量（[`index.css`](../../frontend/src/index.css)），深浅两套，Tailwind 通过 `@theme inline` 引用。

## 样式与组件

Tailwind CSS 4；通用组件在 `components/ui/`，按 shadcn/ui 的写法手写（`cva` 定义变体），弹窗基于 Radix Dialog（焦点陷阱、Esc 关闭、滚动锁定）。视觉延续原站：纸色背景网格、墨色描边、荧光绿强调色、硬阴影。
