---
title: 前端
status: active
updated: 2026-09-29
requirements: [F01, F02, F03, F04, F05, F06, F07, F12, F13]
---

# 前端

前端是 Vite 构建的 React 单页应用：

- 筛选状态放在 URL 里，服务端数据由 TanStack Query 管理。
- 图库是按缩略图宽高排版的瀑布流，只渲染视口附近的卡片。
- 案例详情以「背景路由 + 弹窗」的方式叠在图库上。
- 视觉是「暗色沉浸」风格：默认深色，所有颜色都来自语义化设计令牌。

技术栈见 [ADR-0003](../adr/0003-vite-spa-without-ssr.md) 与 [ADR-0007](../adr/0007-frontend-toolchain-versions.md)，视觉系统见 [ADR-0010](../adr/0010-frontend-visual-system.md)。改版过程见 [规格 0002](../specs/0002-frontend-redesign.md)。

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

[`GalleryPage`](../../frontend/src/features/gallery/GalleryPage.tsx) 只负责取数和组合，界面拆成下面几块：

| 组件 | 作用 |
| --- | --- |
| [`GalleryHeader`](../../frontend/src/features/gallery/GalleryHeader.tsx) | 吸顶栏。第一行：Logo、搜索框、随机、主题；第二行：筛选按钮和分类栏 |
| [`CategoryBar`](../../frontend/src/features/gallery/CategoryBar.tsx) | 分类栏，计数随「仅有图」与搜索词联动 |
| [`FilterPanel`](../../frontend/src/features/gallery/FilterPanel.tsx) | 标签按比例、风格、模型、其他分组（单选），以及「仅有图」开关。按钮上的数字是与默认值不同的条件数 |
| [`ResultBar`](../../frontend/src/features/gallery/ResultBar.tsx) | 结果数、可单独移除的已选条件、清除筛选、降级提示、素材来源与许可（N08） |
| [`MasonryGrid`](../../frontend/src/features/gallery/MasonryGrid.tsx) | 瀑布流与窗口化 |
| [`CaseCard`](../../frontend/src/features/gallery/CaseCard.tsx) | 卡片：图片为主，分类、标题、摘要叠在底部渐变层上 |

- **吸顶栏**：
  - 整块 `position: sticky`，外观是一个带毛玻璃背景的圆角容器。
  - 分类栏在宽屏（≥ 640 px）换行显示全部分类，吸顶栏高度随行数增加；窄屏单行横向滑动，右侧渐隐提示还有更多，带分类参数进入时自动把选中的分类滚进可见区域。
  - 筛选面板在宽屏用 Radix Popover，从吸顶栏下方弹出，宽度与吸顶栏一致；视口宽度小于 640 px 时改为 Radix Dialog 底部抽屉。两种形态都支持 Esc 关闭，关闭后焦点回到「筛选」按钮。
  - 主题切换在宽屏是三选一的单选组；窄屏换成一个按钮，按深色 → 浅色 → 跟随系统循环切换。
- **搜索**：
  - 输入框是本地状态，停止输入 300 ms 后写入 URL（`replace`，不产生历史记录）；浏览器前进、后退时反向同步到输入框（[`useKeywordSync`](../../frontend/src/features/gallery/useKeywordSync.ts)）。
  - 焦点不在输入框或弹窗里时，按 `/` 聚焦搜索框。
- **瀑布流**：
  - 布局由纯函数 [`computeMasonryLayout`](../../frontend/src/features/gallery/masonry.ts) 计算：
    - 列数：`clamp(floor((宽 + 间距) / (210 + 间距)), 2, 6)`。
    - 间距：内容区宽度 ≥ 576 px 时 6 px，否则 4 px。
    - 图片高度：列宽 × 缩略图高宽比，高宽比限制在 0.5–2；没有封面按 4:5。
    - 每张卡片放进当前最短的一列。卡片的位置只取决于它之前的卡片，所以追加下一页时已有卡片不动。
  - 窗口化由 [`useWindowRange`](../../frontend/src/features/gallery/useWindowRange.ts) 完成：监听滚动与尺寸变化（rAF 节流），只渲染与「视口上下各半屏」相交的卡片；视口底部距列表底部不足一屏时加载下一页。
- **卡片**：
  - 图片区背景是主色，缩略图加载后淡入，按 `object-fit: cover` 从顶部对齐。
  - 分类、标题、摘要在悬停或键盘聚焦时显示；URL 带搜索词时常显，便于看到命中词高亮。触屏设备（`hover: none`）常显标题。
  - 悬停时外圈的光晕取自图片主色。前 8 张 `loading="eager"`。
- **首屏**：加载时显示高度错落的骨架，列表到底显示「已经到底了」。

## 详情与复制

[`CaseDetailView`](../../frontend/src/features/case-detail/CaseDetailView.tsx) 由弹窗（[`CaseDialog`](../../frontend/src/features/case-detail/CaseDialog.tsx)）和独立页（[`CasePage`](../../frontend/src/features/case-detail/CasePage.tsx)）共用。组件按案例 id 重新挂载，所以切换案例时图片序号和提示词语言都会重置。

