# saika - TODO

> タスク管理・進捗状況・残件リスト

最終更新: 2026年6月4日

---

## 残タスク サマリー

| # | セクション | 概要 | 残件 |
| --- | --- | --- | ---: |
| 3 | メッセージ削除機能の改善 | 退出済みメンバーのメッセージ一括削除（ユーザー指定の拡張） | 3 |
| 10 | Fastify API 実装 | web 完成後に契約通り実装 | 5 |
| 11 | Bot 一般公開準備 | コマンド追加・認証申請 | 3 |
| **合計** | | | **11** |

> web ダッシュボード・インフラ（VPS / Cloudflare / Coolify）は別リポジトリで管理。
> 作業順序は上から順（§1 → §2 → §3 → …）。§10 以降（Fastify API / Bot 一般公開準備）は web 側の進行に依存するため番号を分けている（§10 着手前に web がモック駆動で完成していること）。

---

## タスク一覧

### 3. メッセージ削除機能の改善（退出済みメンバーのメッセージ一括削除）

現状の [message-delete](src/features/message-delete/) はユーザー指定が UserSelectMenu（現在のメンバーのみ選択可）ベースで、スキャンも `author.id` 一致チェックのみ（[messageDeleteService.ts](src/features/message-delete/services/messageDeleteService.ts)）。**サーバーを退出済みのメンバーのメッセージを対象にできない**ため、その一括削除に対応する。

- [ ] 仕様書更新: [MESSAGE_DELETE_SPEC.md](docs/specs/MESSAGE_DELETE_SPEC.md)（退出済みメンバー対応の方式確定 / 既存ユーザー指定との UI 整合 / プレビューでの投稿者フィルタ表示）
- [ ] 実装（下記アイデアから方式決定 → スキャンフィルタ拡張 + 条件設定 UI 追加）
- [ ] テスト（退出済み投稿者の抽出 / 在籍メンバー混在時のフィルタ / Webhook との両立 / 空ヒット時の挙動）

**アイデア / オープン項目:**

- **方式A: ユーザーID直接入力** — モーダルで任意のユーザーIDを入力可能にし、退出済みでも ID が分かれば対象指定できるようにする（汎用的・実装が軽い）
- **方式B: 「退出済みメンバーのみ」フィルタ** — スキャン時に各 `author.id` を `guild.members` と照合し、在籍していない投稿者だけを対象にする。プレビューの投稿者フィルタ UI に「退出済み」グループを出す（運用ニーズに直結）
- 方式 A / B は排他ではなく併用も検討（A=ピンポイント、B=一括）。実装決定時に詰める
- bot のみフィルタ等、他の投稿者軸フィルタの需要も併せて検討

### 10. Fastify API 実装

web フロントエンドがモック駆動（MSW 等）で完成した後、契約通りに実装する。契約は `@ayasono/shared/api/types` で web 側と共有済み（型エラーが出ない = 契約準拠）。

- [ ] `src/api/server.ts` + `src/api/routes/` 追加（Bot と同一プロセス内で起動）
- [ ] 認証層（`@ayasono/shared/api/middlewares/authenticate` + `requireGuildAccess`）を組み込み
- [ ] 機能別エンドポイント（ギルド設定 / AFK / Bump / VAC / メンバーログ / VC 募集 / チケット / リアクションロール / メッセージ固定）を契約通りに実装
- [ ] Coolify で API ポート公開（`api.saika.sonozaki.net` の Cloudflare Public Hostname 追加）
- [ ] [ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) 更新

### 11. Bot 一般公開準備

- [x] ライセンスを MIT → AGPL-3.0 に変更
- [ ] `/about` コマンド（公式 URL + バージョン）
- [ ] help コマンドにダッシュボード URL リンク追加
- [ ] Discord Bot 認証申請（75 サーバー到達後）

---

## 機能拡張アイデア

