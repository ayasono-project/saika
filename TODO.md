# saika - TODO

> タスク管理・進捗状況・残件リスト

最終更新: 2026年5月31日

---

## 残タスク サマリー

| # | セクション | 概要 | 残件 |
| --- | --- | --- | ---: |
| 8 | 自動キック（非アクティブ整理） | 一定期間未活動メンバーの自動キック + 事前通知 | 2 |
| 9 | 未承認ユーザー自動キック | 認証ロール未取得ユーザーの自動キック + 警告 DM | 3 |
| 10 | VC 参加招待メッセージ | VC参加時に指定チャンネルへカスタム招待メッセージを自動投稿 | 3 |
| 11 | Fastify API 実装 | web 完成後に契約通り実装 | 5 |
| 12 | Bot 一般公開準備 | コマンド追加・認証申請 | 3 |
| **合計** | | | **16** |

> web ダッシュボード・インフラ（VPS / Cloudflare / Coolify）は別リポジトリで管理。
> 作業順序は上から順（§8 → §9 → …）。§11（Fastify API）は web 側の進行に依存（着手前に web がモック駆動で完成していること）。

---

## タスク一覧

### 8. 自動キック機能（非アクティブメンバー整理）

一定期間テキスト/VC で活動がないメンバーを自動キック。[member-log](src/bot/features/member-log/) の流儀（本文可変・embed 固定・DB 保存・変数差し込み）に揃える。§5 完了後、新ディレクトリ構造で実装。

- [x] 仕様書作成: [INACTIVE_KICK_SPEC.md](docs/specs/INACTIVE_KICK_SPEC.md)（活動=テキスト+VC+リアクション / 段階通知=チャンネルのみ 1週間前・3日前・当日 / 除外=Bot・Administrator・whitelist・VC接続中 / dry-run=`TEST_MODE` / 対象ロール自動付与 / 単一波括弧。安全策: 警告ゲート `warnStage==2` 必須・`enabledAt` 起算下限・送信成功後に warnStage 前進・除外時の猶予クリア）
- [ ] 実装（DB スキーマ `GuildInactiveKickSettings`/`MemberActivity` + `/inactive-kick-settings` コマンド群 + アクティビティ記録ハンドラ + 日次チェック `addJob` + 段階通知 + キック実行。`GuildMessageReactions` Intent / Partials 追加）
- [ ] テスト（候補抽出・段階判定・警告ゲート / 除外・猶予クリア / 通知文整形 / 日次チェック通し）

### 9. 未承認ユーザー自動キック

参加から指定期間内に認証ロール未取得のユーザーを自動キック（Ikoitter の手動運用を公開 Bot 向けに汎用化）。確定事項は Notion [引き継ぎ](https://www.notion.so/3638e698a89281eb967ec072a47751e3) 参照（1 日 1 回 cron / `graceDays` 1–30 / Embed ログ / 起算点 `joinedAt` / バリデーション失敗時 `enabled=false`）。

- [ ] 仕様書作成: `docs/specs/UNVERIFIED_KICK_SPEC.md`（警告 DM テンプレート・変数 / `/autokick preview` のページング / プロフィールリンクの扱いを確定）
- [ ] 実装（`AutoKickConfig` + `/autokick` コマンド群 + 日次 cron + 警告 DM + バリデーション + Embed ログ）
- [ ] テスト（判定ロジック / 自動 disable / preview 整形 / 警告 DM 24h ウィンドウ）

### 10. VC 参加時の招待メッセージ自動投稿

メンバーがVCに参加したとき、指定チャンネルへ**カスタム可能な招待メッセージを自動投稿**する機能。[member-log](src/bot/features/member-log/) の流儀（本文可変・embed 固定・DB 保存・変数差し込み）に揃える想定。

- [ ] 仕様書作成: `docs/specs/VC_JOIN_INVITE_SPEC.md`（トリガー条件 / 対象VC / 投稿先チャンネル / メッセージテンプレ＆変数 / 有効・無効 / 重複・スパム抑止 / 除外条件 を確定）
- [ ] 実装（`GuildXxxSettings` + 設定コマンド + `voiceStateUpdate` ハンドラ + 変数差し込み + 投稿）
- [ ] テスト（トリガー判定 / 変数差し込み整形 / 抑止・除外 / 投稿先未設定）

**アイデア / オープン項目:**

- **カスタム可能要素**: メッセージ本文（変数差し込み: `{{user}}` / `{{vc}}` / `{{inviteUrl}}` 等）、投稿先チャンネル、有効/無効、対象VC（全VC or 指定VC・カテゴリ）
- **招待導線**: 「🎤 VCに参加」リンクボタン（VC へジャンプ）か Discord 招待リンク生成か（VC募集の参加ボタンを流用できるか検討）
- **重複・スパム抑止**: 同一ユーザーの短時間再参加クールダウン / 人数閾値（例: 1人目入室時のみ投稿）/ 既に人がいる場合の扱い
- **除外**: Bot 自身、AFK チャンネル、VAC・VC募集のトリガーVC / 新規作成VC
- member-log 既存実装（本文可変・embed 固定・DB 保存・変数差し込み）を踏襲できるか確認

### 11. Fastify API 実装

web フロントエンドがモック駆動（MSW 等）で完成した後、契約通りに実装する。契約は `@ayasono/shared/api/types` で web 側と共有済み（型エラーが出ない = 契約準拠）。

- [ ] `src/api/server.ts` + `src/api/routes/` 追加（Bot と同一プロセス内で起動）
- [ ] 認証層（`@ayasono/shared/api/middlewares/authenticate` + `requireGuildAccess`）を組み込み
- [ ] 機能別エンドポイント（ギルド設定 / AFK / Bump / VAC / メンバーログ / VC 募集 / チケット / リアクションロール / メッセージ固定）を契約通りに実装
- [ ] Coolify で API ポート公開（`api.saika.sonozaki.net` の Cloudflare Public Hostname 追加）
- [ ] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) 更新

