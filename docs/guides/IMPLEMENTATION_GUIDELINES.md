# 実装ガイドライン

> Implementation Guidelines - 実装方針とコーディング規約

最終更新: 2026年3月16日

---

## 概要

このドキュメントは、saika における実装時の設計方針、責務分離ルール、コメント規約を定義します。
全体設計は [ARCHITECTURE.md](ARCHITECTURE.md) を参照。

---

## 実装方針

### 基本方針

- `commands` はコマンド定義と入口処理に限定し、業務ロジックは `features` に、共通ロジックは `shared` に配置する
- `any` の導入は避け、`pnpm typecheck` を必ず通す
- 生文字列のハードコードを **禁止** する（ユーザー向け応答・ログメッセージともに i18n 経由）
- マジックナンバーの直接使用を **禁止** する（名前付き定数を定義）

### レイヤ構成ルール

#### `src/bot/commands`

- 許可: SlashCommandBuilder 定義、options 受け取り、feature 層への委譲
- 禁止: DB更新、複雑な分岐ロジック、コンポーネント collector 制御

#### `src/bot/features`

- ユースケース実装、ルール判定、状態更新、UI操作を配置する
- 推奨構成: `commands/` / `handlers/` / `handlers/ui/` / `services/` / `repositories/` / `constants/`

#### `src/bot/shared`

- Bot 層内の複数機能で共用するユーティリティを配置する
- 例: `i18nKeys.ts`、`permissionGuards.ts`、`disableComponentsAfterTimeout.ts`
- feature 固有のロジックは置かない

#### `src/shared`

- Bot/Web 両方で再利用する実装のみ配置し、`bot` / `web` へ逆依存しない
- **`database/repositories/`**: ギルド設定リポジトリの実装
- **`database/types/`**: エンティティ・リポジトリインターフェースの唯一の定義場所
- **`features/xxx/`**: `xxxConfigService.ts`・`xxxConfigDefaults.ts`
- **`utils/`**: `serviceFactory.ts`・`jsonUtils.ts`・`ttlMap.ts` 等

#### shared/features 経由の DB アクセス

Bot 層のハンドラー・ユースケースが DB へアクセスする際は、原則として `configService` 経由で行う。
リポジトリを直接取得・呼び出すことは **原則禁止** とする。

```
src/bot/features/<feature>/handlers/**
  └─ getBotXxxConfigService()            ← botCompositionRoot
       └─ XxxConfigService               ← src/shared/features/xxx/
            └─ IXxxRepository            ← src/shared/database/types/
                 └─ XxxConfigRepository  ← src/shared/database/repositories/
```

設定データ以外の **機能固有のランタイムデータ**（bump reminder 記録・sticky message 記録等）は
`src/bot/features/xxx/repositories/xxxRepository.ts` に置き、botCompositionRoot でサービスと別途組み合わせる。

**機能追加時の必須手順:**

1. `prisma/schema.prisma` に `GuildXxxConfig` モデルを追加し、マイグレーションを作成する
2. `src/shared/database/types/entities.ts` に `XxxConfig` インターフェースを、`repositories.ts` に `IXxxConfigRepository` を追記する
3. `src/shared/database/repositories/xxxConfigRepository.ts` でスタンドアロンリポジトリを実装し、シングルトンゲッター `getXxxConfigRepository(prisma?)` を追加する
4. `src/shared/features/xxx/xxxConfigDefaults.ts` にデフォルト設定と正規化関数を定義する
5. `src/shared/features/xxx/xxxConfigService.ts` に `XxxConfigService` クラスをエクスポートする
6. `src/bot/services/botCompositionRoot.ts` にアクセサを追加し、初期化・登録する
7. ハンドラーは `getBotXxxConfigService()` 経由のみでサービスを取得する

**例外**: configService が 1:1 委譲ラッパーであり、経由することで不必要な複雑性が増す場合は、リポジトリを直接使用してもよい。ただしコード内コメントで理由を明記すること。

```typescript
// ❌ 禁止
import { getBotXxxRepository } from "@/bot/features/xxx/repositories/xxxRepository";
const repo = getBotXxxRepository();

// ✅ 正しい
import { getBotXxxConfigService } from "@/bot/services/botCompositionRoot";
const service = getBotXxxConfigService();
```

