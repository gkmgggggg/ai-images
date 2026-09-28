---
title: 安全
status: active
updated: 2026-09-28
requirements: [F10]
---

# 安全

后台只有管理员账号（命令行创建），会话是存在 HttpOnly Cookie 中的 JWT；公开接口只读且只暴露已发布内容。本文列出现有措施和已知限制，上线前检查项见 [部署指南](../guides/deployment.md#上线检查)。

## 鉴权

| 项 | 做法 | 代码 |
| --- | --- | --- |
| 账号 | 只能用 `atlas create-admin` 创建或重置，密码至少 8 位，pwdlib 推荐算法（Argon2）哈希 | [`cli.py`](../../backend/app/cli.py)、[`core/security.py`](../../backend/app/core/security.py) |
| 会话 | 登录成功后写 Cookie `atlas_session`：HS256 JWT，有效期 7 天，`HttpOnly`、`SameSite=Lax`，生产环境 `Secure` | [`api/v1/auth.py`](../../backend/app/api/v1/auth.py) |
| 校验 | `/admin/*` 路由统一依赖 `current_admin`，无效或缺失时返回 401 | [`api/deps.py`](../../backend/app/api/deps.py) |
| 前端 | 后台请求 401 时跳转登录页；登录后的跳转地址只允许 `/admin` 开头 | [`main.tsx`](../../frontend/src/main.tsx)、[`LoginPage.tsx`](../../frontend/src/features/admin/LoginPage.tsx) |
| 登录限流 | 同一来源 IP 5 分钟内失败 5 次后拒绝登录（429） | `LoginRateLimiter` |

CSRF：Cookie 为 `SameSite=Lax`，浏览器不会在跨站的 POST/PUT/PATCH/DELETE 请求中携带它；所有写接口都不是 GET，因此不另设 CSRF 令牌。

## 输入与上传

- 所有请求参数由 Pydantic 校验，错误统一返回 `{code, message, errors}`（422）。
- 上传：先读取最多 10 MB + 1 字节判断大小（超过返回 413）；只接受 JPEG/PNG/WebP；像素不超过 6000 万；重新编码后保存，去掉元数据和伪装成图片的内容；文件名为内容 hash，不使用用户提供的文件名。
- 存储路径由 [`LocalStorage`](../../backend/app/services/storage.py) 校验必须位于媒体根目录内。
- 高亮片段不用 HTML 标签，前端不使用 `innerHTML`。

## 部署

- Meilisearch 只在 Compose 内部网络可达，后端使用 master key 访问。
- 生产环境关闭 `/api/docs` 与 `/api/openapi.json`。
- Nginx 为所有响应加 `X-Content-Type-Options: nosniff` 与 `Referrer-Policy`。
- 容器内后端以非 root 用户运行。
- 所有密钥来自 `.env`，仓库只提交 `.env.example`。

## 已知限制

| 限制 | 影响 | 后续 |
| --- | --- | --- |
| 登录限流保存在进程内存中，生产环境有 2 个 worker | 实际上限约为每个 worker 5 次；重启后清零 | 需要更严格时改用数据库或 Redis 计数 |
| JWT 无法单独吊销 | 退出只删除本机 Cookie；泄露的令牌在 7 天内有效 | 必要时更换 `JWT_SECRET` 使全部会话失效 |
| 没有操作审计日志 | 无法追查谁改了什么 | 管理员增多时考虑 |
