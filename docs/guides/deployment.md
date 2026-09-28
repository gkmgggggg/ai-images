---
title: 部署
status: active
updated: 2026-09-28
---

# 部署

生产环境是一台阿里云 ECS 上的 Docker Compose（选型见 [ADR-0008](../adr/0008-single-host-docker-compose.md)）。**这套配置尚未在真实服务器上构建运行过**（开发机没有 Docker），首次部署时请留意并把遇到的问题补充到本文。

## 前提

- ECS 已安装 Docker 与 Docker Compose 插件；安全组开放 80、443。
- 域名解析到境内服务器前需完成 ICP 备案（审核需要一段时间，尽早提交）。
- 拉取 Docker Hub / ghcr.io 镜像慢时，在 Docker daemon 中配置阿里云镜像加速器。

## 首次部署

```bash
git clone <仓库地址> /opt/ai-images && cd /opt/ai-images
cp .env.example .env          # 用 openssl rand -hex 32 生成各项密钥
docker compose up -d --build
docker compose exec api atlas import
docker compose exec api atlas create-admin admin
```

| 服务 | 说明 |
| --- | --- |
| `web` | Nginx：托管前端构建产物、反向代理 `/api`、直接提供 `/media`（[`deploy/nginx.conf`](../../deploy/nginx.conf)），暴露 80/443 |
| `api` | FastAPI，2 个 worker，以非 root 用户运行，启动时执行 `alembic upgrade head` |
| `postgres` | PostgreSQL 16，数据卷 `pgdata` |
| `meilisearch` | 不暴露端口，数据卷 `meili_data`（可随时 `atlas reindex` 重建） |

图片数据卷 `media` 由 `api` 读写、`web` 只读挂载。

## 环境变量（仓库根目录 `.env`）

| 变量 | 说明 |
| --- | --- |
| `POSTGRES_PASSWORD` | 数据库密码 |
| `MEILI_MASTER_KEY` | Meilisearch 主密钥，至少 16 字节 |
| `JWT_SECRET` | 会话签名密钥；更换后所有管理员需要重新登录 |
| `COOKIE_SECURE` | HTTPS 生效前设为 `false`，否则 HTTP 下无法登录 |
| `OSS_BACKUP_URI` | 备份目标，如 `oss://bucket/ai-images-backup` |

## 发布新版本

```bash
cd /opt/ai-images && git pull
docker compose up -d --build      # 数据库迁移在 api 启动时自动执行
```

如果本次发布更新了上游快照，发布后执行导入（见 [运维手册](operations.md#更新上游素材)）。

## HTTPS

1. 证书放到 `deploy/certs/`（`fullchain.pem`、`privkey.pem`）。
2. 取消 `docker-compose.yml` 中 `./deploy/certs:/etc/nginx/certs:ro` 的注释。
3. 按 `deploy/nginx.conf` 末尾注释启用 443 配置，80 端口改为跳转 HTTPS。
4. `.env` 中 `COOKIE_SECURE=true`，`docker compose up -d --build`。

## 上线检查

- [ ] 所有密钥已替换为随机值，`.env` 未提交到仓库
- [ ] HTTPS 生效，`COOKIE_SECURE=true`
- [ ] 访问 `/api/docs` 返回 404（生产环境关闭）
- [ ] `curl https://域名/api/v1/healthz` 返回 `database: ok`、`search: ok`
- [ ] 前台可浏览、搜索；后台可登录、上传图片
- [ ] 备份脚本已配置 crontab，并演练过一次恢复
- [ ] 页脚展示 ICP 备案号（待实现，见 N08）