#### feature ディレクトリテンプレート

```text
src/bot/features/<feature-name>/
├── commands/       # *.execute.ts, *.constants.ts 等
├── handlers/
│   └── ui/
├── services/
├── repositories/   # ランタイムデータ（設定以外）のリポジトリ
└── constants/

src/shared/features/<feature-name>/
├── xxxConfigService.ts
└── xxxConfigDefaults.ts
```

#### `index.ts`（バレル）禁止ルール

- `src` 配下では `index.ts` を作成しない（import は実体モジュールを直接参照）
- 入口ファイルは `index.ts` ではなく役割名ファイルを使う（例: `handleInteractionCreate.ts`）
- `src/bot/commands/` と `src/bot/events/` はバレル不要（自動スキャン）
- 参照先を変更した場合は、テストの `vi.mock()` パスも追従する
- **例外**: `src/shared/database/types/index.ts` は `import type` 専用バレルとして唯一許可

### 命名規則

#### ファイル名・ディレクトリ名

| 対象                    | 規則       | 例                                      |
| ----------------------- | ---------- | --------------------------------------- |
| ソースファイル（基本）  | camelCase  | `guildConfig.ts`, `memberLogService.ts` |
| SlashCommand 系ファイル | kebab-case | `afk-config.ts`, `bump-reminder.ts`     |
| ディレクトリ名          | kebab-case | `bump-reminder/`, `member-log/`         |

#### 変数・関数

| 対象     | 規則      | 例                                           |
| -------- | --------- | -------------------------------------------- |
| 変数     | camelCase | `guildId`, `panelChannel`                    |
| 関数     | camelCase | `getGuildConfig()`, `handleButtonInteraction()` |
| 定数     | UPPER_SNAKE_CASE | `INTERACTION_TIMEOUT_MS`, `MAX_ROLE_COUNT` |

#### クラス・インターフェース・型

| 対象             | 規則       | 例                                              |
| ---------------- | ---------- | ----------------------------------------------- |
| クラス           | PascalCase | `BotClient`, `BumpReminderManager`              |
| インターフェース | PascalCase（リポジトリは `I` プレフィックス） | `IGuildCoreRepository`, `IVcRecruitConfigRepository` |
| 型エイリアス     | PascalCase | `MessageStatus`, `BotEvent`                     |

#### コマンド名・イベント名（Discord API 準拠）

| 対象                                 | 規則                          | 例                                          |
| ------------------------------------ | ----------------------------- | ------------------------------------------- |
| スラッシュコマンド・サブコマンド名   | kebab-case（Discord API 制約）| `bump-reminder-config`, `set-mention`        |
| オプション名                         | kebab-case                    | `channel`, `role`                           |
| イベント名                           | `Events` enum を使用          | `Events.GuildMemberAdd`（文字列リテラル禁止）|

#### Custom ID（ボタン・セレクト・モーダル）

フォーマット: `<feature>:<subject>-<qualifier>[:<dynamic-param>]`（コロン区切り、kebab-case）

| セグメント | 必須 | 説明 | 例 |
| --- | --- | --- | --- |
| `<feature>` | ✅ | 機能名（コマンド名と一致） | `guild-config`, `bump-reminder`, `vc-recruit` |
| `<subject>-<qualifier>` | ✅ | 「対象-修飾子」の形式。対象が何で、何をするか/何であるかを表す | `reset-confirm`, `page-next`, `webhook-modal` |
| `<dynamic-param>` | ❌ | 動的パラメータ（チャンネルID等、実行時に決まる値） | `{channelId}`, `{panelChannelId}` |

**subject の命名規則:**

- 名詞を使う: `page`, `reset`, `mention`, `webhook`, `user`, `deletion`
- 形容詞・前置詞を単独で subject にしない: ❌ `final-confirm` → ✅ `deletion-confirm`、❌ `after-filter` → ✅ `after-date-filter`

**qualifier の種類:**