- **宽屏（≥ 768 px）**：左右两栏。
  - 左栏：先铺一层放大、模糊、压暗的当前图片作背景，再显示原比例大图。多图时有缩略图条，还有「查看原图」按钮。
  - 右栏：Case 编号、分类和标签、标题、来源、提示词区、上一条和下一条。
- **窄屏**：图片在上、信息在下，整体一起滚动；底部用 `position: sticky` 固定一条「上一条 / 复制 / 下一条」操作栏。
  - 弹窗里由弹窗自身滚动。
  - 独立页的外层容器用 `overflow: clip` 而不是 `overflow: hidden`，否则操作栏无法相对视口吸底。

[`PromptBlock`](../../frontend/src/features/case-detail/PromptBlock.tsx) 按中文、English、原文（与两者都不同时才出现）提供切换。切换和复制的状态放在 `usePrompt` hook 里，提示词区和窄屏操作栏共用这一份状态。

复制按三级降级处理：先用 Clipboard API；非安全上下文或被拒绝时用 `execCommand('copy')`；仍然失败就选中文本，提示用户手动复制。JSON 格式的原文会格式化，并为键、字符串、数字着色。

## 主题

- `ThemeProvider` 把偏好（浅色、深色、跟随系统）存在 `localStorage` 的 `atlas-theme`，并给 `<html>` 切换 `dark` 类。**没有保存过偏好时默认深色**（F13）。
- [`index.html`](../../frontend/index.html) 的 `<html>` 默认就带 `dark` 类，内联脚本在首帧前按保存的偏好调整，避免闪烁。脚本同时设置 `theme-color`，`ThemeProvider` 之后保持同步。

## 样式与组件

- **设计令牌**：[`index.css`](../../frontend/src/index.css) 在 `:root`（浅色）和 `.dark`（深色）上定义同一组语义化 CSS 变量，取值与命名规则见 [ADR-0010](../adr/0010-frontend-visual-system.md) 和规格 0002。
  - 变量：`--bg`、`--surface`、`--surface-2`、`--fg`、`--muted`、`--faint`、`--border`、`--accent`、`--accent-fg`、`--mark`、`--header-bg`、`--overlay`，另有状态色 `--success`、`--warning`、`--danger` 和 JSON 着色 `--json-*`。
  - Tailwind 通过 `@theme inline` 把它们暴露为 `bg-bg`、`bg-surface`、`text-fg`、`text-muted`、`border-border`、`bg-accent` 等类名，另有圆角 `rounded-card`（10 px）、`rounded-modal`（20 px）、`rounded-bar`（22 px）。组件里不写颜色值。
  - `--fg`、`--muted` 在各层背景上的对比度不低于 4.5:1，由单元测试直接读取 `index.css` 校验；`--faint` 只用于非必要元素。
- **字体**：只用系统字体栈，不加载网络字体。`font-sans` 用于正文，`font-label` 用于小号标签，`font-mono` 用于代码。
- **自定义变体**：`dark:`（深色主题）、`touch:`（`hover: none` 的触屏设备）。
- **组件类**：光晕、渐变遮罩、毛玻璃、Logo 光点等工具类不好表达的效果，写成 `index.css` 里 `@layer components` 下的类（`card-glow`、`card-scrim`、`glass`、`logo-orb`、`scroll-fade-x`、`skeleton`、`select-chevron`）。
- **通用组件**：放在 `components/ui/`，按 shadcn/ui 的写法手写（用 `cva` 定义变体）。

  | 组件 | 说明 |
  | --- | --- |
  | `button` | 变体：`default`、`accent`、`outline`、`subtle`、`ghost`、`danger` |
  | `badge` | 标记，含状态色变体 |
  | `form-controls` | 输入框、多行输入、下拉、标签、错误提示 |
  | `dialog` | `DialogContent` 与底部抽屉 `SheetContent`，基于 Radix Dialog（焦点陷阱、Esc 关闭、滚动锁定） |
  | `popover` | 基于 Radix Popover |
  | `segmented` | 分段控件，语义上是一组标签页 |
  | `switch` | 开关，原生复选框加 `role="switch"` |
  | `chip` | 可选中的胶囊按钮 |
  | `empty-state` | 空状态与加载失败 |

- **后台**：公共部件放在 [`features/admin/shared.tsx`](../../frontend/src/features/admin/shared.tsx)。
  - `DataTable`：统一表头、行分隔、加载与空状态。
  - `Pagination`、`PageHeader`、`Panel`。
  - `StatusBadge`：状态用「圆点 + 文字」表示。
  - 案例编辑拆成 `caseSchema.ts`（校验与转换）、`CaseForm`（字段）和 `CaseImageManager`（图片）。
  - 窄屏时侧栏变成顶部横向导航，案例表格隐藏分类、来源、更新时间三列。
