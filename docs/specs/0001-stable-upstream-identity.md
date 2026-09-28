---
title: 规格 0001：用上游分类名定位上游案例，修复改分类后重复导入
status: draft
updated: 2026-09-28
requirements: [F08]
---

# 规格 0001：用上游分类名定位上游案例，修复改分类后重复导入

> 本规格是引入文档驱动流程后的第一份规格，状态为 draft，等待评审；批准前不修改代码。

## 背景

导入按「当前分类 id + 上游编号」定位已有案例（`uq_case_category_id` 唯一约束）。管理员在后台把一个上游案例移到另一个分类后：

1. 下次导入时，在上游目录对应的分类里找不到这条案例；
2. 导入把它当作新案例再创建一条，前台出现两条几乎相同的案例；
3. 手工修改保护（`overridden_fields` 中的 `category_id`）对此无效，因为定位发生在比较字段之前。

目前数据中尚未发生（没有被改过分类的上游案例），但后台允许这样操作。

## 目标与非目标

**目标**

1. 上游案例的定位与它当前所在分类无关。
2. 管理员修改上游案例的分类后，重新导入不产生重复案例，也不把分类改回去。

**非目标**

- 不处理上游自身在分类之间移动案例的情况（上游目录名 + 编号变化时，视为新案例，与现在一致）。

## 需求变更

| 编号 | 变更 | 内容 |
| --- | --- | --- |
| F08 | 修改 | 补充：「按上游分类目录名 + 上游编号定位，与案例当前所在分类无关」 |

## 验收标准

- **AC-1** 给定一个已导入的上游案例，当管理员把它改到另一个分类后重新导入，那么案例总数不变，该案例保持在新分类。
- **AC-2** 给定上游某分类目录被重命名，当重新导入，那么按新目录名创建案例（与现状一致），旧案例保留不动。
- **AC-3** 给定升级前已有的数据，当执行迁移，那么每条上游案例的上游分类名等于其当前分类名，手工案例为空。

## 方案

### 数据模型

- `case` 新增列 `upstream_category`（`varchar(64)`，可空），记录上游目录名。
- 唯一约束由 `(category_id, upstream_no)` 改为 `(upstream_category, upstream_no)`。
- 迁移：对 `origin = 'upstream'` 的行，`upstream_category` 取当前分类名；再替换唯一约束。

### 导入

[`Importer.import_case`](../../backend/app/importers/image_inspirer.py) 改为按 `(upstream_category, upstream_no)` 查找；新建时写入 `upstream_category`。其余逻辑不变。

### 接口与前端

`AdminCaseDetail` 与后台列表可增加 `upstream_category` 字段，后台显示「上游：海报与排版 例 3」。不影响前台。

### 需要新的 ADR 吗？

不需要；实现后更新 [ADR-0004](../adr/0004-internal-ids-and-content-addressed-images.md) 的「已知问题」为已解决。

## 影响的文档

- [ ] [数据模型](../architecture/data-model.md)
- [ ] [导入管线](../architecture/import-pipeline.md)
- [ ] [ADR-0004](../adr/0004-internal-ids-and-content-addressed-images.md)
- [ ] 接口文档（`make docs` 重新生成）
- [ ] `CHANGELOG.md`

## 测试计划

| 验收标准 | 测试 | 类型 |
| --- | --- | --- |
| AC-1 | `test_moving_upstream_case_to_other_category_survives_reimport` | 后端集成 |
| AC-2 | `test_renamed_upstream_directory_creates_new_cases` | 后端集成 |
| AC-3 | 迁移在测试库上执行后校验 | 后端集成 |

## 上线与回滚

上线：部署新版本（启动时自动执行迁移），无需重建索引。回滚：迁移提供 downgrade（恢复原唯一约束并删除列）；若回滚前已有改过分类的上游案例，downgrade 前需确认没有违反原约束的数据。

## 待定问题

- [ ] 后台是否需要显示上游分类？（建议显示，便于排查）