| 種類 | qualifier 例 | 用途 |
| --- | --- | --- |
| アクション | confirm, cancel, start, delete, reset, submit, exclude | ボタン操作 |
| ナビゲーション | first, prev, next, last, jump, back | ページ遷移 |
| UI種別 | modal, select, input | UI要素の識別 |
| 状態 | on, off | トグル |

**ネスト規則（モーダル内の入力フィールド）:**

モーダルの入力フィールドは `<subject>-modal-input` で表す:

```ts
"message-delete:webhook-modal"        // モーダル本体
"message-delete:webhook-modal-input"  // モーダル内の入力フィールド
```

**命名ルール:**

- `<subject>-<qualifier>` は必ず「対象-修飾子」の順序にする（修飾子から始めない）
- 複合語もkebab-caseで統一（`reset-all-confirm`、`after-date-filter`）
- 動的パラメータがない場合は2セグメントで完結する

```ts
// ✅ アクション
"guild-config:reset-confirm"              // リセットの確認ボタン
"guild-config:reset-cancel"               // リセットのキャンセルボタン
"guild-config:reset-all-confirm"          // 全設定リセットの確認ボタン
"guild-config:import-confirm"             // インポートの確認ボタン
"message-delete:deletion-confirm"         // 削除の最終確認ボタン
"message-delete:preview-confirm"          // プレビューの確認ボタン

// ✅ ナビゲーション
"guild-config:page-first"                 // 最初のページへ
"guild-config:page-prev"                  // 前のページへ
"guild-config:page-next"                  // 次のページへ
"guild-config:page-last"                  // 最後のページへ
"guild-config:page-jump"                  // ページジャンプ
"message-delete:deletion-back"            // プレビューに戻る

// ✅ UI種別
"message-delete:webhook-modal"            // Webhook入力モーダル
"message-delete:webhook-modal-input"      // モーダル内の入力フィールド
"guild-config:page-select"               // ページセレクトメニュー
"message-delete:user-select"             // ユーザーセレクトメニュー

// ✅ 状態
"bump-reminder:mention-on:{guildId}"     // メンション通知ON
"bump-reminder:mention-off:{guildId}"    // メンション通知OFF

// ✅ 動的パラメータ付き
"vc-recruit:panel-create:{channelId}"    // パネル作成
"sticky-message:set-modal:{channelId}"   // 設定モーダル

// ❌ 修飾子から始めている
"guild-config:confirm-reset"
"guild-config:cancel-import"

// ❌ subject が形容詞・前置詞のみ
"message-delete:final-confirm"            // → deletion-confirm
"message-delete:after-filter"             // → after-date-filter

// ❌ アンダースコアやcamelCase
"guild_config_reset_confirm"
"vcRecruit:createPanel"
```

- 定数は `src/bot/features/<feature>/constants/*.constants.ts` に集約する

### コメント規約

#### ファイル先頭コメント

ファイル先頭で「何のファイルか」を明記する（必須）。

```ts
// src/bot/features/foo/fooService.ts
// Foo機能の業務ロジックを担当するサービス
```

#### 関数コメント

- 関数宣言・エクスポートされるアロー関数・クラスの public メソッドに JSDoc を記載する（必須）
- 引数がある場合は `@param`、`void` 系以外の戻り値は `@returns` を記載する（必須）
- 説明文だけの JSDoc は不完全とみなす

```ts
// ❌ NG
/** ギルド設定を取得する */
async function getGuildConfig(guildId: string): Promise<GuildConfig | null> { ... }

// ✅ OK
/**
 * ギルド設定を取得する
 * @param guildId 取得対象のギルドID
 * @returns ギルド設定（未設定時は null）
 */
async function getGuildConfig(guildId: string): Promise<GuildConfig | null> { ... }
```

#### 変数・定数コメント

- ローカル変数/定数: 原則不要
- 共用する変数・定数: 何の値かを記載する

#### 処理ブロックコメント

- 分岐・副作用・外部連携の手前に「処理の意図」を1〜2行で記載する（必須）
- 逐語的で自明な説明は禁止

### コーディングルール

#### ステータス通知は Embed ユーティリティで返す

ステータス通知（エラー・警告・情報・成功）は `src/bot/utils/messageResponse.ts` の Embed ユーティリティを使う。
プレーンテキスト返し（`editReply(string)`）を **禁止** する。

