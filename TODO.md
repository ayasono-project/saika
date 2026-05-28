# saika - TODO

> タスク管理・進捗状況・残件リスト

最終更新: 2026年5月27日

---

## 残タスク サマリー

| # | セクション | 概要 | 残件 |
| --- | --- | --- | ---: |
| 4 | shared への外出し | 汎用インフラ（logger / webhook transport / errors）を `@ayasono/shared` v0.2.0 に移行 | 1 |
| 5 | Postgres 移行 | SQLite → PostgreSQL + 2 件のリネーム合体 | 6 |
| 6 | ディレクトリ再編 | `src/{bot,api,features,shared}/` 構造に整理 | 5 |
| 7 | `/vc disconnect` 実装 & ephemeral 監査 | 個別/一括切断・一括移動 + 既存コマンドの ephemeral/public 見直し | 4 |
| 8 | 自動キック機能(非アクティブメンバー整理) | 指定期間テキスト/VC 未活動メンバーの自動キック + 事前通知 | 3 |
| 9 | 未承認ユーザー自動キック | 認証ロール未取得ユーザーの自動キック + 警告 DM | 3 |
| 10 | Fastify API 実装 | web フロントエンド完成後、契約通りに実装 | 5 |
| 11 | Bot 一般公開準備 | コマンド追加・認証申請 | 3 |
| **合計** | | | **30** |

> web ダッシュボード側の作業は別リポジトリ(ローカル開発中)、インフラ側(VPS / Cloudflare / Coolify 本体)の作業は別リポジトリ(プライベート)で管理。
> 作業順序は上から順に進める前提。セクション 10 以降は web 側の進行状況と依存関係あり:
> - セクション 10(Fastify API 実装)着手前に web フロントエンドがモック駆動で完成していること

---

## タスク一覧

### 4. shared への外出し

**「他 bot でもそのまま流用できる汎用コードのみ外出し」方針**で、汎用3点だけを `@ayasono/shared`（GitHub Release の prebuilt tarball 配布）に移行する。shared パッケージ自体のセットアップは別リポジトリ管理。

**外出し対象（汎用3点）**: `createLogger`（winston ロガー factory）/ `DiscordWebhookTransport`（appName/title を注入で汎用化）/ `errors` の `BaseError` 階層。

**saika に残すもの（saika 固有が濃い）**: `locale/*`（saika 名前空間・`AllParseKeys` 型に密結合）/ `utils/prisma.ts`（i18n キー依存の極小グルー）/ `errors/errorUtils.ts`・`errors/processErrorHandler.ts`（ログ文言が saika ローカライズ済み）。

- [x] `package.json` に `@ayasono/shared`(GitHub Release tarball URL `v0.2.1`)を追加 + 開発用 `pnpm-workspace.yaml` overrides（`link:../shared`）
- [x] `src/shared/utils/logger.ts` を `@ayasono/shared/core` の `createLogger` を env で wiring する薄い層に置換（call site は無変更）
- [x] `src/shared/utils/discordWebhookTransport.ts` を削除（shared に移設）
- [x] `src/shared/errors/customErrors.ts` を削除し、`BaseError` 階層の import（約73箇所）を `@ayasono/shared/core` に全置換
- [x] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) の該当箇所を `@ayasono/shared/core` 経由に更新
- [x] shared を v0.2.1 タグ発行 → CI が prebuilt tarball を Release 添付 → saika 依存を tarball URL に切替（dev override は外す）→ docker build/run で本番同等起動を検証
- [ ] **デプロイ**: refactor → develop → main（release PR）→ Coolify 自動デプロイ → 本番起動ログ確認

> NOTE: webhook transport の単体テストは暫定的に saika 側（`tests/unit/shared/utils/discordWebhookTransport.test.ts`）に残置。shared にテスト基盤を整えたら shared 側へ移す。

### 5. Postgres 移行

SQLite → PostgreSQL + `-config → -settings` + `vc-recruit → instant-recruit` の合体。インフラ側で別途 Postgres 導入作業あり(別管理)。schema は Bot 内部要件で確定する(web 契約待ちはしない)。

- [ ] `schema.prisma` の provider 切替(sqlite → postgresql)
- [ ] JSON 文字列カラムを jsonb 化(7 箇所)+ アプリ側の `JSON.parse/stringify` 除去
- [ ] `-config` → `-settings` リネーム(コマンド・ファイル・変数・DB テーブル・ドキュメント)
- [ ] `vc-recruit` → `instant-recruit` リネーム(+ 仕様書ファイル名を `INSTANT_RECRUIT_SPEC.md` に)
- [ ] migration 再生成、ローカル検証、本番切替(export → import)
- [ ] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) / [DEPLOYMENT.md](docs/guides/DEPLOYMENT.md) 更新