### 12. Bot 一般公開準備

- [x] ライセンスを MIT → AGPL-3.0 に変更
- [ ] `/about` コマンド（公式 URL + バージョン）
- [ ] help コマンドにダッシュボード URL リンク追加
- [ ] Discord Bot 認証申請（75 サーバー到達後）

---

## 機能拡張アイデア

- **予約募集(イベント募集)機能** — 他タスク完了後に実装可否判断。骨子: 予約時に VC + Discord Scheduled Event 作成 / RSVP・リマインダー・開始通知は Discord 標準任せ / VC 自動削除なし(投稿削除 or イベント終了ボタンで手動)/ 編集機能あり(日時・タイトル・説明)/ setup は既存 VC 募集と同構成 / VC 名変更は既存 `/vc rename` 流用。細部は実装決定時に詰める
- 自動翻訳機能(DeepL API 等)
- 投票システム(グラフ化・レポート集計で Discord 標準との差別化)
- メトリクス収集 / アラート設定(運用規模拡大時)

---

## 完了済み

> 詳細な作業経過は git log を参照。

### VC 操作コマンド拡張 & ephemeral/public 監査（§7・2026-05-30 完了・本番デプロイ済み）

VC 切断/移動コマンドの追加と、VC 操作系の出力可視性の全面整理。`/vc disconnect`・`/vc move`（個別 + VC 全員の一括、`target-member`/`target-channel` 方式）と `/afk` の target 拡張（VC 全員一括）を追加。共通の `formatActionLog` / 一括確認ダイアログ（60s）を `src/bot/shared/` に新設し、一括は「参加者全員」+ 対象メンバーのメンション一覧で表示。

- [x] 仕様確定: VC_COMMAND_SPEC / AFK_SPEC のオープン項目（target 型=案A / カラー=blurple / TO=60s / 配置=src/bot/shared/）
- [x] [IMPLEMENTATION_GUIDELINES.md](docs/guides/IMPLEMENTATION_GUIDELINES.md) に「コマンド設計原則（ephemeral/public）」を追加し全コマンド分類
- [x] 実装（`/vc disconnect`・`/vc move` 個別+一括 / `/afk` target 拡張 + public 化 / `formatActionLog` + 一括確認ダイアログ）
- [x] テスト（個別/一括・確認/キャンセル/タイムアウト・部分失敗・空VC no-op・target 競合 / formatActionLog）
- [x] `/vc rename`・`/vc limit` を public 化し、成功メッセージに対象VCを表示
- [x] 操作パネル（vc-panel）撤廃（全機能を `/vc`・`/afk` に一本化、VAC・VC募集の自動パネル送信を廃止）

### Postgres 移行（§6・2026-05-30 完了・本番デプロイ済み）

SQLite → PostgreSQL のデータ層移行。コード・スキーマ・ローカル検証に加え、**本番切替まで完了**。

- [x] `schema.prisma` の provider 切替（sqlite → postgresql）+ 接続を `@prisma/adapter-pg` に変更（Prisma 7 は直接接続に driver adapter 必須）
- [x] テーブル名 `@@map` を `guild_*_configs` → `guild_*_settings` にリネーム
- [x] JSON 文字列カラム 8 件を jsonb 化 + アプリ側の `JSON.parse`/`stringify`/`parseJsonArray` を全廃
- [x] migration を PostgreSQL 用に再生成 + ローカル Docker Postgres で検証
- [x] Docker / Compose / `docker-entrypoint.sh` / `.env.example` を PostgreSQL 構成に変更
- [x] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) / [DEPLOYMENT.md](docs/guides/DEPLOYMENT.md) / [DEV_TIPS.md](docs/guides/DEV_TIPS.md) 更新
- [x] **本番切替**: infra で Coolify マネージド PostgreSQL 17 + R2 バックアップ構築 → `/guild-settings export` → `DATABASE_URL` 切替 → release deploy → `/guild-settings import` → 検証OK。ホットフィックス2件対応済み（import の upsert 化 / reaction-role の messageId 解決）。旧 sqlite ボリュームは温存中（数週間後に削除予定）

