# Botメッセージレスポンス - 仕様書

> Botが送信するメッセージの統一フォーマット仕様

最終更新: 2026年3月21日

---

## 概要

Botが送信するすべてのメッセージ（コマンド応答、エラー通知など）を**Embed形式**で統一し、視認性と一貫性を向上させる仕様です。

### ステータスの種類

| ステータス | 説明 | カラーコード | 絵文字 | 用途 |
| --- | --- | --- | --- | --- |
| Success（成功） | 操作が正常に完了 | `0x57F287`（Green） | ✅ | 設定完了、機能有効化、登録成功など |
| Info（情報） | 一般的な情報表示 | `0x3498DB`（Blue） | ℹ️ | 設定状態表示、ヘルプメッセージなど |
| Warning（注意） | 注意が必要な状態 | `0xFEE75C`（Yellow） | ⚠️ | 既に設定済み、制限事項の通知など |
| Error（エラー） | エラーが発生 | `0xED4245`（Red） | ❌ | コマンド失敗、権限不足、バリデーションエラーなど |

---

## Embedメッセージの構造

### タイトル形式

ステータス絵文字がタイトルの先頭に自動付与される。

```
[絵文字] [タイトル]
```

**例:**

- `✅ 設定完了`
- `ℹ️ Bumpリマインダー機能`
- `⚠️ 既に設定されています`
- `❌ エラーが発生しました`

### ヘルパー関数

| 関数名 | ステータス | デフォルトタイトル | 用途 |
| --- | --- | --- | --- |
| `createSuccessEmbed(description, options?)` | Success | `common:title_success` | 成功メッセージ |
| `createInfoEmbed(description, options?)` | Info | `common:title_info` | 情報メッセージ |
| `createWarningEmbed(description, options?)` | Warning | `common:title_warning` | 警告メッセージ |
| `createErrorEmbed(description, options?)` | Error | `common:title_error` | エラーメッセージ |

**オプション:**

| プロパティ | 型 | 説明 |
| --- | --- | --- |
| `title` | string | カスタムタイトル（デフォルトタイトルを上書き） |
| `timestamp` | boolean | タイムスタンプを表示 |
| `fields` | Array | Embedフィールドを追加 |

---

## 適用範囲

### Embed形式を使用するもの

- すべてのコマンドレスポンス（成功・エラー・情報表示）
- 設定表示パネル（`-config view`）
- 確認ダイアログ（リセット・削除・インポート）

### Embed形式を使用しないもの（例外）

| 対象 | 形式 | 理由 |
| --- | --- | --- |
| Bumpリマインダー通知 | プレーンテキスト + メンション | メンションとリマインダーを簡潔に表示するため |
| Bumpパネル | カスタムEmbed + ボタン | 既にEmbed形式でボタンUIと組み合わせて機能的 |
| メンバーログ通知 | カスタムEmbed | 独自のカラー（ビリジアン/茜色）とフィールド構成を使用 |
| スティッキーメッセージ | プレーンテキスト or カスタムEmbed | ユーザーが設定した内容をそのまま表示 |

---

## Bot権限不足エラーの共通フォーマット

Discord API の `MissingPermissions`（50013）エラーは、全機能で統一されたフォーマットでユーザーに通知されます。

### インタラクション経由の場合（コマンド・ボタン・モーダル等）

グローバルエラーハンドラ（`interactionErrorHandler`）が自動検出し、以下の Embed を ephemeral で返します。APIエンドポイント（URL / method）から必要な権限を自動推定し、具体的な権限名を表示します。

| 項目 | 内容 |
| --- | --- |
| タイトル | ❌ Bot権限不足 |
| 権限ヒント（該当時） | この操作にはBotに **メンバーを移動（Move Members）** 権限が必要です。（※操作に応じて変化） |
| 説明 | Botに必要な権限が不足しているため、操作を実行できませんでした。\nサーバー管理者に以下の確認をお願いします:\n・Botに管理者権限が付与されていること\n・対象チャンネルでBotの権限が制限されていないこと |

**対応する i18n キー:**

| キー | 用途 |
| --- | --- |
| `common:title_bot_permission_denied` | Embed タイトル |
| `common:bot_permission.hint_*` | 操作別の権限ヒント（manage_channels / move_members / send_messages / manage_messages / manage_roles） |
| `common:bot_permission.missing` | Embed 説明文（チェックリスト） |

**権限ヒントの自動推定:**

| API パターン | 推定権限 |
| --- | --- |
| `POST /guilds/{id}/channels` | Manage Channels |
| `PATCH /channels/{id}` | Manage Channels |
| `PATCH /guilds/{id}/members/{id}` | Move Members |
| `POST /channels/{id}/messages` | Send Messages |
| `DELETE /channels/{id}/messages/{id}` | Manage Messages |
| `PUT /channels/{id}/permissions/{id}` | Manage Roles |

### イベント経由の場合（voiceStateUpdate・guildMemberAdd 等）

インタラクションが存在しないため、エラーチャンネル（`guild-config set-error-channel` で設定）へ通知 Embed を送信します。エラーチャンネルが未設定の場合はログのみ記録します。

---

## 制約・制限事項

- Embedタイトル: 最大256文字（超過時は自動切り詰め）
- Embed説明: 最大4096文字
- タイトルが256文字を超える場合は `...` で切り詰め
- Bot権限不足でEmbed送信に失敗した場合はエラーログを記録

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| common.ts | デフォルトタイトル（`title_success`, `title_info`, `title_warning`, `title_error`） |

---

## 参考リソース

- [Discord.js - EmbedBuilder](https://discord.js.org/#/docs/discord.js/main/class/EmbedBuilder)
- [Discord - Embed Colors](https://discord.com/developers/docs/resources/channel#embed-object)