### 6. ディレクトリ再編

Bot リポジトリ標準の内部構成(`src/{bot,api,features,shared}/`)に揃える。Postgres 移行で `parseJsonArray` 等が消えた状態で着手するため、移動対象が最小化される前提。**Postgres 移行完了後に着手**。

- [ ] エントリポイント移動: `src/bot/main.ts` → `src/main.ts`
- [ ] `src/bot/features/<f>/` と `src/shared/features/<f>/` を `src/features/<f>/` に統合(Discord 依存部分の残し方は feature ごとに判断)
- [ ] `src/shared/database/repositories/` の Repository を `src/features/<f>/repository.ts` に分散
- [ ] `src/shared/scheduler/` は saika 固有として `src/shared/` に維持(hibiki 着手時に shared 共通化を再検討)
- [ ] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) の「部分的に旧前提」ブロック削除 + 新構造で全面書き直し

### 7. `/vc disconnect` 実装 & ephemeral / public 監査

VC 完全切断/移動コマンドの追加と、既存コマンドの ephemeral / public 設定の全面見直し。詳細仕様は [VC_COMMAND_SPEC.md](docs/specs/VC_COMMAND_SPEC.md) (`/vc disconnect` / `/vc move` + 共通ユーティリティ)および [AFK_SPEC.md](docs/specs/AFK_SPEC.md) (target 拡張 + public 化) を参照。

**確定事項(2026-05-18 議論):**
- 出力フォーマット: **Embed で統一**(本セクション + セクション 9 の両方)
- 一括 target 拡張: **`/vc disconnect` / `/vc move` / `/afk` の 3 コマンドすべて** `target:<member|channel>` に対応
- 誤爆防止 UI: **`target` が channel の時のみボタン確認ダイアログ**(member 時は即実行)
- `/afk` の `target=channel`: 当該 channel 内全員を **サーバー設定の AFK チャンネルに移動**
- 仕様書構成: VC_COMMAND_SPEC.md に `/vc disconnect` / `/vc move` + 共通ユーティリティを統合、AFK_SPEC.md は target 拡張を差分追記(2026-05-28 確定 — たたき台あり)
- ephemeral 判定原則は仕様書ではなく `docs/guides/IMPLEMENTATION_GUIDELINES.md` の「コマンド設計原則(ephemeral / public)」(新セクション)に記述。実装細則扱いとし、ARCHITECTURE.md のスコープ外
- 内部権限チェックなし・Saika 内部監査ログチャンネルは初期実装に含めない
- 出力可視性は public(非 ephemeral)で統一
- 事前合意済みの ephemeral → public 移行対象: `/afk` / `/vc rename` / `/vc limit`(各 spec に注記)

検討中(仕様書で確定):
- `target` の型表現(User|Channel 表現方式 3 案 — VC_COMMAND_SPEC.md オープン項目)
- 共通ユーティリティ `formatActionLog` の Embed テンプレート文言・カラー
- 一括時の確認ダイアログ文言・タイムアウト秒数
- リリースノート文言(既存ユーザー向け挙動変更の周知)
- `formatActionLog` の配置場所(`src/shared/` / `src/features/vc-command/`)

- [ ] 仕様書(たたき台 → 確定): [VC_COMMAND_SPEC.md](docs/specs/VC_COMMAND_SPEC.md) / [AFK_SPEC.md](docs/specs/AFK_SPEC.md) のオープン項目を埋める
- [ ] [IMPLEMENTATION_GUIDELINES.md](docs/guides/IMPLEMENTATION_GUIDELINES.md) に「コマンド設計原則(ephemeral / public)」セクション追加 + 全スラッシュコマンドの一次分類 → レビュー → 確定
- [ ] 実装(`/vc disconnect` 個別+一括 / `/vc move` 個別+一括 / `/afk` target 拡張 / 既存コマンドの ephemeral 修正 / Embed 共通ユーティリティ)
- [ ] テスト(権限・ロール階層エラー / 一括系のキャンセル動作 / target=channel の対象抽出 / `/afk` の AFK チャンネル未設定エラー)

### 8. 自動キック機能(非アクティブメンバー整理)