### ディレクトリ再編 + 命名整理（§5・2026-05-29 完了）

`src/{bot,api,features,shared}/` 標準構成へ再編し、命名を `-settings` に統一。

- [x] `-config` → `-settings` リネーム（全 8 コマンド・変数・ファイル・DB **モデル名**・export 形式の `config`→`settings` フィールド・ドキュメント・仕様書 `GUILD_SETTINGS_SPEC.md`）。DB **テーブル名**（`@@map` の `guild_*_configs`）は migration 回避のため据え置き、§6 でリネーム。`vc-recruit`→`instant-recruit` は実態が VC 中心のため見送り（VC募集名を維持）
- [x] エントリポイント移動: `src/bot/main.ts` → `src/main.ts`
- [x] `src/bot/features/<f>/` と `src/shared/features/<f>/` を `src/features/<f>/` に統合（記述的ファイル名を維持。設定リポジトリも各 `src/features/<f>/<f>SettingsRepository.ts` に分散）
- [x] `src/shared/scheduler/` は saika 固有として `src/shared/` に維持、`src/shared/database/types/` も維持
- [x] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) / [IMPLEMENTATION_GUIDELINES.md](docs/guides/IMPLEMENTATION_GUIDELINES.md) を新構造で更新

### shared への外出し（§4・2026-05-29 完了・本番デプロイ済み）

「他 bot でもそのまま流用できる汎用コードのみ外出し」方針で、汎用3点（`createLogger` / `DiscordWebhookTransport` / `errors` の `BaseError` 階層）を `@ayasono/shared` に移行。`locale/*` / `utils/prisma.ts` / `errors/errorUtils.ts`・`processErrorHandler.ts` は saika 固有結合が強く残置。配布は git タグ + コミット済み dist（`shared` v0.2.3。pnpm 11.4 の HTTP tarball integrity 問題を回避するため、tarball/CI 方式から最終的にこれに確定）。

- [x] `logger.ts` を `createLogger` の薄い wiring に置換（call site 無変更）、`discordWebhookTransport.ts` 削除
- [x] `customErrors.ts` 削除 + `BaseError` 階層の import 約73箇所を `@ayasono/shared/core` に全置換
- [x] shared に vitest 基盤 + core 3点テスト整備、配布を git タグ + コミット済み dist 化（`shared` v0.2.3）
- [x] docker build/run で本番同等起動を検証 → release PR #11/#12 で main 反映 → Coolify デプロイ成功

> NOTE: webhook transport・customErrors の単体テストは shared 側（`shared/tests/core/`）に移設済み。saika 側の重複テストは削除済み。

### guild-config export/import 完全対応化（2026-05-27 完了）

Postgres 移行前のデータ保全前提。stateful モデル(`GuildTicketConfig` / open 状態の `Ticket` / `StickyMessage` / `GuildReactionRolePanel` / `GuildVacConfig.createdChannels`)を export に追加。import は「設定系=export 上書き」「stateful=現 DB 優先+欠落分のみ insert、削除はしない」の簡素化マージ方式。同一ギルド内バックアップ・DB 移行専用。`version: 1` 付与。

- [x] 仕様書更新: [GUILD_SETTINGS_SPEC.md](docs/specs/GUILD_SETTINGS_SPEC.md)
- [x] 実装

### VC 募集 UX 改善（2026-04-18 完了）

- [x] 募集者を VC に移動する機能の削除
- [x] 入室中 VC の default 選択 + AFK チャンネル除外（VAC トリガー除外と同じ仕組み）
- [x] [VC_RECRUIT_SPEC.md](docs/specs/VC_RECRUIT_SPEC.md) 更新

### リアクションロール ボタン色 UI 改善（2026-04-18 完了）

- [x] モーダルのテキスト入力 → 色選択 StringSelectMenu（Blue / Gray / Green / Red、英語固定・i18n 対象外）
- [x] setup / add-button / edit-button の 3 フロー対応
- [x] DB 保存値を lowercase（primary/secondary/success/danger）で統一
- [x] ロール階層バリデーション追加（Bot 最上位以上 or 実行者最上位以上のロールを setup 時に拒否。オーナーは実行者階層チェック免除）
- [x] [REACTION_ROLE_SPEC.md](docs/specs/REACTION_ROLE_SPEC.md) 更新

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
