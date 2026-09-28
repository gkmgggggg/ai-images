---
title: 运维手册
status: active
updated: 2026-09-28
---

# 运维手册

常见运维操作的步骤。以下命令在生产环境（仓库目录 `/opt/ai-images`）执行；本地开发把 `docker compose exec api atlas` 换成在 `backend/` 下 `uv run atlas`。

## 更新上游素材

1. 在开发机用上游新版本替换 `resources/image-inspirer/db`，把新的 commit 写入 `resources/image-inspirer/UPSTREAM_COMMIT`。
2. 本地执行 `uv run atlas import` 确认失败数为 0，提交并发布。
3. 生产环境在后台「导入与索引」点「重新导入上游快照」，或执行 `docker compose exec api atlas import`。
4. 查看导入记录中的计数与日志。管理员改过的字段不会被覆盖（见 [导入管线](../architecture/import-pipeline.md#手工修改保护)）。

同一时间只能有一个导入任务；超过 1 小时仍在运行的记录会在下次导入时被标记为失败。

## 重建搜索索引

适用：前台提示「已切换为基础匹配」、搜索结果与后台数据不一致、更换 Meilisearch 数据卷之后。

- 后台「导入与索引」→「重建搜索索引」，或
- `docker compose exec api atlas reindex`

全量重建约 1 秒，期间搜索结果可能短暂为空。

## 管理员账号

```bash
docker compose exec api atlas create-admin <用户名>            # 新建
docker compose exec api atlas create-admin <用户名> --reset    # 重置密码
```

要让所有已登录会话失效：更换 `.env` 中的 `JWT_SECRET` 后 `docker compose up -d api`。

## 备份与恢复

[`deploy/backup.sh`](../../deploy/backup.sh) 把数据库（`pg_dump` 自定义格式）和图片目录打包上传到 `OSS_BACKUP_URI`。需要先安装并配置 [ossutil](https://help.aliyun.com/zh/oss/developer-reference/ossutil)。定时任务：

```cron
30 3 * * * cd /opt/ai-images && ./deploy/backup.sh >> /var/log/ai-images-backup.log 2>&1
```

恢复（从 OSS 下载备份文件到当前目录后）：

```bash
docker compose exec -T postgres pg_restore -U atlas -d ai_images --clean --if-exists < db-<时间>.dump
docker compose run --rm --no-deps --user root -v "$PWD:/backup" --entrypoint sh api \
  -c "tar -xzf /backup/media-<时间>.tar.gz -C /data"
docker compose exec api atlas reindex
```

## 故障排查

| 现象 | 检查 |
| --- | --- |
| 前台空白或 502 | `docker compose ps`；`docker compose logs api --tail 100` |
| 搜索降级提示 | `docker compose logs meilisearch`；`/api/v1/healthz` 的 `search` 字段；恢复后执行重建索引 |
| 图片 404 | 确认 `media` 数据卷挂载在 `web` 与 `api`；文件在 `/data/media/originals`、`/data/media/variants` 下 |
| 后台无法登录（HTTP 访问时） | HTTPS 未配置但 `COOKIE_SECURE=true`，浏览器不保存 Cookie |
| 登录提示「失败次数过多」 | 同一 IP 5 分钟内失败 5 次，等待 5 分钟或重启 `api` |
| 导入一直显示「进行中」 | `api` 在导入中途重启会中断任务；1 小时后可重新触发，或直接执行 `atlas import` |