- **VC自動募集のユーザー個別 opt-out（§2 拡張）** — 1人で通話/作業するユーザーが「最初の1人」として毎回告知されるのを避ける用。推奨方針=`GuildVcAutoRecruitSettings` 内に `optedOutUserIds: String[]`（jsonb）を追加し本人トグルコマンドで管理（発火条件に「参加者が `optedOutUserIds` に含まれない」を追加）。v1 見送り理由は [VC_AUTO_RECRUIT_SPEC.md](docs/specs/VC_AUTO_RECRUIT_SPEC.md) 「今後の拡張」節を参照
- **VC自動募集の VC（チャンネル）単位指定・除外（§2 拡張）** — カテゴリ単位の allowlist（`enable-category`/`disable-category`）は実装済み。さらに細かい特定VC単位の指定／除外が必要になれば検討
- **VC自動募集の招待リンク方式（§2 拡張）** — 参加ボタンをチャンネルジャンプ URL から Discord 招待リンク（`createInvite`）に変更（外部共有が必要になった場合・`CreateInstantInvite` 権限と寿命管理が必要）
- **予約募集(イベント募集)機能** — 他タスク完了後に実装可否判断。骨子: 予約時に VC + Discord Scheduled Event 作成 / RSVP・リマインダー・開始通知は Discord 標準任せ / VC 自動削除なし(投稿削除 or イベント終了ボタンで手動)/ 編集機能あり(日時・タイトル・説明)/ setup は既存 VC 募集と同構成 / VC 名変更は既存 `/vc rename` 流用。細部は実装決定時に詰める
- 自動翻訳機能(DeepL API 等)
- 投票システム(グラフ化・レポート集計で Discord 標準との差別化)
- メトリクス収集 / アラート設定(運用規模拡大時)

---

## 完了済み

> 詳細な作業経過は git log を参照。

### VC自動募集（§2・2026-06-04 完了・本番デプロイ済み）

VC が **0人→1人（最初の1人）** になった時、指定チャンネルへ募集メッセージ（カスタム本文＋固定 Embed＋「🔊 VCに参加」Link ボタン）を自動投稿。VC から全員退出すると投稿済みメッセージのボタンを無効の「募集終了」へ差し替え（募集終了は `enabled` 非依存・空室時のみ・開始者の在室は不問）。CreateVC トリガー・AFK・Bot 参加は除外し、VAC 作成 VC は対象。募集文は content として送信し `allowedMentions` でメンションを実ピング。設計・実装は member-log/VAC 流儀（本文可変・Embed 固定・DB 保存・jsonb 配列・起動クリーンアップ）に準拠。

- [x] 仕様書作成: [VC_AUTO_RECRUIT_SPEC.md](docs/specs/VC_AUTO_RECRUIT_SPEC.md)（投稿先=固定通知チャンネル / 0→1 のみ / カスタム本文 + Embed + ボタン / 全員退出で募集終了 / 60s 連投抑制 / opt-out は将来拡張）
- [x] 実装（DB `GuildVcAutoRecruitSettings`〔`activeInvites` jsonb〕 + migration + リポジトリ/設定サービス + イベントサービス `VcAutoRecruitService`〔投稿・募集終了・channelDelete・起動クリーンアップ〕 + `/vc-auto-recruit-settings` コマンド群 + set-message モーダル + content/Embed/ボタンビルダー + `voiceStateUpdate`/`channelDelete`/clientReady 配線 + composition root + help 追加）
- [x] **本番リリース**: release PR #44（develop→main・2026-06-04）。命名は当初 `vc-invite`→ ユーザー指示で **VC自動募集 / `/vc-auto-recruit-settings`** に全面リネーム
- [x] **カテゴリ allowlist 追加（§2 拡張・後追い）**: 募集は**明示的に有効化したカテゴリの VC でのみ**投稿（`enabledCategoryIds` jsonb・ルート直下は sentinel `"TOP"`）。`enable-category`/`disable-category` 追加、空＝投稿なし、`@everyone` 可視性は判定に使わず認証制サーバーのメンバー専用 VC も有効カテゴリなら投稿、カテゴリ削除で allowlist 自動掃除。全 2418 通過

> NOTE: 起動クリーンアップ・closeInvite の Discord 副作用経路はロジック実装済み（ユニットでは主要分岐を担保）。カテゴリ allowlist 拡張は別 release PR で本番反映予定。

### 未承認ユーザー自動キック（§1・2026-05-31 完了・未デプロイ）

