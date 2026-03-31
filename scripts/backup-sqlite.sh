#!/bin/sh
# scripts/backup-sqlite.sh
# SQLite データベースの安全なバックアップを取得し、7 世代分をローテーションする。
#
# 使い方（VPS の cron に登録）:
#   0 3 * * * /opt/saika/scripts/backup-sqlite.sh >> /opt/saika/logs/backup.log 2>&1
#
# 前提:
#   - VPS に sqlite3 がインストールされていること（apt install sqlite3）
#   - Docker ボリュームが /var/lib/docker/volumes/saika_sqlite_data/_data にマウントされていること
#     （パスが異なる場合は DB_PATH を変更する）

set -e

DB_PATH="/var/lib/docker/volumes/saika_sqlite_data/_data/db.sqlite"
BACKUP_DIR="/opt/saika/backups"
KEEP_GENERATIONS=7

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/db_${TIMESTAMP}.sqlite"

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_PATH" ]; then
  echo "$(date): Database not found: $DB_PATH — skipping backup"
  exit 0
fi

echo "$(date): Starting backup → $BACKUP_FILE"
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"
echo "$(date): Backup complete ($(du -h "$BACKUP_FILE" | cut -f1))"

# 古い世代を削除
ls -1t "${BACKUP_DIR}"/db_*.sqlite 2>/dev/null | tail -n +$((KEEP_GENERATIONS + 1)) | xargs -r rm -f

echo "$(date): Current backups:"
ls -lh "${BACKUP_DIR}"/db_*.sqlite 2>/dev/null