指定期間テキスト/VC で活動がないメンバーを自動キックする機能。[member-log](src/bot/features/member-log/) の流儀(本文可変・embed 固定・コマンドで DB に保存・変数差し込み)に揃える。Postgres 移行とディレクトリ再編完了後に着手することで、新ディレクトリ構造(`src/features/<f>/`)で最初から実装できる。

検討中(仕様書で確定):
- 非アクティブ判定の対象(投稿 / VC接続 / リアクション の組み合わせ)と期間
- 事前通知の段階構成(DM / メンション併用)とタイミング・本文テンプレート
- 除外条件(特定ロール / 新規メンバー猶予期間)
- dry-run モード(候補リスト出力のみ)の有無
- 通知文の変数差し込み(`{userMention}` / `{kickAt}` / `{lastActiveAt}` 等)

- [ ] 仕様書作成: `docs/specs/INACTIVE_KICK_SPEC.md`(新規)
- [ ] 実装(DB スキーマ + コマンド + アクティビティ記録 + スケジューラ + 事前通知 + キック実行)
- [ ] テスト(候補抽出ロジック / 通知文整形 / dry-run スケジューラ通し)

### 9. 未承認ユーザー自動キック

参加から指定期間内に認証ロールを取得していないユーザーを自動キックする機能。Ikoitter で手動運用中のフローを自動化しつつ、公開 Bot 向けに汎用設計する。Postgres 移行とディレクトリ再編完了後に着手。詳細仕様は Notion: [Saika: 未承認ユーザー自動キック 実装 引き継ぎ](https://www.notion.so/3638e698a89281eb967ec072a47751e3) を参照。

**確定事項(2026-05-18 議論):**
- cron 実行頻度: **1日1回**(JST 03:00 想定)。警告 DM の 24h ウィンドウで重複防止し、進行中タイマーの永続化テーブルは持たない(Notion §1.8 / §2.3)
- `graceDays` バリデーション範囲: **min=1, max=30**
- ログ出力フォーマット: **Embed**(セクション 7 と統一)
- 起算点: `member.joinedAt`(Notion §2.4)
- 判定条件は単一: `joinedAt < now - graceDays && !hasRole(verifiedRoleId) && !bot && !hasAny(exemptRoleIds)`(Notion §1.3)
- バリデーション失敗時は `enabled=false` 自動セット + ログ通知(Notion §1.6)

検討中(仕様書で確定):
- 警告 DM のデフォルト文言テンプレートと変数差し込み(`{guildName}` / `{remainingDays}` 等)
- `/autokick preview` の表示件数上限・ページング
- 警告 DM 文言にプロフィールチャンネルリンクを含めるか(per-guild 設定 or 運用者直書き)

- [ ] 仕様書作成: `docs/specs/UNVERIFIED_KICK_SPEC.md`(新規)
- [ ] 実装(`AutoKickConfig` スキーマ + `/autokick` コマンド群 + 日次 cron + 警告 DM + バリデーション + Embed ログ出力)
- [ ] テスト(判定ロジック / バリデーション失敗時の自動 disable / `/autokick preview` 整形 / 警告 DM 24h ウィンドウ)

### 10. Fastify API 実装

web フロントエンドがモック駆動(MSW 等)で完成した後、契約通りに Fastify API を実装する。契約は `@ayasono/shared/api/types` で web 側と共有済みのため、型エラーが出ない = 契約準拠の状態になる。

- [ ] `src/api/server.ts` + `src/api/routes/` 追加(Bot と同一プロセス内で起動)
- [ ] 認証層(`@ayasono/shared/api/middlewares/authenticate` + `requireGuildAccess`)を組み込み
- [ ] 機能別エンドポイント(ギルド設定 / AFK / Bump リマインダー / VAC / メンバーログ / VC 募集 / チケット / リアクションロール / メッセージ固定)を契約通りに実装
- [ ] Coolify で API ポート公開設定(`api.saika.sonozaki.net` の Cloudflare Public Hostname 追加)
- [ ] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) 更新

### 11. Bot 一般公開準備

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

### guild-config export/import 完全対応化（2026-05-27 完了）

Postgres 移行前のデータ保全前提。stateful モデル(`GuildTicketConfig` / open 状態の `Ticket` / `StickyMessage` / `GuildReactionRolePanel` / `GuildVacConfig.createdChannels`)を export に追加。import は「設定系=export 上書き」「stateful=現 DB 優先+欠落分のみ insert、削除はしない」の簡素化マージ方式。同一ギルド内バックアップ・DB 移行専用。`version: 1` 付与。

- [x] 仕様書更新: [GUILD_CONFIG_SPEC.md](docs/specs/GUILD_CONFIG_SPEC.md)
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