| 関数 | 絵文字（固定） | デフォルトタイトル | カラー | 引数 |
| --- | --- | --- | --- | --- |
| `createSuccessEmbed(desc, options?)` | ✅ | 成功 | 緑 | `description` 必須、`options.title` でタイトル上書き可 |
| `createInfoEmbed(desc, options?)` | ℹ️ | 情報 | 青 | 同上 |
| `createWarningEmbed(desc, options?)` | ⚠️ | 警告 | 黄 | 同上 |
| `createErrorEmbed(desc, options?)` | ❌ | エラー | 赤 | 同上 |
| `createStatusEmbed(status, title, desc, options?)` | status依存 | 任意 | status依存 | `status`, `title`, `description` 必須 |

> **注意**: `create*Embed` はタイトルに絵文字を自動プレフィックスするため、description やロケール文字列に絵文字を含めないこと。

##### Embed タイトル命名ルール

`create*Embed` の `options.title` は以下のルールに従う。

- **体言止め** にする（文章にしない）
- description で詳細を説明し、タイトルはカテゴリを示す短い名詞句にする
- 英語のクラス名（`PermissionError` 等）をそのまま表示しない

| タイトル | 用途 |
| --- | --- |
| 権限不足 | ユーザーの権限が不足している場合 |
| Bot権限不足 | Botの権限が不足している場合 |
| 入力エラー | ユーザー入力の形式不正・範囲外 |
| オプション競合 | 同時指定不可のオプションが競合した場合 |
| フィルタ不足 | 必須のフィルタ条件が未指定 |
| チャンネルエラー | チャンネル種別の不一致（非対象チャンネル） |
| チャンネル不在 | 対象チャンネルが見つからない・削除済み |
| VC未参加 | VC参加が必要な操作でVC未参加 |
| 設定不足 | 事前設定が完了していない |
| リソース不在 | 対象リソースが削除済み・見つからない |
| 上限超過 | チャンネル数等の上限に達した場合 |
| タイムアウト | 操作・処理がタイムアウトした場合 |
| 実行中 | 同一処理が既に実行中（ロック） |
| 登録済み | 重複登録を検出した場合 |
| 未設定 | リソースが未設定の状態 |
| サーバー専用 | ギルド外での実行を拒否する場合 |
| 操作エラー | DB操作・API呼び出し等の処理失敗 |
| 収集エラー | メッセージ収集等のスキャン処理失敗 |
| 削除エラー | メッセージ削除等の削除処理失敗 |
| 移動失敗 | ユーザー移動等の操作失敗 |
| ロール上限超過 | ロール登録数の上限に達した場合 |
| 設定エラー | 設定値の不整合・不正 |
| レート制限 | レート制限に到達した場合 |
| エラー | 上記に該当しない汎用フォールバック |

新しい Embed を追加する際は、上記テーブルから該当するタイトルを選択する。
該当するものがない場合はテーブルに追加してから使用する。

カスタムレイアウトが必要な機能固有の Embed（パネル・サマリー等）は `new EmbedBuilder()` を直接使用してよい。
その場合のカラーは feature の `*.constants.ts` にブランドカラー定数を定義して使う（例: `VC_RECRUIT_PANEL_COLOR = 0x24b9b8`）。

**STATUS_COLORS 一覧:**

| 名前 | 用途 | 値 |
| --- | --- | --- |
| `success` | 成功通知 | `0x57f287` (Discord 緑) |
| `info` | 情報通知 | `0x3498db` (青) |
| `warning` | 警告通知 | `0xfee75c` (Discord 黄) |
| `error` | エラー通知 | `0xed4245` (Discord 赤) |
| `danger` | 破壊的操作の強調 | `0xe74c3c` (赤) |
| `muted` | 二次情報・条件表示 | `0x95a5a6` (灰) |

#### i18n（多言語対応）

ユーザー向け応答文字列・ログメッセージともに生文字列を **禁止** し、すべて `tDefault()` 経由にする。

**翻訳ファイル構成:**

