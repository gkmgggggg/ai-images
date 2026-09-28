---
title: 文档写作规范
status: active
updated: 2026-09-28
---

# 文档写作规范

所有文档用中文 Markdown 写在 `docs/` 下，与代码一起提交和评审。

## 目录与命名

| 目录 | 内容 | 命名 |
| --- | --- | --- |
| `docs/product/` | 需求清单、路线图、追溯矩阵 | 小写英文，连字符分隔 |
| `docs/specs/` | 功能规格，一次变更一份 | `NNNN-slug.md`，四位编号递增，如 `0001-image-search.md` |
| `docs/adr/` | 架构决策记录 | `NNNN-slug.md`，四位编号递增 |
| `docs/architecture/` | 系统现状：整体架构与各子系统设计 | 按子系统命名 |
| `docs/api/` | 接口约定与生成的接口清单 | — |
| `docs/guides/` | 开发、测试、部署、运维手册 | 按任务命名 |
| `docs/process/` | 流程与规范（本文所在目录） | — |
| `docs/archive/` | 已被取代、只作历史参考的文档 | 保留原名，加日期前缀 |

以下划线开头的文件（如 `_template.md`）是模板，不参与编号和状态检查。

## frontmatter

每个文档开头必须有 YAML frontmatter：

```yaml
---
title: 搜索设计          # 文档标题
status: active           # 取值见下表
updated: 2026-09-28      # 最后一次实质修改的日期
---
```

规格和 ADR 可额外写 `requirements: [F03, F11]` 标明关联的需求编号。

| 文档类型 | 允许的 status |
| --- | --- |
| 普通文档 | `draft`（草稿）、`active`（生效）、`deprecated`（已废弃） |
| 规格 `docs/specs/` | `draft`、`review`、`approved`、`in-progress`、`done`、`rejected` |
| ADR `docs/adr/` | `proposed`、`accepted`、`superseded`、`deprecated` |
| 生成的文档 | `generated`（不要手改） |

## 写法

- **先说结论**：每篇文档、每节的第一句话给出要点，再展开细节。
- **写具体的**：写数字、单位、字段名、文件路径和命令，不写「较快」「若干」。代码路径用相对链接，例如 [`backend/app/search/index.py`](../../backend/app/search/index.py)。
- **一处定义**：同一信息只在一个文档里详写，其他地方链接过去（见 [文档归属](doc-driven-development.md#文档归属每类信息只写在一个地方)）。
- **用对的形式**：流程、架构用 Mermaid 图；多个对象的多个属性用表格；步骤用有序列表。
- **可验证**：验收标准写成可测试的「给定…当…那么…」。
- **术语一致**：使用 [术语表](../glossary.md) 中的叫法，新术语先加到术语表。

## 何时更新 `updated`

改动文档含义时更新日期；修错别字、调整格式不需要。生成的文档由脚本维护日期。
