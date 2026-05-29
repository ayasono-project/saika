#!/bin/sh
# docker-entrypoint.sh
# コンテナ起動時に以下を順に実行する:
#   1. PostgreSQL に対して Prisma マイグレーションを適用
#   2. node ユーザーに切り替えてメインプロセスを起動
#
# 背景:
#   DB は外部の PostgreSQL（Coolify マネージド DB）に接続するため、SQLite 時代の
#   ストレージボリュームの所有権修正は不要になった。root で起動し gosu でアプリ実行を
#   node ユーザーへ降格する構成のみ維持する（PID 1 は tini）。

set -e

# node ユーザーでマイグレーションを適用（スキーマ変更がなければ即座に完了する）
gosu node pnpm prisma migrate deploy

# node ユーザーに切り替えて引数のコマンドを実行
exec gosu node "$@"
