---
title: 部署
status: active
updated: 2026-09-29
---

# 部署

生产环境是一台阿里云 ECS 上的 Docker Compose（选型见 [ADR-0008](../adr/0008-single-host-docker-compose.md)）。2026-09-29 已在阿里云测试服务器验证前端镜像构建成功、四个服务运行、服务器内部网页返回 HTTP 200、健康接口的数据库和搜索状态均为 `ok`。本次未验证素材导入和管理员登录等业务流程，首次部署时请继续检查并补充遇到的问题。

## 前提

- ECS 已安装 Docker 与 Docker Compose 插件。
- 网页入口默认是宿主机 HTTP 8080（`.env` 中的 `WEB_BIND`），因为当前服务器的 80 已被宝塔 Nginx 占用。直接公网访问时，安全组放行所需来源 IP 的 TCP 8080；改由宿主机 Nginx 配置域名和 HTTPS 反向代理后，把 `WEB_BIND` 设为 `127.0.0.1:8080`，并在安全组中关闭 8080。
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
| `web` | Nginx：托管前端构建产物、反向代理 `/api`、直接提供 `/media`（[`deploy/nginx.conf`](../../deploy/nginx.conf)），宿主机 `WEB_BIND`（默认 8080）转发至容器 80 |
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
| `WEB_BIND` | 网页入口在宿主机上的端口，默认 `8080`；由宿主机 Nginx 反向代理时设为 `127.0.0.1:8080`，只允许本机访问 |

## 后端构建下载缓存

后端在 `pyproject.toml` 中配置清华 PyPI 镜像为 uv 默认索引，并将镜像下载地址记录在 `uv.lock`。修改索引后需要在本地执行 `cd backend && uv lock`，检查依赖版本和下载地址的变化，再运行项目检查并提交配置与锁文件。Docker 使用 `--frozen`，不会在构建时自动重新生成锁文件。

后端 Dockerfile 的两个 `uv sync` 步骤挂载 BuildKit 缓存目录 `/root/.cache/uv`，并使用已有的 `UV_LINK_MODE=copy`。当 `pyproject.toml` 或 `uv.lock` 改变、安装层必须重建时，可以复用已下载的软件包。

缓存位于构建服务器，不随 Git 提交或镜像发布。首次使用缓存挂载仍需下载依赖；未缓存的新包也需要网络下载。不要为了常规更新清理构建缓存。镜像层缓存命中时整个安装步骤显示 `CACHED`；下载缓存则在步骤重新执行时减少下载。

修改后可执行 `docker compose --progress plain build api` 构建后端。`RUN --mount=...` 是 Dockerfile 指令，不能在 Shell 中直接执行。

## 前端构建依赖策略

pnpm 版本由 `frontend/package.json` 的 `packageManager` 字段固定（当前 10.33.0）：Dockerfile 通过 Corepack、CI 通过 `pnpm/action-setup` 读取该字段，本地 pnpm 也会自动切换到这个版本。升级 pnpm 时只改这一处。`frontend/pnpm-workspace.yaml` 通过 `allowBuilds` 明确允许 esbuild 的安装脚本；Dockerfile 在执行 `pnpm install --frozen-lockfile` 前复制该文件。依赖继续使用仓库现有锁文件。

如果构建报 `ERR_PNPM_IGNORED_BUILDS`，检查报错中的依赖及其脚本用途，将确实需要的依赖登记到 `allowBuilds` 后重新构建。不要在 Docker 构建中运行交互式 `pnpm approve-builds`，也不要为了绕过错误允许所有依赖执行脚本。

## 发布新版本

```bash
cd /opt/ai-images && git pull
docker compose up -d --build      # 数据库迁移在 api 启动时自动执行
```

如果本次发布更新了上游快照，发布后执行导入（见 [运维手册](operations.md#更新上游素材)）。

## HTTPS

以下为容器直接提供 HTTPS 的方式；如果由宿主机宝塔 Nginx 终止 HTTPS，则使用其证书与反向代理配置，不需要发布容器的 443 端口。

1. 证书放到 `deploy/certs/`（`fullchain.pem`、`privkey.pem`）。
2. 取消 `docker-compose.yml` 中 `./deploy/certs:/etc/nginx/certs:ro` 的注释。
3. 按 `deploy/nginx.conf` 末尾注释启用 443 配置，在 Compose 中添加 `443:443`（先确认宿主机 443 未被占用）。按访问方式配置 HTTP 跳转和端口映射。
4. `.env` 中 `COOKIE_SECURE=true`，`docker compose up -d --build`。

## 上线检查

- [ ] 所有密钥已替换为随机值，`.env` 未提交到仓库
- [ ] HTTPS 生效，`COOKIE_SECURE=true`
- [ ] 访问 `/api/docs` 返回 404（生产环境关闭）
- [ ] `curl https://域名/api/v1/healthz` 返回 `database: ok`、`search: ok`
- [ ] 前台可浏览、搜索；后台可登录、上传图片
- [ ] 备份脚本已配置 crontab，并演练过一次恢复
- [ ] 页脚展示 ICP 备案号（待实现，见 N08）
