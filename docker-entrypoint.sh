#!/bin/sh
# docker-entrypoint.sh
# コンテナ起動時に以下を順に実行する:
#   1. storage ディレクトリの所有権を node:node に修正
#   2. Prisma マイグレーションを適用
#   3. node ユーザーに切り替えてメインプロセスを起動
#
# 背景:
#   Docker の名前付きボリューム (sqlite_data) はホスト側で root が作成するため、
#   過去のデプロイやボリューム再利用時に db.sqlite / db.sqlite-wal / db.sqlite-shm が
#   root 所有になることがある。そのままだと node ユーザーで動く PrismaLibSql
#   (libsql アダプター) が書き込めず SQLITE_READONLY エラーが発生する。
#   この entrypoint では gosu を使って root → node への権限降格を安全に行う。

set -e

# storage ディレクトリ (名前付きボリューム) の所有権を node:node に修正
# /app/logs はバインドマウントのためホスト側へ影響させず対象外とする
chown -R node:node /app/storage

# node ユーザーでマイグレーションを実行（スキーマ変更がなければ即座に完了する）
# 失敗記録が残っている場合は自動で resolve してリトライする
if ! gosu node pnpm prisma migrate deploy 2>&1; then
  echo "[entrypoint] migrate deploy failed, attempting to resolve failed migrations..."
  FAILED=$(sqlite3 /app/storage/db.sqlite \
    "SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL;" 2>/dev/null || true)
  if [ -n "$FAILED" ]; then
    for name in $FAILED; do
      echo "[entrypoint] resolving: $name"
      gosu node pnpm prisma migrate resolve --applied "$name"
    done
    echo "[entrypoint] retrying migrate deploy..."
    gosu node pnpm prisma migrate deploy
  else
    echo "[entrypoint] no failed migrations found, exiting."
    exit 1
  fi
fi

# node ユーザーに切り替えて引数のコマンドを実行
exec gosu node "$@"
