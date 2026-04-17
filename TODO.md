# saika - TODO

> タスク管理・進捗状況・残件リスト

最終更新: 2026年4月17日

---

## 残タスク サマリー

| # | セクション | 概要 | 残件 |
| --- | --- | --- | ---: |
| 1 | VC 募集 UX 改善 | 移動機能削除 + 入室中 VC default + AFK 除外 | 2 |
| 2 | リアクションロール ボタン色 UI | モーダル → 色選択 SelectMenu 化 | 2 |
| 3 | guild-config export/import 完全対応化 | Postgres 移行前のデータ保全 | 2 |
| 4 | shared への外出し | saika 内のインフラコードを `@ayasono/shared` に移行 | 4 |
| 5 | Postgres 移行 | SQLite → PostgreSQL + 2 件のリネーム合体 | 6 |
| 6 | ディレクトリ再編 | `src/{bot,api,features,shared}/` 構造に整理 | 5 |
| 7 | Fastify API 実装 | web フロントエンド完成後、契約通りに実装 | 5 |
| 8 | Bot 一般公開準備 | コマンド追加・認証申請 | 3 |
| **合計** | | | **29** |

> インフラ側(VPS / Cloudflare / Coolify 本体)の作業は [`../infra/TODO.md`](../infra/TODO.md)、web ダッシュボード側の作業は [`../web/TODO.md`](../web/TODO.md) で管理。
> 作業順序は上から順に進める前提。セクション 5 以降は web 側の進行状況と依存関係あり:
> - セクション 5(Postgres 移行)着手前に web 側で API 契約(`@ayasono/shared/api/types`)が確定していること
> - セクション 7(Fastify API 実装)着手前に web フロントエンドがモック駆動で完成していること

---

## タスク一覧

### 1. VC 募集 UX 改善

- [ ] 募集者を VC に移動する機能の削除(未入室時に動作せず実用性低)
- [ ] 入室中 VC の default 選択 + AFK チャンネル除外(VAC トリガー除外と同じ仕組み)
- 仕様書: [VC_RECRUIT_SPEC.md](docs/specs/VC_RECRUIT_SPEC.md)(着手時更新)

### 2. リアクションロール ボタン色 UI 改善

- [ ] モーダルのテキスト入力 → 色選択 StringSelectMenu(Blue / Gray / Green / Red、英語固定・i18n 対象外)
- [ ] setup / add-button / edit-button の 3 フロー対応
- 仕様書: [REACTION_ROLE_SPEC.md](docs/specs/REACTION_ROLE_SPEC.md)(更新済み)

### 3. guild-config export/import 完全対応化

Postgres 移行前のデータ保全前提。stateful モデル(`GuildTicketConfig` / open 状態の `Ticket` / `StickyMessage` / `GuildReactionRolePanel` / `GuildVacConfig.createdChannels`)を export に追加。import は「設定系=export 上書き」「stateful=現 DB 優先+欠落分のみ insert、削除はしない」の簡素化マージ方式。同一ギルド内バックアップ・DB 移行専用。`version: 1` 付与。

- [ ] 仕様書更新: [GUILD_CONFIG_SPEC.md](docs/specs/GUILD_CONFIG_SPEC.md)
- [ ] 実装

### 4. shared への外出し

[PROJECT_ARCHITECTURE.md](../infra/docs/PROJECT_ARCHITECTURE.md) の「v0.1.0 に含める最小セット」に従い、saika 内のインフラコードを `@ayasono/shared` に移行する。shared リポジトリのセットアップ自体は [infra/TODO.md の「shared リポジトリ セットアップ」](../infra/TODO.md) で実施。

対象: logger / discordWebhookTransport / prisma / errors / locale セットアップ

- [ ] `package.json` に `@ayasono/shared`(git URL + タグ `v0.1.0`)を追加
- [ ] `src/shared/utils/logger.ts` / `discordWebhookTransport.ts` / `prisma.ts`、`src/shared/errors/`、`src/shared/locale/` のセットアップ部分を `@ayasono/shared/core/*` の import に置き換え
- [ ] 移行済みファイルを saika 側から削除
- [ ] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) の該当箇所を `@ayasono/shared/core` 経由に更新

### 5. Postgres 移行

SQLite → PostgreSQL + `-config → -settings` + `vc-recruit → instant-recruit` の合体。インフラ作業: [infra/TODO.md の「Postgres 導入」](../infra/TODO.md)。**web 側で API 契約(`@ayasono/shared/api/types`)が確定した後に着手**(契約から逆算した schema で migration を一度で済ませる)。

