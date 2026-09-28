---
title: 术语表
status: active
updated: 2026-09-28
---

# 术语表

文档、代码与界面中统一使用以下叫法。

| 术语 | 含义 | 代码中的名字 |
| --- | --- | --- |
| 案例 | 一张（或多张）AI 生成图片与其提示词的组合，是图库的基本单位 | `Case`、`case` |
| 上游 | 素材来源仓库 wukongnotnull/image-inspirer | `upstream` |
| 上游快照 | 随本仓库提交的上游素材副本，位于 `resources/image-inspirer` | `resources_dir` |
| 上游编号 | 上游 `prompt.md` 中「例 N」的 N；跨分类会重复，不能单独作主键 | `upstream_no` |
| 来源（origin） | 案例是上游导入的还是后台手工创建的 | `origin`：`upstream` / `manual` |
| 来源（source） | 案例原作者或出处，如「小红书号 123」「@作者」 | `source_text`、`source_url` |
| 手工修改字段 | 管理员改过的上游字段；重新导入时跳过 | `overridden_fields` |
| 原文 | 上游原始提示词，可能是双语或 JSON | `prompt` |
| 中文/英文提示词 | 从原文拆出的单语言版本 | `prompt_zh`、`prompt_en` |
| 衍生图 | 入库时生成的 WebP：缩略图 480 px、中图 1080 px（长边） | `variants.thumb`、`variants.medium` |
| 主色 | 图片的平均色，图片加载前用作占位背景 | `dominant_color` |
| 发布状态 | 草稿 / 已发布 / 已隐藏，只有已发布的出现在前台和索引中 | `status`：`draft` / `published` / `hidden` |
| 比例标签 | 从提示词中识别出的画面比例，如 9:16 | `Tag.kind = "ratio"` |
| 索引 | Meilisearch 中的 `cases` 索引，只含已发布案例，可随时重建 | `search.index` |
| 降级 | Meilisearch 不可用时改用数据库 ILIKE 查询 | `search_engine = "database"` |
| 导入记录 | 一次导入的执行结果与日志 | `ImportRun` |
| 基线需求 | 引入文档驱动流程前已实现的 F01–F14 | — |
