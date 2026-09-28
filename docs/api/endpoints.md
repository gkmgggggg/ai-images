---
title: 接口清单
status: generated
---

# 接口清单

> 由 `make docs`（`scripts/docs.py gen`）从后端 FastAPI 的 OpenAPI 生成，不要手改；要修改说明，请改后端路由的 `summary`、参数的 `description` 或 Pydantic 模型。通用约定（错误格式、分页、鉴权）见 [接口约定](README.md)。

共 31 个接口，统一前缀 `/api/v1`。所有带参数或请求体的接口在校验失败时返回 422，下文不再逐一列出。

| 分组 | 方法 | 路径 | 说明 | 登录 |
| --- | --- | --- | --- | --- |
| 前台 | GET | [`/api/v1/cases`](#get-apiv1cases) | 案例列表：浏览与搜索 |  |
| 前台 | GET | [`/api/v1/cases/random`](#get-apiv1casesrandom) | 随机案例 |  |
| 前台 | GET | [`/api/v1/cases/{case_id}`](#get-apiv1casescase_id) | 案例详情 |  |
| 前台 | GET | [`/api/v1/categories`](#get-apiv1categories) | 分类及计数 |  |
| 前台 | GET | [`/api/v1/tags`](#get-apiv1tags) | 标签及案例数 |  |
| 前台 | GET | [`/api/v1/meta`](#get-apiv1meta) | 站点统计与上游信息 |  |
| 前台 | GET | [`/api/v1/healthz`](#get-apiv1healthz) | 健康检查 |  |
| 鉴权 | POST | [`/api/v1/auth/login`](#post-apiv1authlogin) | 管理员登录 |  |
| 鉴权 | POST | [`/api/v1/auth/logout`](#post-apiv1authlogout) | 退出登录 |  |
| 鉴权 | GET | [`/api/v1/auth/me`](#get-apiv1authme) | 当前管理员 | 是 |
| 管理后台 | GET | [`/api/v1/admin/cases`](#get-apiv1admincases) | 案例列表（后台，含草稿） | 是 |
| 管理后台 | POST | [`/api/v1/admin/cases`](#post-apiv1admincases) | 新建案例 | 是 |
| 管理后台 | GET | [`/api/v1/admin/cases/{case_id}`](#get-apiv1admincasescase_id) | 案例详情（后台） | 是 |
| 管理后台 | PATCH | [`/api/v1/admin/cases/{case_id}`](#patch-apiv1admincasescase_id) | 修改案例 | 是 |
| 管理后台 | DELETE | [`/api/v1/admin/cases/{case_id}`](#delete-apiv1admincasescase_id) | 删除案例 | 是 |
| 管理后台 | POST | [`/api/v1/admin/cases/{case_id}/images`](#post-apiv1admincasescase_idimages) | 上传图片 | 是 |
| 管理后台 | DELETE | [`/api/v1/admin/cases/{case_id}/images/{image_id}`](#delete-apiv1admincasescase_idimagesimage_id) | 删除图片 | 是 |
| 管理后台 | POST | [`/api/v1/admin/cases/{case_id}/images/{image_id}/cover`](#post-apiv1admincasescase_idimagesimage_idcover) | 设为封面 | 是 |
| 管理后台 | GET | [`/api/v1/admin/categories`](#get-apiv1admincategories) | 分类列表 | 是 |
| 管理后台 | POST | [`/api/v1/admin/categories`](#post-apiv1admincategories) | 新建分类 | 是 |
| 管理后台 | PUT | [`/api/v1/admin/categories/order`](#put-apiv1admincategoriesorder) | 调整分类顺序 | 是 |
| 管理后台 | PATCH | [`/api/v1/admin/categories/{category_id}`](#patch-apiv1admincategoriescategory_id) | 修改分类 | 是 |
| 管理后台 | DELETE | [`/api/v1/admin/categories/{category_id}`](#delete-apiv1admincategoriescategory_id) | 删除分类 | 是 |
| 管理后台 | GET | [`/api/v1/admin/tags`](#get-apiv1admintags) | 标签列表 | 是 |
| 管理后台 | POST | [`/api/v1/admin/tags`](#post-apiv1admintags) | 新建标签 | 是 |
| 管理后台 | PATCH | [`/api/v1/admin/tags/{tag_id}`](#patch-apiv1admintagstag_id) | 修改标签 | 是 |
| 管理后台 | DELETE | [`/api/v1/admin/tags/{tag_id}`](#delete-apiv1admintagstag_id) | 删除标签 | 是 |
| 管理后台 | POST | [`/api/v1/admin/imports`](#post-apiv1adminimports) | 触发导入上游快照 | 是 |
| 管理后台 | GET | [`/api/v1/admin/imports`](#get-apiv1adminimports) | 导入记录 | 是 |
| 管理后台 | GET | [`/api/v1/admin/imports/{run_id}`](#get-apiv1adminimportsrun_id) | 导入记录详情与日志 | 是 |
| 管理后台 | POST | [`/api/v1/admin/search/reindex`](#post-apiv1adminsearchreindex) | 重建搜索索引 | 是 |

## 前台

### GET /api/v1/cases

案例列表：浏览与搜索。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `category` | query | string \| null |  | 分类 slug |
| `q` | query | string \| null |  | 搜索关键词，最长 100 |
| `has_image` | query | boolean |  | 只返回有图片的案例，默认 `false` |
| `tag` | query | integer \| null |  | 标签 id |
| `cursor` | query | string \| null |  | 上一页返回的 next_cursor |
| `limit` | query | integer |  | 每页条数，≥1，≤60，默认 `24` |

| 状态码 | 响应 |
| --- | --- |
| 200 | [CasePage](#casepage) |

### GET /api/v1/cases/random

随机案例。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `category` | query | string \| null |  | 分类 slug |
| `q` | query | string \| null |  | 搜索关键词，最长 100 |
| `tag` | query | integer \| null |  | 标签 id |

| 状态码 | 响应 |
| --- | --- |
| 200 | [RandomCase](#randomcase) |

### GET /api/v1/cases/{case_id}

案例详情。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `case_id` | path | integer | 是 |  |

| 状态码 | 响应 |
| --- | --- |
| 200 | [CaseDetail](#casedetail) |

### GET /api/v1/categories

分类及计数。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `q` | query | string \| null |  | 搜索关键词，最长 100 |
| `tag` | query | integer \| null |  | 标签 id |

| 状态码 | 响应 |
| --- | --- |
| 200 | [CategoriesOut](#categoriesout) |

### GET /api/v1/tags

标签及案例数。

| 状态码 | 响应 |
| --- | --- |
| 200 | [TagCount](#tagcount)[] |

### GET /api/v1/meta

站点统计与上游信息。

| 状态码 | 响应 |
| --- | --- |
| 200 | [MetaOut](#metaout) |

### GET /api/v1/healthz

健康检查。

| 状态码 | 响应 |
| --- | --- |
| 200 | object |

## 鉴权

### POST /api/v1/auth/login

管理员登录。

请求体（`application/json`）：[LoginIn](#loginin)

| 状态码 | 响应 |
| --- | --- |
| 200 | [AdminMe](#adminme) |

### POST /api/v1/auth/logout

退出登录。

| 状态码 | 响应 |
| --- | --- |
| 204 | 无内容 |

### GET /api/v1/auth/me

当前管理员。 需要管理员登录。

| 状态码 | 响应 |
| --- | --- |
| 200 | [AdminMe](#adminme) |

## 管理后台

### GET /api/v1/admin/cases

案例列表（后台，含草稿）。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `q` | query | string \| null |  | 最长 100 |
| `status` | query | `draft` \| `published` \| `hidden` \| null |  |  |
| `category_id` | query | integer \| null |  |  |
| `origin` | query | string \| null |  |  |
| `has_image` | query | boolean \| null |  |  |
| `page` | query | integer |  | ≥1，默认 `1` |
| `page_size` | query | integer |  | ≥1，≤100，默认 `20` |

| 状态码 | 响应 |
| --- | --- |
| 200 | [AdminCasePage](#admincasepage) |

### POST /api/v1/admin/cases

新建案例。 需要管理员登录。

请求体（`application/json`）：[CaseCreate](#casecreate)

| 状态码 | 响应 |
| --- | --- |
| 201 | [AdminCaseDetail](#admincasedetail) |

### GET /api/v1/admin/cases/{case_id}

案例详情（后台）。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `case_id` | path | integer | 是 |  |

| 状态码 | 响应 |
| --- | --- |
| 200 | [AdminCaseDetail](#admincasedetail) |

### PATCH /api/v1/admin/cases/{case_id}

修改案例。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `case_id` | path | integer | 是 |  |

请求体（`application/json`）：[CaseUpdate](#caseupdate)

| 状态码 | 响应 |
| --- | --- |
| 200 | [AdminCaseDetail](#admincasedetail) |

### DELETE /api/v1/admin/cases/{case_id}

删除案例。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `case_id` | path | integer | 是 |  |

| 状态码 | 响应 |
| --- | --- |
| 204 | 无内容 |

### POST /api/v1/admin/cases/{case_id}/images

上传图片。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `case_id` | path | integer | 是 |  |

请求体（`multipart/form-data`）：[Body_upload_image_api_v1_admin_cases__case_id__images_post](#body_upload_image_api_v1_admin_cases__case_id__images_post)

| 状态码 | 响应 |
| --- | --- |
| 201 | [AdminCaseDetail](#admincasedetail) |

### DELETE /api/v1/admin/cases/{case_id}/images/{image_id}

删除图片。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `case_id` | path | integer | 是 |  |
| `image_id` | path | integer | 是 |  |

| 状态码 | 响应 |
| --- | --- |
| 200 | [AdminCaseDetail](#admincasedetail) |

### POST /api/v1/admin/cases/{case_id}/images/{image_id}/cover

设为封面。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `case_id` | path | integer | 是 |  |
| `image_id` | path | integer | 是 |  |

| 状态码 | 响应 |
| --- | --- |
| 200 | [AdminCaseDetail](#admincasedetail) |

### GET /api/v1/admin/categories

分类列表。 需要管理员登录。

| 状态码 | 响应 |
| --- | --- |
| 200 | [AdminCategory](#admincategory)[] |

### POST /api/v1/admin/categories

新建分类。 需要管理员登录。

请求体（`application/json`）：[CategoryCreate](#categorycreate)

| 状态码 | 响应 |
| --- | --- |
| 201 | [AdminCategory](#admincategory) |

### PUT /api/v1/admin/categories/order

调整分类顺序。 需要管理员登录。

请求体（`application/json`）：[CategoryOrder](#categoryorder)

| 状态码 | 响应 |
| --- | --- |
| 204 | 无内容 |

### PATCH /api/v1/admin/categories/{category_id}

修改分类。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `category_id` | path | integer | 是 |  |

请求体（`application/json`）：[CategoryUpdate](#categoryupdate)

| 状态码 | 响应 |
| --- | --- |
| 204 | 无内容 |

### DELETE /api/v1/admin/categories/{category_id}

删除分类。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `category_id` | path | integer | 是 |  |

| 状态码 | 响应 |
| --- | --- |
| 204 | 无内容 |

### GET /api/v1/admin/tags

标签列表。 需要管理员登录。

| 状态码 | 响应 |
| --- | --- |
| 200 | [TagCount](#tagcount)[] |

### POST /api/v1/admin/tags

新建标签。 需要管理员登录。

请求体（`application/json`）：[TagCreate](#tagcreate)

| 状态码 | 响应 |
| --- | --- |
| 201 | [TagCount](#tagcount) |

### PATCH /api/v1/admin/tags/{tag_id}

修改标签。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `tag_id` | path | integer | 是 |  |

请求体（`application/json`）：[TagUpdate](#tagupdate)

| 状态码 | 响应 |
| --- | --- |
| 204 | 无内容 |

### DELETE /api/v1/admin/tags/{tag_id}

删除标签。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `tag_id` | path | integer | 是 |  |

| 状态码 | 响应 |
| --- | --- |
| 204 | 无内容 |

### POST /api/v1/admin/imports

触发导入上游快照。 需要管理员登录。

| 状态码 | 响应 |
| --- | --- |
| 202 | [TaskAccepted](#taskaccepted) |

### GET /api/v1/admin/imports

导入记录。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `limit` | query | integer |  | ≥1，≤100，默认 `30` |

| 状态码 | 响应 |
| --- | --- |
| 200 | [ImportRunOut](#importrunout)[] |

### GET /api/v1/admin/imports/{run_id}

导入记录详情与日志。 需要管理员登录。

| 参数 | 位置 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- | --- |
| `run_id` | path | integer | 是 |  |

| 状态码 | 响应 |
| --- | --- |
| 200 | [ImportRunDetail](#importrundetail) |

### POST /api/v1/admin/search/reindex

重建搜索索引。 需要管理员登录。

| 状态码 | 响应 |
| --- | --- |
| 200 | [TaskAccepted](#taskaccepted) |

## 数据结构

### AdminCaseDetail

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `title` | string | 是 |  |
| `category` | [CategoryRef](#categoryref) | 是 |  |
| `source_text` | string | 是 |  |
| `source_url` | string \| null | 是 |  |
| `prompt` | string | 是 |  |
| `prompt_zh` | string | 是 |  |
| `prompt_en` | string | 是 |  |
| `prompt_format` | `text` \| `json` | 是 |  |
| `images` | [ImageOut](#imageout)[] | 是 |  |
| `tags` | [TagOut](#tagout)[] | 是 |  |
| `prev_id` | integer \| null |  |  |
| `next_id` | integer \| null |  |  |
| `created_at` | string（date-time） | 是 |  |
| `updated_at` | string（date-time） | 是 |  |
| `category_id` | integer | 是 |  |
| `status` | `draft` \| `published` \| `hidden` | 是 |  |
| `origin` | string | 是 |  |
| `upstream_no` | integer \| null | 是 |  |
| `overridden_fields` | string[] | 是 |  |

### AdminCaseItem

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `title` | string | 是 |  |
| `category` | [CategoryRef](#categoryref) | 是 |  |
| `status` | `draft` \| `published` \| `hidden` | 是 |  |
| `origin` | string | 是 |  |
| `upstream_no` | integer \| null | 是 |  |
| `cover` | [ImageOut](#imageout) \| null | 是 |  |
| `tags` | [TagOut](#tagout)[] | 是 |  |
| `overridden_fields` | string[] | 是 |  |
| `updated_at` | string（date-time） | 是 |  |

### AdminCasePage

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `items` | [AdminCaseItem](#admincaseitem)[] | 是 |  |
| `total` | integer | 是 |  |
| `page` | integer | 是 |  |
| `page_size` | integer | 是 |  |

### AdminCategory

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `slug` | string | 是 |  |
| `name` | string | 是 |  |
| `sort_order` | integer | 是 |  |
| `case_count` | integer | 是 |  |

### AdminMe

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `username` | string | 是 |  |

### CaseCreate

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `category_id` | integer | 是 |  |
| `title` | string | 是 | 最短 1，最长 200 |
| `source_text` | string |  | 最长 300，默认 `""` |
| `source_url` | string（uri） \| null |  | 最短 1，最长 2083 |
| `prompt` | string |  | 最长 50000，默认 `""` |
| `prompt_zh` | string |  | 最长 50000，默认 `""` |
| `prompt_en` | string |  | 最长 50000，默认 `""` |
| `prompt_format` | `text` \| `json` |  | 默认 `"text"` |
| `status` | `draft` \| `published` \| `hidden` |  | 默认 `"draft"` |
| `tag_ids` | integer[] |  |  |

### CaseDetail

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `title` | string | 是 |  |
| `category` | [CategoryRef](#categoryref) | 是 |  |
| `source_text` | string | 是 |  |
| `source_url` | string \| null | 是 |  |
| `prompt` | string | 是 |  |
| `prompt_zh` | string | 是 |  |
| `prompt_en` | string | 是 |  |
| `prompt_format` | `text` \| `json` | 是 |  |
| `images` | [ImageOut](#imageout)[] | 是 |  |
| `tags` | [TagOut](#tagout)[] | 是 |  |
| `prev_id` | integer \| null |  |  |
| `next_id` | integer \| null |  |  |
| `created_at` | string（date-time） | 是 |  |
| `updated_at` | string（date-time） | 是 |  |

### CasePage

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `items` | [CaseSummary](#casesummary)[] | 是 |  |
| `next_cursor` | string \| null | 是 |  |
| `total` | integer | 是 |  |
| `search_engine` | `meilisearch` \| `database` |  | 默认 `"database"` |

### CaseSummary

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `title` | string | 是 |  |
| `category` | [CategoryRef](#categoryref) | 是 |  |
| `source` | string | 是 |  |
| `excerpt` | string | 是 |  |
| `cover` | [ImageOut](#imageout) \| null | 是 |  |
| `tags` | [TagOut](#tagout)[] | 是 |  |
| `highlight` | [Highlight](#highlight) \| null |  |  |

### CaseUpdate

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `category_id` | integer \| null |  |  |
| `title` | string \| null |  | 最短 1，最长 200 |
| `source_text` | string \| null |  | 最长 300 |
| `source_url` | string（uri） \| null |  | 最短 1，最长 2083 |
| `prompt` | string \| null |  | 最长 50000 |
| `prompt_zh` | string \| null |  | 最长 50000 |
| `prompt_en` | string \| null |  | 最长 50000 |
| `prompt_format` | `text` \| `json` \| null |  |  |
| `status` | `draft` \| `published` \| `hidden` \| null |  |  |
| `tag_ids` | integer[] \| null |  |  |
| `clear_overrides` | boolean |  | 默认 `false` |

### CategoriesOut

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `items` | [CategoryCount](#categorycount)[] | 是 |  |
| `total` | integer | 是 |  |
| `with_image` | integer | 是 |  |

### CategoryCount

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `slug` | string | 是 |  |
| `name` | string | 是 |  |
| `total` | integer | 是 |  |
| `with_image` | integer | 是 |  |

### CategoryCreate

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 最短 1，最长 64 |
| `slug` | string | 是 | 最短 1，最长 64，格式 `^[a-z0-9]+(?:-[a-z0-9]+)*$` |

### CategoryOrder

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `ids` | integer[] | 是 |  |

### CategoryRef

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `slug` | string | 是 |  |
| `name` | string | 是 |  |

### CategoryUpdate

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string \| null |  | 最短 1，最长 64 |
| `slug` | string \| null |  | 最短 1，最长 64，格式 `^[a-z0-9]+(?:-[a-z0-9]+)*$` |

### Highlight

高亮片段：命中词用 \u0002 和 \u0003 包裹，前端据此拆分渲染，避免注入 HTML。

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `title` | string \| null |  |  |
| `excerpt` | string \| null |  |  |

### ImageOut

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `url` | string | 是 |  |
| `width` | integer | 是 |  |
| `height` | integer | 是 |  |
| `color` | string | 是 |  |
| `thumb` | [ImageVariant](#imagevariant) | 是 |  |
| `medium` | [ImageVariant](#imagevariant) | 是 |  |

### ImageVariant

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `url` | string | 是 |  |
| `width` | integer | 是 |  |
| `height` | integer | 是 |  |

### ImportRunDetail

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `upstream_commit` | string | 是 |  |
| `trigger` | string | 是 |  |
| `status` | string | 是 |  |
| `started_at` | string（date-time） | 是 |  |
| `finished_at` | string（date-time） \| null | 是 |  |
| `created` | integer | 是 |  |
| `updated` | integer | 是 |  |
| `skipped` | integer | 是 |  |
| `failed` | integer | 是 |  |
| `log` | string | 是 |  |

### ImportRunOut

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `upstream_commit` | string | 是 |  |
| `trigger` | string | 是 |  |
| `status` | string | 是 |  |
| `started_at` | string（date-time） | 是 |  |
| `finished_at` | string（date-time） \| null | 是 |  |
| `created` | integer | 是 |  |
| `updated` | integer | 是 |  |
| `skipped` | integer | 是 |  |
| `failed` | integer | 是 |  |

### LoginIn

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `username` | string | 是 | 最短 1，最长 64 |
| `password` | string | 是 | 最短 1，最长 128 |

### MetaOut

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `total` | integer | 是 |  |
| `with_image` | integer | 是 |  |
| `categories` | integer | 是 |  |
| `upstream` | [UpstreamInfo](#upstreaminfo) | 是 |  |
| `search_available` | boolean | 是 |  |

### RandomCase

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer \| null | 是 |  |

### TagCount

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `name` | string | 是 |  |
| `kind` | `style` \| `ratio` \| `model` \| `other` | 是 |  |
| `count` | integer | 是 |  |

### TagCreate

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 | 最短 1，最长 64 |
| `kind` | `style` \| `ratio` \| `model` \| `other` |  | 默认 `"style"` |

### TagOut

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `id` | integer | 是 |  |
| `name` | string | 是 |  |
| `kind` | `style` \| `ratio` \| `model` \| `other` | 是 |  |

### TagUpdate

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string \| null |  | 最短 1，最长 64 |
| `kind` | `style` \| `ratio` \| `model` \| `other` \| null |  |  |

### TaskAccepted

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `message` | string | 是 |  |
| `import_run_id` | integer \| null |  |  |

### UpstreamInfo

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
| `name` | string | 是 |  |
| `url` | string | 是 |  |
| `commit` | string | 是 |  |
| `license` | string | 是 |  |