- [ ] `schema.prisma` の provider 切替(sqlite → postgresql)
- [ ] JSON 文字列カラムを jsonb 化(7 箇所)+ アプリ側の `JSON.parse/stringify` 除去
- [ ] `-config` → `-settings` リネーム(コマンド・ファイル・変数・DB テーブル・ドキュメント)
- [ ] `vc-recruit` → `instant-recruit` リネーム(+ 仕様書ファイル名を `INSTANT_RECRUIT_SPEC.md` に)
- [ ] migration 再生成、ローカル検証、本番切替(export → import)
- [ ] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) / [DEPLOYMENT.md](docs/guides/DEPLOYMENT.md) 更新

### 6. ディレクトリ再編

[PROJECT_ARCHITECTURE.md](../infra/docs/PROJECT_ARCHITECTURE.md) の「各 Bot リポジトリの内部構成」に揃える。Postgres 移行で `parseJsonArray` 等が消えた状態で着手するため、移動対象が最小化される前提。**Postgres 移行完了後に着手**。

- [ ] エントリポイント移動: `src/bot/main.ts` → `src/main.ts`
- [ ] `src/bot/features/<f>/` と `src/shared/features/<f>/` を `src/features/<f>/` に統合(Discord 依存部分の残し方は feature ごとに判断)
- [ ] `src/shared/database/repositories/` の Repository を `src/features/<f>/repository.ts` に分散
- [ ] `src/shared/scheduler/` は saika 固有として `src/shared/` に維持(hibiki 着手時に shared 共通化を再検討)
- [ ] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) の「部分的に旧前提」ブロック削除 + 新構造で全面書き直し

### 7. Fastify API 実装

web フロントエンドがモック駆動(MSW 等)で完成した後、契約通りに Fastify API を実装する。契約は [`@ayasono/shared/api/types`](../web/TODO.md) で web 側と共有済みのため、型エラーが出ない = 契約準拠の状態になる。

- [ ] `src/api/server.ts` + `src/api/routes/` 追加(Bot と同一プロセス内で起動)
- [ ] 認証層(`@ayasono/shared/api/middlewares/authenticate` + `requireGuildAccess`)を組み込み
- [ ] 機能別エンドポイント(ギルド設定 / AFK / Bump リマインダー / VAC / メンバーログ / VC 募集 / チケット / リアクションロール / メッセージ固定)を契約通りに実装
- [ ] Coolify で API ポート公開設定(`api.saika.sonozaki.net` の Cloudflare Public Hostname 追加)
- [ ] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) 更新

### 8. Bot 一般公開準備

- [x] ライセンスを MIT → AGPL-3.0 に変更
- [ ] `/about` コマンド(公式 URL + バージョン)
- [ ] help コマンドにダッシュボード URL リンク追加
- [ ] Discord Bot 認証申請(75 サーバー到達後)

---

## 機能拡張アイデア

- **予約募集(イベント募集)機能** — 他タスク完了後に実装可否判断。骨子: 予約時に VC + Discord Scheduled Event 作成 / RSVP・リマインダー・開始通知は Discord 標準任せ / VC 自動削除なし(投稿削除 or イベント終了ボタンで手動)/ 編集機能あり(日時・タイトル・説明)/ setup は既存 VC 募集と同構成 / VC 名変更は既存 `/vc rename` 流用。細部は実装決定時に詰める
- 自動翻訳機能(DeepL API 等)
- 投票システム(グラフ化・レポート集計で Discord 標準との差別化)
- メトリクス収集 / アラート設定(運用規模拡大時)

---

## 完了済み

> 詳細な作業経過は git log を参照。

### Coolify 移行

- [x] `docker-compose.coolify.yml` を新規作成(既存ボリュームを引き継いでロールバックを成立させる構成)
- [x] Coolify 上で saika アプリを作成し、環境変数を設定 → テストデプロイで `saika-bot` が正常起動することを確認
- [x] GitHub Webhook による自動デプロイ設定・動作確認
- [x] Coolify の Discord 通知設定
- [x] `.github/workflows/deploy.yml` の自動トリガーを停止(`workflow_dispatch` のみに変更)
- [x] `docs/guides/DEPLOYMENT.md` を Coolify ベースに書き換え
- [x] 旧ファイルを一括削除(`docker-compose.portainer.yml`、`.github/workflows/deploy.yml`、`.github/workflows/notify.yml`)
- [x] ドキュメントから Portainer 関連記述を削除
- [x] GitHub Secrets の `PORTAINER_*` 系を削除

