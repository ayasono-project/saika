# デプロイガイド

> Coolify による saika の自動デプロイフロー

最終更新: 2026年4月14日（Coolify 移行）

---

## 概要

Coolify が GitHub リポジトリの main ブランチへの push を検知し、Docker Compose でビルド・デプロイを自動で行う。

### 本番環境の構成

```
XServer VPS (Ubuntu 24.04)
├── Coolify (ホスト直インストール)           ← コンテナ管理・自動デプロイ基盤
├── Docker Compose (Infra スタック: infra)   ← /opt/infra/ で管理
│   └── cloudflared コンテナ                 ← Cloudflare Tunnel（外部アクセス用）
└── Coolify App (saika)                      ← Docker Compose デプロイ
    └── bot コンテナ (saika-bot)             ← Discord Bot 本体
```

Coolify は VPS にホスト直インストールされ、`https://coolify.sonozaki.net` からアクセスできる。
Cloudflare Tunnel 経由のため VPS のポート公開は不要（Webhook 用の 8000 番ポートを除く）。

### デプロイフロー全体図

```
main へ push / PR マージ
  └── Coolify が Webhook で検知
        ├── GitHub からリポジトリを pull
        ├── docker-compose.coolify.yml に従ってビルド・起動
        └── entrypoint でマイグレーション実行 → Bot 起動
```

---

## 1. Coolify の設定

### アプリ設定

| 項目 | 値 |
| --- | --- |
| Project | ayasono |
| Environment | production |
| Source | GitHub App (`coolify-ayasono`) |
| Repository | `ayasono-project/saika` |
| Branch | `main` |
| Build Pack | Docker Compose |
| Docker Compose Location | `/docker-compose.coolify.yml` |

### 環境変数

Coolify の管理画面 **Environment Variables** で設定する。サーバー上の `.env` ファイルは使用しない。

| 変数名 | 必須 | 内容 |
| --- | --- | --- |
| `DISCORD_TOKEN` | Yes | Discord Developer Portal で取得 |
| `DISCORD_APP_ID` | Yes | Discord Developer Portal で取得 |
| `DATABASE_URL` | No | デフォルト: `file:./storage/db.sqlite` |
| `LOCALE` | No | デフォルト: `ja` |
| `NODE_ENV` | No | デフォルト: `production` |
| `LOG_LEVEL` | No | デフォルト: `info` |
| `DISCORD_ERROR_WEBHOOK_URL` | No | エラー通知用 Discord Webhook URL |
| `USER_MANUAL_URL` | No | ユーザーマニュアルの URL |

---

## 2. Compose ファイルの構成

| ファイル | 用途 |
| --- | --- |
| `docker-compose.coolify.yml` | Coolify デプロイ用（本番で使用） |

Coolify は Git push をトリガーに `docker-compose.coolify.yml` を使ってビルド・デプロイする。compose ファイルの変更はリポジトリに push すれば次回デプロイ時に自動で反映される。

---

## 3. ロールバック手順

### 3-1. Coolify UI でのロールバック

Coolify の **Rollback** メニューから過去のデプロイを選んでロールバックできる。

### 3-2. Git revert でのロールバック

```bash
git revert <問題のコミットSHA>
git push origin main
# → Coolify が自動でデプロイ
```

---

## 4. トラブルシューティング

### bot コンテナの起動後すぐクラッシュする

```bash
# Coolify UI → Logs で確認
# または SSH で:
docker logs saika-bot --tail 50
```

- Coolify の環境変数が正しく設定されているか確認
- `sqlite_data` ボリュームの権限エラーがないか確認

### DB データが初期値になっている

Coolify がアプリを再作成した場合や、ボリュームが新規生成された場合に発生する。復旧手順は [DEV_TIPS.md](DEV_TIPS.md#coolify-で-db-データを復旧する) を参照。

### SQLITE_READONLY エラーが発生する

`docker-entrypoint.sh` がコンテナ起動時に `chown -R node:node /app/storage` を自動実行するため、通常は発生しない。発生した場合は Coolify のコンテナ名を確認して実行:

```bash
docker exec -u root <コンテナ名> chown -R node:node /app/storage
```

### Coolify が GitHub リポジトリにアクセスできない

- Coolify の **Sources** で GitHub App (`coolify-ayasono`) が正しく設定されているか確認
- GitHub の `ayasono-project` org に GitHub App がインストールされているか確認

### Webhook が届かない

- VPS のファイアウォール（ufw）でポート 8000 が開いているか確認
- XServer VPS のパケットフィルター設定でポート 8000 / TCP が許可されているか確認

---

## 5. Docker・デプロイ関連ファイルの変更ルール

> Dockerfile / docker-compose ファイルを変更する場合は、必ずローカルでテストを通過させてからコミットすること。

### 対象ファイル

| ファイル | ローカルテスト方法 |
| --- | --- |
| `Dockerfile` | `docker build --target runner .` が成功すること |
| `docker-compose.coolify.yml` | `docker compose -f docker-compose.coolify.yml config` でバリデーションが通ること |

### Dockerfile 変更時の必須手順

```bash
# 1. runner ステージのビルドが最後まで通ることを確認
docker build --target runner .

# 2. エラーが出た場合は --progress=plain でログを確認
docker build --target runner --progress=plain . 2>&1 | tail -50
```

### チェックリスト

- [ ] `docker build --target runner .` がエラーなく完了する
- [ ] `docker compose -f docker-compose.coolify.yml config` がバリデーションを通る
- [ ] ローカルビルド確認後にコミットしている

---

## 関連ドキュメント

- [ARCHITECTURE.md](ARCHITECTURE.md) — システム構成・アーキテクチャ解説
- [docker-compose.coolify.yml](../../docker-compose.coolify.yml) — Coolify デプロイ用 Compose 定義
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml) — CI ワークフロー定義
