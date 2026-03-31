# i18next 使用ガイド

## 概要

このプロジェクトでは、多言語対応に **i18next** を使用しています。

## 基本的な使い方

### 1. 初期化

botの起動時に自動的に初期化されます。

```typescript
import { localeManager } from "@/shared/locale/localeManager";

// Bot起動時
await localeManager.initialize();
```

### 2. 翻訳の取得

#### Guild別の翻訳

```typescript
import { tGuild } from "@/shared/locale/helpers";

// Guild IDを指定して翻訳
const message = await tGuild(guildId, "common:success");
// → "成功"

// パラメータを渡す
const cooldownMsg = await tGuild(guildId, "commands:cooldown.message", {
  seconds: 10,
});
// → "このコマンドは 10 秒後に再度使用できます。"
```

#### デフォルト言語での翻訳

```typescript
import { tDefault } from "@/shared/locale/localeManager";

// デフォルト言語（日本語）で翻訳
const message = tDefault("common:error");
// → "エラー"
```

#### 固定言語の翻訳関数を取得

```typescript
import { localeManager } from "@/shared/locale/localeManager";

// 日本語の翻訳関数を取得
const fixedT = localeManager.getFixedT("ja");
const message = fixedT("common:success");
// → "成功"

// Guild別の翻訳関数を取得
const guildT = await localeManager.getGuildT(guildId);
const message = guildT("commands:example.success");
```

## 翻訳ファイルの構造

```
src/shared/locale/
├── i18n.ts                    # i18next設定
├── i18next.d.ts               # 型定義
├── localeManager.ts           # ロケール管理
├── helpers.ts                 # ギルド翻訳ヘルパー
└── locales/
    ├── resources.ts           # リソースまとめ
    ├── ja/                    # 日本語
    │   ├── resources.ts
    │   ├── common.ts          # 共通
    │   ├── commands.ts        # コマンド
    │   ├── errors.ts          # エラー
    │   ├── events.ts          # イベント
    │   └── system.ts          # システムログ（operator向け）
    └── en/                    # 英語
        ├── resources.ts
        ├── common.ts
        ├── commands.ts
        ├── errors.ts
        ├── events.ts
        └── system.ts
```

## 翻訳の追加方法

### 1. 翻訳キーの追加

各名前空間のファイルにキーと翻訳を追加：

```typescript
// src/shared/locale/locales/ja/commands.ts
export const commands = {
  // ...既存のキー

  // 新しいキーを追加
  "newCommand.description": "新しいコマンドの説明",
  "newCommand.success": "コマンドが成功しました！",
} as const;
```

### 2. 英語版も追加

```typescript
// src/shared/locale/locales/en/commands.ts
export const commands = {
  // ...existing keys

  // Add new keys
  "newCommand.description": "Description of new command",
  "newCommand.success": "Command succeeded!",
} as const;
```

### 3. 使用する

```typescript
const message = await tGuild(guildId, "commands:newCommand.success");
```

> **⚠️ 重要**: コマンド実装において Discord ユーザーの目に触れる文字列はすべて `tDefault()` 経由にする。生文字列のハードコードは **禁止**。詳細は次節参照。

## コマンド実装における生文字列禁止

Discord ユーザーの目に触れる **すべての文字列** をロケールキー経由にする。

対象は以下をすべて含む:

| 対象                                                 | 例                         |
| ---------------------------------------------------- | -------------------------- |
| `editReply` / `followUp` / `reply` の `content:`     | エラー通知・確認メッセージ |
| Embed のタイトル・説明文・フィールド名/値            | サマリー・結果表示         |
| ボタンのラベル（`setLabel`）                         | 「削除する」「キャンセル」 |
| セレクトメニューのプレースホルダー・オプションラベル | 「チャンネルを選択」       |
| モーダルのタイトル・ラベル・プレースホルダー         | 入力フォーム               |

```typescript
// ❌ 禁止: 生文字列のハードコード
await interaction.editReply("削除しました");
new ButtonBuilder().setLabel("削除する");

// ✅ 正しい: tDefault() 経由
await interaction.editReply(tDefault("commands:foo.success"));
new ButtonBuilder().setLabel(tDefault("commands:foo.btn_delete"));
```

キーは `ja/commands.ts` と `en/commands.ts` に **同時に** 追加する。片方だけの追加は不完全。

## 名前空間