参加から猶予日数（`graceDays` 1〜30）内に認証ロール未取得のメンバーを、事前警告（本人へ DM + 任意で通知チャンネルへキック予告）を経て日次で自動キック。判定は単一条件（`joinedAt` 起算・認証ロール未取得・Bot/管理者/オーナー/除外ロール以外）で per-member 状態テーブルを持たないステートレス設計。`enabledAt` 起算下限で有効化直後の無警告一斉キックを防止。Notion 引き継ぎを一次情報源に、コマンド構成は inactive-kick（§8）に、本文可変・Embed 固定は member-log 流儀に揃えて実装。

- [x] 仕様書作成: [UNVERIFIED_KICK_SPEC.md](docs/specs/UNVERIFIED_KICK_SPEC.md)（`/unverified-kick-settings` / DM + 通知/ログ 2チャンネル分離 / 対象ロール〔通知直前付与・認証時 `guildMemberUpdate` 剥奪〕 / `enabledAt` 起算下限 / dry-run=`TEST_MODE`）
- [x] 実装（DB `GuildUnverifiedKickSettings` + リポジトリ/サービス + `/unverified-kick-settings` コマンド群〔19 サブコマンド + exempt グループ + preview〕 + 日次チェック `addJob`〔03:00 JST・`noOverlap`・`UNVERIFIED_KICK_CRON` 上書き〕 + 警告 DM + 通知/ログ Embed〔キック予告本文も本文可変・Embed 固定でカスタム可〕 + 対象ロール付与/剥奪 + `guildMemberUpdate` ハンドラ + guildDelete 一括削除）
- [x] テスト（eligibility/candidates/notifier/runner/設定サービス/コマンド定義・全 2377 通過）

> NOTE: 警告 DM 送信・通知投稿・対象ロールの通知直前付与順序・`guildMemberUpdate` 認証時剥奪はロジック実装済みだがユニットテスト未整備（Discord 副作用のため・判定ロジックは別途担保）。**未デプロイ**: 実機検証（`pnpm start` 起動 + 動作確認）と release PR（develop→main）は未実施。

### 自動キック機能（非アクティブメンバー整理）（§8・2026-05-31 完了）

一定期間テキスト/VC/リアクションで活動がないメンバーを、段階通知（1週間前・3日前）を経て日次で自動キック。誤キック防止の安全策（警告ゲート `warnStage==2` 必須・`enabledAt` 起算下限・送信成功後に warnStage 前進・除外時の猶予クリア・dry-run `TEST_MODE`）を中核に据えた。member-log の流儀（本文可変・embed 固定・DB 保存・単一波括弧）に準拠。

- [x] 仕様書作成: [INACTIVE_KICK_SPEC.md](docs/specs/INACTIVE_KICK_SPEC.md)（活動=テキスト+VC+リアクション / 段階通知 / 除外=Bot・Administrator・whitelist・オーナー・VC接続中 / dry-run=`TEST_MODE` / 対象ロール自動付与。デフォルトしきい値 30 日）
- [x] 実装（DB `GuildInactiveKickSettings`/`MemberActivity` + リポジトリ/サービス + アクティビティ記録ハンドラ〔throttle 1h〕 + `/inactive-kick-settings` コマンド群〔13 サブコマンド + whitelist グループ + preview〕 + 日次チェック `addJob`〔04:00 JST・`noOverlap`〕 + 段階通知/キック実行 + `GuildMessageReactions` Intent / Partials 追加）
- [x] テスト（eligibility/candidates/notifier/runner/設定サービス/コマンド定義・全 2310 通過）
- [x] 実機検証 + UX 追補（develop 反映済み）: 事前通知を **1週間前/最終警告で別メッセージ**化、通知の**カスタム文を本文(content)・embed は固定**化（`{markerRole}` は本文に含めたときだけメンション）、**キック通知はデフォルト文なし**（未設定なら本文なし）、`view` で実際の本文を表示、preview の色を info、`whitelist remove` を**セレクト複数選択**化、検証用に **`INACTIVE_KICK_CRON`** env 上書きを追加

> NOTE: 対象ロールの階層不足スキップ・guildDelete の新テーブル一括削除はロジック実装済みだがユニットテスト未整備（spec テストケース参照）。**本番リリースは本コミットの release PR（develop→main）で実施**。

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

> 上記より前（guild-config export/import 完全対応化 §-・VC 募集 UX 改善・リアクションロール ボタン色 UI 改善・Coolify 移行 ほか）は git log を参照。