```
locales/{ja,en}/
├── common.ts              ← 共通タイトル・ラベル + 機能横断エラー
├── system.ts              ← 機能横断の内部ログのみ（Bot起動/シャットダウン/Web/DB共通等）
├── features/
│   ├── index.ts           ← 全機能の re-export
│   ├── afk.ts
│   ├── bumpReminder.ts
│   └── ...
```

**翻訳キー命名規則:**

| 種別 | キーパターン | 例 |
| --- | --- | --- |
| コマンド定義 | `{コマンド名}.description` | `afk-config.set-channel.description` |
| ユーザーレスポンス | `user-response.{アクション名}` | `user-response.set_channel_success` |
| UIラベル（ボタン・セレクト・モーダル） | `ui.{UI種類}.{ID}` | `ui.button.reset_confirm` |
| Embedタイトル | `embed.title.{コンテキスト}` | `embed.title.reset_confirm` |
| Embed説明 | `embed.description.{コンテキスト}` | `embed.description.reset_confirm` |
| Embedフィールド名 | `embed.field.name.{フィールド}` | `embed.field.name.channel` |
| Embedフィールド値 | `embed.field.value.{フィールド}` | `embed.field.value.not_configured` |
| ログ | `log.{アクション名}` | `log.config_enabled` |

**ファイル内の記述順:**

```ts
export const afk = {
  // ── コマンド定義 ──
  "afk.description": "...",
  "afk-config.description": "...",

  // ── ユーザーレスポンス ──
  "user-response.moved": "...",
  "user-response.set_channel_success": "...",

  // ── embed: config_view ──
  "embed.title.config_view": "...",
  "embed.field.name.channel": "...",

  // ── embed: reset_confirm ──
  "embed.title.reset_confirm": "...",
  "embed.description.reset_confirm": "...",

  // ── UIラベル ──
  "ui.button.reset_confirm": "...",
  "ui.button.reset_cancel": "...",

  // ── ログ ──
  "log.moved": "...",
  "log.database_channel_set": "...",
} as const;
```

- ロケールキーは **ja/en 両方に同時追加** する
- DB操作は `executeWithDatabaseError` でラップし、成功時は `logger.debug`、失敗時はキー付きエラーメッセージを渡す
- コマンド定義キーにはコマンド名を含める（`config.description` は不可。どのコマンドか不明なため）
- ログキーに機能名プレフィックスは不要（ファイルの名前空間で機能が特定されるため）

##### ログプレフィックスルール

ログメッセージには `logPrefixed()` / `logCommand()` ヘルパー（`localeManager.ts`）でプレフィックスを付与する。
i18n メッセージ文字列に `[xxx]` を直書きすることを **禁止** する。

```ts
// ❌ メッセージ内にプレフィックスをハードコード
logger.info(tDefault("system:bump-reminder.detected", { guildId }));
// i18n: "[Bumpリマインダー] Bumpを検知..."

// ✅ logPrefixed でプレフィックスを自動付与
logger.info(logPrefixed("system:log_prefix.bump_reminder", "system:bump-reminder.detected", { guildId }));
// i18n: "Bumpを検知..."  →  出力: "[Bumpリマインダー] Bumpを検知..."
```

**プレフィックス種別:**

| 種別 | ヘルパー | プレフィックス例 | 用途 |
| --- | --- | --- | --- |
| 機能 | `logPrefixed("system:log_prefix.xxx", ...)` | `[Bumpリマインダー]` | feature 層の処理ログ（ローカライズ対応） |
| イベント | `logPrefixed("system:log_prefix.xxx", ..., sub)` | `[interactionCreate:command]` | Discord.js イベント名＋サブプレフィックス |
| コマンド | `logCommand("/command-name", ...)` | `[/message-delete]` | スラッシュコマンドの受付・完了・失敗 |

**サブプレフィックス:** 同一イベントで複数 flow がある場合、第4引数 `sub` でサブカテゴリを付与する。

```ts
// [interactionCreate:command] コマンド実行 CommandName: /afk
logger.debug(
  logPrefixed("system:log_prefix.interaction_create", "system:interaction.command_executed", { commandName, userId }, "command"),
);
```

**新しいプレフィックスを追加する場合:** `system.ts`（ja/en）の `log_prefix.*` セクションにキーを追加する。