| 名前空間   | 用途                 | 例                             |
| ---------- | -------------------- | ------------------------------ |
| `common`   | 共通の単語・フレーズ | `common:success`               |
| `commands` | コマンド関連         | `commands:example.description` |
| `errors`   | エラーメッセージ     | `errors:not_found`             |
| `events`   | イベントメッセージ   | `events:ready.logged_in`       |
| `system`   | オペレーター向けログ | `system:vac.channel_created`   |

## 型安全性

i18nextは完全に型安全です：

```typescript
// ✅ 正しいキー
const msg = tDefault("common:success");

// ❌ 存在しないキーはTypeScriptエラー
const msg = tDefault("common:nonexistent");
//                    ~~~~~~~~~~~~~~~~~~
// エラー: 型に存在しません
```

## サポート言語の追加

新しい言語を追加する場合：

1. `src/shared/locale/i18n.ts` の `SUPPORTED_LOCALES` に追加
2. `src/shared/locale/locales/{lang}/` ディレクトリを作成
3. 各名前空間ファイルを作成
4. `src/shared/locale/locales/resources.ts` に追加

## 補間（パラメータ）の使い方

```typescript
// 定義
export const events = {
  "ready.logged_in": "{{username}} としてログインしました",
} as const;

// 使用
const msg = await tGuild(guildId, "events:ready.logged_in", {
  username: "BotName#1234",
});
// → "BotName#1234 としてログインしました"
```

## 動的な言語切り替え

```typescript
import { localeManager } from "@/shared/locale/localeManager";

// 言語を英語に切り替え
await localeManager.changeLanguage("en");
```

## システムログのi18n化

`logger.*()` の引数には生文字列を渡さず、必ず `tDefault("system:...")` 経由のロケールキーを使います。

```typescript
import { tDefault } from "@/shared/locale/localeManager";
import { logger } from "@/shared/utils/logger";

// ✅ 正しい: system名前空間のキーを使う
logger.info(tDefault("system:vac.channel_created", { guildId, channelId }));
logger.error(
  tDefault("system:database.vac_channel_register_failed", {
    guildId,
    voiceChannelId,
  }),
  error,
);

// ❌ 禁止: 生文字列
logger.info("VAC channel created");
```

### system名前空間のキー構造

| プレフィックス     | 用途                       | 例                                          |
| ------------------ | -------------------------- | ------------------------------------------- |
| `bot.*`            | Bot起動・シャットダウン    | `system:bot.starting`                       |
| `bump-reminder.*`  | Bumpリマインダー操作       | `system:bump-reminder.config_enabled`       |
| `database.*`       | DB操作の成否               | `system:database.vac_channel_registered`    |
| `error.*`          | グローバルエラーハンドラー | `system:error.global_handlers_registered`   |
| `shutdown.*`       | シャットダウン処理         | `system:shutdown.cleanup_complete`          |
| `afk.*`            | AFK操作ログ                | `system:afk.moved`                          |
| `vac.*`            | VAC操作ログ                | `system:vac.channel_created`                |
| `sticky-message.*` | スティッキーメッセージログ | `system:sticky-message.send_failed`         |
| `scheduler.*`      | スケジューラー操作         | `system:scheduler.bump_reminder_cancelling` |

## ベストプラクティス

1. **キーは階層的に**: `category.subcategory.key` の形式
2. **名前空間を活用**: 関連する翻訳をグループ化
3. **補間を使う**: 動的な値は `{{variable}}` で
4. **型安全性を活用**: TypeScriptの補完とエラー検出を利用
5. **全言語で同じキー**: すべての言語で同じキー構造を維持
6. **Embedユーティリティに渡す文字列に絵文字を含めない**:
   `createWarningEmbed` / `createErrorEmbed` / `createInfoEmbed` / `createSuccessEmbed` は
   タイトルに絵文字を**自動付与**するため、description に渡すロケール文字列には絵文字を入れない。
   `new EmbedBuilder().setTitle()` や `content:` に直接渡す場合は絵文字を含めてよい。

   ```typescript
   // ❌ "⚠️ 条件が不正です" → タイトルとdescriptionで二重になる
   // ✅ "条件が不正です"    → タイトル "⚠️ 警告" + description "条件が不正です"
   ```

## トラブルシューティング

### 翻訳が表示されない

```typescript
// 初期化されているか確認
if (!localeManager["initialized"]) {
  await localeManager.initialize();
}
```

### キーがそのまま表示される

- キーのタイポを確認
- 名前空間プレフィックス（`common:`等）を確認
- 翻訳ファイルにキーが存在するか確認
