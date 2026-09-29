---
title: 需求追溯矩阵
status: generated
---

# 需求追溯矩阵

> 由 `make docs`（`scripts/docs.py gen`）根据 [需求清单](requirements.md) 和测试中标注的需求编号生成，不要手改。测试如何标注见 [测试指南](../guides/testing.md#写测试的约定)。

已实现且有测试引用：功能需求 14/14，非功能需求 1/8。功能需求必须全部有测试（`make docs-check` 强制），非功能需求多数靠评审与上线检查验证。

| 编号 | 需求 | 状态 | 测试 |
| --- | --- | --- | --- |
| F01 | 浏览：瀑布流展示案例卡片：按缩略图宽高比排版（高宽比限制在 0.5–2，超出部分… | 已实现 | `backend/tests/test_api.py` › test_browse_filters_and_cursor<br>`frontend/src/test/gallery.test.tsx` › F01 computeMasonryLayout 瀑布流布局<br>`frontend/src/test/gallery.test.tsx` › F01 columnsFor 瀑布流列数<br>`frontend/src/test/gallery.test.tsx` › F01 F03 CaseCard 卡片信息层<br>`frontend/e2e/gallery.spec.ts` › F01 F02 F03 F04 F05 图库：浏览、搜索、分类、详情弹窗与键盘切换 |
| F02 | 筛选：按分类筛选，分类计数随「仅有图」开关与搜索词联动（含「全部」） | 已实现 | `backend/tests/test_api.py` › test_browse_filters_and_cursor<br>`backend/tests/test_api.py` › test_search_falls_back_to_database<br>`backend/tests/test_search.py` › test_filter_expression_escapes_values<br>`frontend/src/test/gallery.test.tsx` › F02 F12 筛选面板<br>`frontend/src/test/gallery.test.tsx` › F02 F12 ResultBar 已选条件<br>`frontend/e2e/gallery.spec.ts` › F01 F02 F03 F04 F05 图库：浏览、搜索、分类、详情弹窗与键盘切换<br>`frontend/e2e/gallery.spec.ts` › F02 F03 吸顶栏滚动后仍在顶部，按 / 聚焦搜索框<br>`frontend/e2e/gallery.spec.ts` › F12 F02 筛选面板：选标签、关闭仅有图，Esc 关闭 |
| F03 | 站内搜索：Meilisearch 匹配标题、分类、作者、中英文提示词；中文分词、… | 已实现 | `backend/tests/test_api.py` › test_search_falls_back_to_database<br>`backend/tests/test_search.py` › test_to_document_maps_searchable_and_filterable_fields<br>`backend/tests/test_search.py` › test_filter_expression_escapes_values<br>`backend/tests/test_search.py` › test_highlight_marks_are_merged_and_excerpt_prefers_chinese<br>`backend/tests/test_search_live.py` › test_search_uses_meilisearch_and_follows_admin_edits<br>`frontend/src/test/components.test.tsx` › F03 Highlighted 高亮渲染<br>`frontend/src/test/gallery.test.tsx` › F01 F03 CaseCard 卡片信息层<br>`frontend/src/test/gallery.test.tsx` › F03 按 / 聚焦搜索框<br>`frontend/e2e/gallery.spec.ts` › F01 F02 F03 F04 F05 图库：浏览、搜索、分类、详情弹窗与键盘切换<br>`frontend/e2e/gallery.spec.ts` › F02 F03 吸顶栏滚动后仍在顶部，按 / 聚焦搜索框 |
| F04 | URL 状态：分类、关键词、标签、开关写入查询参数；案例详情有独立路由 `/ca… | 已实现 | `frontend/src/test/components.test.tsx` › F04 useGalleryParams URL 状态<br>`frontend/e2e/gallery.spec.ts` › F01 F02 F03 F04 F05 图库：浏览、搜索、分类、详情弹窗与键盘切换<br>`frontend/e2e/gallery.spec.ts` › F04 F05 F13 直接打开案例链接显示独立页面，主题可切换为深色 |
| F05 | 详情：大图（可看原图）、标题、来源、完整提示词；JSON 提示词着色；上一条/下… | 已实现 | `backend/tests/test_api.py` › test_detail_and_random<br>`frontend/src/test/components.test.tsx` › F05 JsonText JSON 着色<br>`frontend/src/test/components.test.tsx` › F05 F06 PromptBlock 语言切换与复制<br>`frontend/e2e/gallery.spec.ts` › F01 F02 F03 F04 F05 图库：浏览、搜索、分类、详情弹窗与键盘切换<br>`frontend/e2e/gallery.spec.ts` › F04 F05 F13 直接打开案例链接显示独立页面，主题可切换为深色<br>`frontend/e2e/gallery.spec.ts` › F05 F06 窄屏详情底部操作栏固定可见并能复制 |
| F06 | 复制：一键复制中文、英文或原文提示词；失败时提示并选中文本 | 已实现 | `frontend/src/test/components.test.tsx` › F05 F06 PromptBlock 语言切换与复制<br>`frontend/e2e/gallery.spec.ts` › F05 F06 窄屏详情底部操作栏固定可见并能复制 |
| F07 | 随机：在当前筛选范围内随机打开一个有图案例 | 已实现 | `backend/tests/test_api.py` › test_detail_and_random |
| F08 | 上游导入：解析仓库内快照，按「分类 + 上游编号」幂等更新；管理员改过的字段不被… | 已实现 | `backend/tests/test_api.py` › test_import_is_idempotent<br>`backend/tests/test_api.py` › test_import_missing_resources_is_recorded_as_failed<br>`backend/tests/test_api.py` › test_admin_edit_survives_reimport<br>`backend/tests/test_parser.py` › test_parse_prompt_markdown<br>`backend/tests/test_parser.py` › test_split_languages_uses_character_ratio<br>`backend/tests/test_parser.py` › test_detect_format<br>`backend/tests/test_parser.py` › test_parse_source_plain_text<br>`backend/tests/test_parser.py` › test_bundled_resources_parse_completely |
| F09 | 图片处理：入库时生成 480 px 与 1080 px WebP，记录宽高与主色… | 已实现 | `backend/tests/test_api.py` › test_browse_filters_and_cursor<br>`backend/tests/test_api.py` › test_admin_case_crud_and_images<br>`frontend/e2e/admin.spec.ts` › F10 F09 F14 N06 后台：未登录跳转、登录、新建案例、上传图片、发布、删除 |
| F10 | 管理后台：管理员登录；案例增删改、上下线；上传、删除图片与设封面；分类增删改与排… | 已实现 | `backend/tests/test_api.py` › test_admin_requires_login<br>`backend/tests/test_api.py` › test_admin_edit_survives_reimport<br>`backend/tests/test_api.py` › test_admin_case_crud_and_images<br>`backend/tests/test_api.py` › test_admin_categories<br>`frontend/src/test/admin-layout.test.tsx` › F10 F13 后台账号菜单（规格 0003）<br>`frontend/src/test/admin-layout.test.tsx` › F10 后台侧栏收起（规格 0003）<br>`frontend/src/test/login.test.tsx` › F10 登录页图片墙 interleave / toColumns<br>`frontend/src/test/login.test.tsx` › F10 登录页<br>`frontend/e2e/admin.spec.ts` › F10 F09 F14 N06 后台：未登录跳转、登录、新建案例、上传图片、发布、删除<br>`frontend/e2e/admin.spec.ts` › F10 侧栏收起后内容区变宽，刷新后保持（规格 0003 AC-6、AC-5）<br>`frontend/e2e/admin.spec.ts` › F10 N06 窄屏顶栏的账号菜单（规格 0003 AC-7） |
| F11 | 索引同步：案例或其分类、标签变化后同步 Meilisearch；导入后全量重建；… | 已实现 | `backend/tests/test_api.py` › test_admin_imports_listing<br>`backend/tests/test_search.py` › test_to_document_maps_searchable_and_filterable_fields<br>`backend/tests/test_search_live.py` › test_search_uses_meilisearch_and_follows_admin_edits |
| F12 | 标签：多标签（风格、比例、模型、其他）；导入时自动识别比例标签；前台按标签筛选；… | 已实现 | `backend/tests/test_api.py` › test_browse_filters_and_cursor<br>`backend/tests/test_api.py` › test_admin_case_crud_and_images<br>`backend/tests/test_parser.py` › test_parse_prompt_markdown<br>`backend/tests/test_parser.py` › test_detect_ratios_ignores_times_and_unknown_ratios<br>`backend/tests/test_search.py` › test_filter_expression_escapes_values<br>`frontend/src/test/gallery.test.tsx` › F02 F12 筛选面板<br>`frontend/src/test/gallery.test.tsx` › F02 F12 ResultBar 已选条件<br>`frontend/e2e/gallery.spec.ts` › F12 F02 筛选面板：选标签、关闭仅有图，Esc 关闭 |
| F13 | 暗色模式：默认深色，可手动切换浅色、深色或跟随系统，刷新不闪烁 | 已实现 | `frontend/src/test/admin-layout.test.tsx` › F10 F13 后台账号菜单（规格 0003）<br>`frontend/src/test/theme.test.tsx` › F13 主题<br>`frontend/e2e/gallery.spec.ts` › F13 首次访问默认深色，选择浅色后刷新保持<br>`frontend/e2e/gallery.spec.ts` › F04 F05 F13 直接打开案例链接显示独立页面，主题可切换为深色 |
| F14 | 导入记录：后台查看每次导入的 commit、耗时、计数与日志；导入进行中时不能重… | 已实现 | `backend/tests/test_api.py` › test_import_missing_resources_is_recorded_as_failed<br>`backend/tests/test_api.py` › test_admin_imports_listing<br>`frontend/e2e/admin.spec.ts` › F10 F09 F14 N06 后台：未登录跳转、登录、新建案例、上传图片、发布、删除 |
| F15 | AI 辅助：调用大模型自动翻译中英文提示词、生成标签 | 未开始 | — |
| F16 | 以图搜图：图片向量化，详情页展示相似案例 | 未开始 | — |
| F17 | 用户与收藏：注册登录、收藏、我的收藏 | 后续 | — |
| F18 | SEO：服务端渲染、sitemap、结构化数据 | 后续 | — |
| N01 | 首屏性能：列表每页 24 条，只返回提示词摘要；卡片用 480 px WebP … | 已实现 | — |
| N02 | 接口性能：列表 P95 < 200 ms，搜索 P95 < 100 ms（千条级… | 已实现，未压测 | — |
| N03 | 搜索质量：中文按词匹配；英文容忍拼写错误；标题命中排在提示词命中之前 | 已实现 | — |
| N04 | 搜索一致性：PostgreSQL 是唯一数据源；索引可随时重建；Meilisea… | 已实现 | — |
| N05 | 图片分发：文件名含内容 hash，长期缓存；起步由 Nginx 读本地磁盘 | 已实现 | — |
| N06 | 响应式与可访问性：320 px 宽起可用、无横向滚动；弹窗焦点陷阱与滚动锁定；键… | 已实现 | `frontend/src/test/tokens.test.ts` › N06 设计令牌对比度<br>`frontend/e2e/admin.spec.ts` › F10 F09 F14 N06 后台：未登录跳转、登录、新建案例、上传图片、发布、删除<br>`frontend/e2e/admin.spec.ts` › F10 N06 窄屏顶栏的账号菜单（规格 0003 AC-7）<br>`frontend/e2e/gallery.spec.ts` › N06 ${width} px 宽度下图库与详情没有横向滚动 |
| N07 | 安全：后台需登录；Argon2 哈希；上传校验并重新编码（≤ 10 MB）；登录… | 已实现，HTTPS 待上线配置 | — |
| N08 | 授权合规：保留上游 Apache-2.0 许可与来源；上线前完成 ICP 备案 | 许可已保留，备案待办 | `frontend/src/test/gallery.test.tsx` › N08 结果栏显示素材来源与许可 |
| N09 | 可运维：一条命令起环境；健康检查；数据库与图片每日备份到 OSS | 已实现，部署未实测 | — |