#### マジックナンバー禁止

タイムアウト値・制限値・閾値は名前付き定数として `*.constants.ts` に定義する。数値リテラルの直接使用を **禁止** する。

```ts
// ❌
setTimeout(() => disableComponents(), 14 * 60 * 1000);

// ✅
export const INTERACTION_TIMEOUT_MS = 14 * 60 * 1000;
setTimeout(() => disableComponents(), INTERACTION_TIMEOUT_MS);
```

#### 処理の共通化

同一・類似のロジックが2箇所以上に存在する場合、共通関数に抽出する（必須）。
配置先は同一 feature 内なら feature 直下、feature をまたぐ場合は `src/bot/shared/`。

#### UIセッション状態管理

短命な UI セッション状態は `TtlMap`（`src/shared/utils/ttlMap.ts`）を使用する。生 Map の直接エクスポートを **禁止** する。

```typescript
// ❌
export const sessions = new Map<string, SessionData>();

// ✅
import { TtlMap } from "@/shared/utils/ttlMap";
export const sessions: TtlMap<SessionData> = new TtlMap<SessionData>(TTL_MS);
```

#### タイムアウト後のコンポーネント無効化

`disableComponentsAfterTimeout`（`src/bot/shared/disableComponentsAfterTimeout.ts`）を使用する。
各 feature で `setTimeout` + `editReply` を個別に実装することを **禁止** する。

```typescript
import { disableComponentsAfterTimeout } from "@/bot/shared/disableComponentsAfterTimeout";

await interaction.reply({ components: [selectRow, buttonRow], ... });
disableComponentsAfterTimeout(interaction, [selectRow, buttonRow], TIMEOUT_MS);
```

---

## チェックリスト

### レイヤ構成

- [ ] 変更責務は適切なレイヤに配置されている（`commands` に業務ロジックがない）
- [ ] DB アクセスは `getBotXxxConfigService()` 経由になっている
- [ ] 機能追加時は Prisma スキーマ → 型定義 → リポジトリ → ConfigService → CompositionRoot の手順を踏んでいる

### コメント

- [ ] ファイル先頭コメントがある
- [ ] 関数・public メソッドに JSDoc（`@param` / `@returns` 含む）がある
- [ ] 分岐・副作用の手前に処理意図コメントがある

### 命名

- [ ] ファイル名（camelCase / SlashCommand は kebab-case）・ディレクトリ名（kebab-case）が規則に従っている
- [ ] Custom ID は `<feature>:<action>[:<id>]` フォーマットになっている

### コーディング

- [ ] ステータス通知は `create*Embed` ユーティリティで返している（プレーンテキスト返しがない）
- [ ] Embed タイトルは命名ルールテーブルから選択している（体言止め、英語クラス名禁止）
- [ ] `create*Embed` に渡すロケール文字列に絵文字を含めていない
- [ ] ユーザー向け文字列は `tDefault()` 経由で i18n 化されている（ロケールキーは ja/en 両方に追加）
- [ ] ログメッセージは `logPrefixed()` / `logCommand()` 経由でプレフィックスが付与されている（i18n 文字列に `[xxx]` 直書き禁止）
- [ ] マジックナンバーを使わず名前付き定数を `*.constants.ts` に定義している
- [ ] 同一・類似ロジックの重複がない（共通関数に抽出済み）
- [ ] UI セッション状態に `TtlMap` を使用している（生 Map を使っていない）
- [ ] コンポーネント無効化に `disableComponentsAfterTimeout` を使用している

### 検証

- [ ] `pnpm typecheck` が通る
- [ ] `pnpm lint` が通る
- [ ] `pnpm test` で全テストが通る
- [ ] Docker 関連ファイル変更時は `docker build --target runner .` でビルド確認している
- [ ] `import.meta.dirname` を使う関数は引数でパスを受け取る設計になっている（[詳細](ARCHITECTURE.md#コマンドイベントの自動ロード)）

---

## 関連ドキュメント

- [ARCHITECTURE.md](ARCHITECTURE.md)
- [DEPLOYMENT.md](DEPLOYMENT.md)
- [TESTING_GUIDELINES.md](TESTING_GUIDELINES.md)
