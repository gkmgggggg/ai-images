#!/usr/bin/env bash
# 每日备份：数据库 + 上传图片 → 阿里云 OSS。搜索索引可以随时重建，不需要备份。
# 用法（在仓库根目录）：./deploy/backup.sh
# 定时：crontab -e 加入  30 3 * * * cd /opt/ai-images && ./deploy/backup.sh >> /var/log/ai-images-backup.log 2>&1
set -euo pipefail

cd "$(dirname "$0")/.."
set -a
# shellcheck disable=SC1091
source .env
set +a

: "${OSS_BACKUP_URI:?请在 .env 中设置 OSS_BACKUP_URI}"
command -v ossutil >/dev/null || { echo "需要先安装并配置 ossutil"; exit 1; }

stamp=$(date +%Y%m%d-%H%M%S)
workdir=$(mktemp -d)
trap 'rm -rf "$workdir"' EXIT

echo "[$stamp] 导出数据库"
docker compose exec -T postgres pg_dump -U atlas -d ai_images --format=custom > "$workdir/db-$stamp.dump"

echo "[$stamp] 打包图片"
docker compose run --rm --no-deps --user root -v "$workdir:/backup" --entrypoint sh api \
  -c "tar -czf /backup/media-$stamp.tar.gz -C /data media"

echo "[$stamp] 上传到 $OSS_BACKUP_URI"
ossutil cp "$workdir/db-$stamp.dump" "$OSS_BACKUP_URI/db/"
ossutil cp "$workdir/media-$stamp.tar.gz" "$OSS_BACKUP_URI/media/"

echo "[$stamp] 完成"
