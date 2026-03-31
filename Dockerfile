# syntax=docker/dockerfile:1

# ─── ベースイメージ ───
FROM node:24-slim AS base
WORKDIR /app

# OS パッケージを最新化してセキュリティ脆弱性を修正 + OpenSSL（Prisma が必要）
RUN apt-get update && apt-get upgrade -y --no-install-recommends \
    && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

# pnpm のインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

# ─── 依存関係インストール ───
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# ─── ビルド ───
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm prisma generate
RUN pnpm run build

# ─── 本番イメージ ───
FROM node:24-slim AS runner
WORKDIR /app

# OS パッケージを最新化してセキュリティ脆弱性を修正 + OpenSSL（Prisma が必要）
# gosu: entrypoint で root → node への安全な権限降格に使用
# tini: PID 1 の init プロセスとしてゾンビプロセスを自動回収
RUN apt-get update && apt-get upgrade -y --no-install-recommends \
    && apt-get install -y --no-install-recommends openssl gosu tini sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# corepack キャッシュを /app 以下に設定（app ユーザーが書き込み可能にするため）
# ※ corepack prepare より前に設定しないと pnpm がデフォルト場所にキャッシュされ、
#   その後 COREPACK_HOME が変わると pnpm install 時に見つからず失敗する
ENV COREPACK_HOME=/app/.cache/corepack
RUN mkdir -p /app/.cache/corepack

RUN corepack enable && corepack prepare pnpm@latest --activate

# 本番依存のみインストール（--ignore-scripts で prepare/husky 等を無効化）
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Prisma クライアントを生成（本番 node_modules 内に生成）
RUN pnpm prisma generate

# ビルド成果物をコピー
COPY --from=builder /app/dist ./dist

# 起動時権限修正スクリプトをコピー
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# ストレージ・ログディレクトリを作成（corepack キャッシュは上で作成済み）
RUN mkdir -p /app/storage /app/logs

# アプリファイルの所有権を node ユーザーに設定
# (マウントされるボリューム /app/storage、/app/logs は entrypoint で起動時に修正)
RUN chown -R node:node /app

# entrypoint が root → node へ権限降格するため USER は設定しない
# (gosu node で実行するため実質 node ユーザーで動作する)

ENTRYPOINT ["tini", "--", "docker-entrypoint.sh"]
