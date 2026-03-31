# メッセージ固定機能 - 仕様書

> Sticky Message - 常に最下部に表示されるメッセージ固定機能

最終更新: 2026年3月21日

---

## 概要

指定したチャンネルに「スティッキーメッセージ（固定メッセージ）」を設定し、新しいメッセージが投稿されるたびに自動的に最下部に再送信する機能です。Discordの「ピン留め」機能は上部に固定されるため見逃されやすいですが、スティッキーメッセージは常に最下部に表示されるため、重要な情報を確実に目に留めることができます。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| set | チャンネルにスティッキーメッセージを設定（モーダル入力） |
| remove | セレクトメニューでチャンネルを選んで一括削除 |
| update | 既存スティッキーメッセージの内容を更新（モーダル入力） |
| view | セレクトメニューでチャンネルを選んで設定内容を確認 |
| 自動再送信 | `messageCreate` イベントでデバウンス付き再送信 |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者 | ManageChannels | 全サブコマンドの実行（コマンドレベルで制御） |
| Bot | SendMessages | スティッキーメッセージ送信 |
| Bot | ManageMessages | 前のスティッキーメッセージ削除 |
| Bot | EmbedLinks | Embed形式のメッセージ送信 |

> Bot に上記の権限が不足している場合、インタラクション経由の操作では Bot権限不足エラー（共通フォーマット）を返します。再送信（イベント経由）ではエラーチャンネルへ通知します。詳細は [MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) を参照。

---

## /sticky-message set

### コマンド定義

**コマンド**: `/sticky-message set`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | Channel（テキストチャンネル） | ❌ | 設定するチャンネル（省略時はコマンド実行チャンネル） |
| `style` | String（choices） | ❌ | 表示スタイル（`text` / `embed`、デフォルト: `text`） |

### 動作フロー

1. チャンネルがテキストチャンネルか確認
2. チャンネルに既存のスティッキーメッセージがある場合は警告
3. `style` に応じたモーダルを表示
4. ユーザーがモーダルで内容を入力して送信
5. メッセージをチャンネルに送信
6. データベースに保存（`last_message_id` を更新）
7. 設定完了メッセージを ephemeral で返信

**ビジネスルール:**

- チャンネルごとに1つのスティッキーメッセージのみ設定可能
- 既に設定済みの場合は警告メッセージを返す（上書きしない）

### UI

**モーダル（テキスト）:**

| フィールド | ラベル | スタイル | 必須 | 制約 |
| --- | --- | --- | --- | --- |
| `sticky-message:message-modal-input` | メッセージ内容 | Paragraph | ✅ | 最大2000文字 |

**モーダル（Embed）:**

| フィールド | ラベル | スタイル | 必須 | 制約 |
| --- | --- | --- | --- | --- |
| `sticky-message:embed-title-modal-input` | タイトル | Short | ✅ | 最大256文字 |
| `sticky-message:embed-color-modal-input` | カラーコード | Short | ❌ | `#RRGGBB` または `0xRRGGBB`（デフォルト: `#008969`） |
| `sticky-message:embed-description-modal-input` | 内容 | Paragraph | ✅ | 最大4096文字 |

**エラーケース:**

| 状況 | メッセージ |
| --- | --- |
| テキストチャンネル以外 | テキストチャンネルにのみ設定できます。 |
| 既に設定済み | 既にスティッキーメッセージが設定されています。削除してから再度設定してください。 |
| メッセージが空 | メッセージ内容を入力してください。 |

---

## /sticky-message remove

### コマンド定義

**コマンド**: `/sticky-message remove`

**コマンドオプション:** なし

### 動作フロー

1. データベースから現在のギルドのすべてのスティッキーメッセージを取得
2. チャンネル名と ID のセレクトメニュー（複数選択可）を ephemeral で返信
3. 「削除する」ボタン押下時:
   - 選択された各チャンネルのスティッキーメッセージを削除（Discord側メッセージ + DBレコード）
   - 削除完了メッセージを ephemeral で返信

**ビジネスルール:**

- Discord側メッセージが既に削除されている場合はエラーを無視してDBレコードのみ削除

### UI

**セレクトメニュー:**

| コンポーネント | プレースホルダー | 種別 | 設定 |
| --- | --- | --- | --- |
| `sticky-message:remove-select` | 削除するチャンネルを選択（複数選択可） | StringSelect | `minValues: 1`, `maxValues: 設定数` |

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `sticky-message:remove-confirm` | 🗑️ | 削除する | Danger | 選択チャンネルのスティッキーメッセージを削除 |

**エラーケース:**

| 状況 | メッセージ |
| --- | --- |
| 設定なし | スティッキーメッセージは設定されていません。 |

---

## /sticky-message update

### コマンド定義

**コマンド**: `/sticky-message update`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | Channel（テキストチャンネル） | ❌ | 更新するチャンネル（省略時はコマンド実行チャンネル） |
| `style` | String（choices） | ❌ | 表示スタイル（`text` / `embed`、デフォルト: `text`） |

### 動作フロー

1. データベースから該当チャンネルのスティッキーメッセージを取得
2. `style` に応じたモーダルを表示
3. ユーザーがモーダルで新しい内容を入力して送信
4. チャンネルの旧スティッキーメッセージを削除
5. 新しい内容でメッセージをチャンネルに送信
6. データベースの `last_message_id` を更新
7. 更新完了メッセージを ephemeral で返信

**ビジネスルール:**

- 未指定フィールドは既存値を引き継ぐ
- プレーンテキストからEmbed形式への切り替えも可能

### UI

モーダルは `/sticky-message set` と同じ構成。

**エラーケース:**

| 状況 | メッセージ |
| --- | --- |
| 設定なし | このチャンネルにはスティッキーメッセージが設定されていません。 |
| メッセージが空 | メッセージ内容を入力してください。 |

---

## /sticky-message view

### コマンド定義

**コマンド**: `/sticky-message view`

**コマンドオプション:** なし

### 動作フロー

1. データベースから現在のギルドのすべてのスティッキーメッセージを取得
2. チャンネル名と ID のセレクトメニューを ephemeral で返信
3. チャンネル選択時、設定詳細を Embed で `update()` 表示

### UI

**セレクトメニュー:**

| コンポーネント | プレースホルダー | 種別 | 動作 |
| --- | --- | --- | --- |
| `sticky-message:view-select` | 確認するチャンネルを選択 | StringSelect | 選択チャンネルの設定詳細を表示 |

**Embed（チャンネル選択後）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | スティッキーメッセージ設定 |
| フィールド: チャンネル | #channel |
| フィールド: 形式 | プレーンテキスト / Embed |
| フィールド: 設定日時 | 日時 |
| フィールド: 最終更新者 | `<@userId>`（不明な場合は非表示） |
| フィールド: メッセージ内容 | 内容 |
| フィールド: Embedタイトル | タイトル（Embed形式の場合のみ） |
| フィールド: Embedカラー | カラーコード（Embed形式の場合のみ） |

**エラーケース:**

| 状況 | メッセージ |
| --- | --- |
| 設定なし | スティッキーメッセージは設定されていません。 |

---

## 自動再送信

### トリガー

**イベント**: `messageCreate`

**発火条件:**

- Bot自身のメッセージではない
- ギルド内のテキストチャンネル
- 該当チャンネルにスティッキーメッセージが設定済み

### 動作フロー

1. チャンネルIDごとのデバウンスタイマーをリセット（5秒）
2. 5秒後に再送信を実行:
   - 前回のスティッキーメッセージを削除（`last_message_id` を使用、失敗は無視）
   - 新しいスティッキーメッセージを送信
   - データベースの `last_message_id` を更新

**ビジネスルール:**

- デバウンス再送信: チャンネルへの投稿が連続した場合は最後の投稿から5秒後に1回だけ再送信
- 前回のメッセージが既に削除されている場合はエラーを無視して新しいメッセージを送信
- メッセージ送信権限がない場合はエラーログを記録し処理を終了

---

## データモデル

### StickyMessage

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | String | プライマリキー（cuid） |
| `guildId` | String | ギルドID |
| `channelId` | String | チャンネルID（UNIQUE） |
| `content` | String | メッセージ内容（プレーンテキスト） |
| `embedData` | String? | Embedデータ（JSON文字列） |
| `updatedBy` | String? | 最後に更新したユーザーID |
| `lastMessageId` | String? | 最後に送信したメッセージID |
| `createdAt` | DateTime | 作成日時 |
| `updatedAt` | DateTime | 更新日時 |

**embedData の JSON スキーマ:**

```typescript
interface StickyEmbedData {
  title?: string;       // Embed タイトル（最大256文字）
  description?: string; // Embed 説明文（最大4096文字）
  color?: number;       // カラーコード（数値）
}
```

---

## 制約・制限事項

- チャンネルごとに1つのスティッキーメッセージのみ設定可能
- テキストメッセージ: 最大2000文字
- Embedタイトル: 最大256文字
- Embed説明文: 最大4096文字
- デバウンス: 5秒
- チャンネル削除時は `channelDelete` イベントで DBレコード削除 + タイマーキャンセル
- リセットコマンドは不要（`/sticky-message remove` で全チャンネル選択により一括削除可能）

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/stickyMessage.ts`

キー命名規則は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「翻訳キー命名規則」を参照。

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `sticky-message.description` | コマンド説明 | スティッキーメッセージ（チャンネル最下部固定）の管理（チャンネル管理権限が必要） | Manage sticky messages (pinned to channel bottom) — requires Manage Channels |
| `sticky-message.set.description` | サブコマンド説明 | スティッキーメッセージを設定（モーダル入力） | Set a sticky message (modal input) |
| `sticky-message.set.channel.description` | オプション説明 | 設定するテキストチャンネル（省略時はこのチャンネル） | Text channel to set the sticky message in (defaults to this channel) |
| `sticky-message.set.style.description` | オプション説明 | 表示スタイル（text: テキスト / embed: Embed、省略時: text） | Display style (text: plain text / embed: embed; defaults to text) |
| `sticky-message.remove.description` | サブコマンド説明 | スティッキーメッセージを削除 | Remove sticky messages |
| `sticky-message.view.description` | サブコマンド説明 | スティッキーメッセージ設定を確認（チャンネル選択UI） | View sticky message settings (channel select UI) |
| `sticky-message.update.description` | サブコマンド説明 | スティッキーメッセージの内容を更新（モーダル入力） | Update the content of an existing sticky message (modal input) |
| `sticky-message.update.channel.description` | オプション説明 | 更新対象のチャンネル（省略時はこのチャンネル） | Channel whose sticky message to update (defaults to this channel) |
| `sticky-message.update.style.description` | オプション説明 | 表示スタイル（text: テキスト / embed: Embed、省略時: text） | Display style (text: plain text / embed: embed; defaults to text) |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.set_success` | 設定成功 | スティッキーメッセージを設定しました。 | Sticky message has been set. |
| `user-response.already_exists` | 既設定警告 | 既にスティッキーメッセージが設定されています。削除してから再度設定してください。 | A sticky message is already configured for this channel. Remove it first before setting a new one. |
| `user-response.remove_no_selection` | 未選択エラー | 削除するチャンネルを選択してください。 | Please select channels to remove. |
| `user-response.remove_success` | 削除成功 | {{count}}件のスティッキーメッセージを削除しました。 | Removed {{count}} sticky message(s). |
| `user-response.remove_not_found` | 設定なし | スティッキーメッセージは設定されていません。 | No sticky messages are configured. |
| `user-response.view_empty` | 設定なし（view） | スティッキーメッセージが設定されているチャンネルがありません。 | No sticky messages are configured for any channel. |
| `user-response.update_success` | 更新成功 | スティッキーメッセージを更新しました。 | Sticky message has been updated. |
| `user-response.permission_denied` | 権限不足 | この操作を実行する権限がありません。チャンネル管理権限が必要です。 | You do not have permission to do this. Manage Channels permission is required. |
| `user-response.empty_message` | 空メッセージ | メッセージ内容を入力してください。 | Please enter a message. |
| `user-response.text_channel_only` | チャンネル種別エラー | テキストチャンネルにのみ設定できます。 | Sticky messages can only be set in text channels. |
| `user-response.operation_failed` | 操作エラー | スティッキーメッセージの操作中にエラーが発生しました。 | An error occurred while managing the sticky message. |

### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.set_success` | 設定成功タイトル | 設定完了 | Done |
| `embed.title.already_exists` | 既設定警告タイトル | 警告 | Warning |
| `embed.title.remove_success` | 削除成功タイトル | 削除完了 | Removed |
| `embed.title.remove_not_found` | 未設定タイトル（remove） | 未設定 | Not Found |
| `embed.title.view` | 設定表示タイトル | スティッキーメッセージ設定 | Sticky Message Settings |
| `embed.title.view_not_found` | 未設定タイトル（view） | 未設定 | Not Configured |
| `embed.title.update_success` | 更新成功タイトル | 更新完了 | Updated |
| `embed.title.update_not_found` | 未設定タイトル（update） | 未設定 | Not Configured |
| `embed.field.name.removed_channels` | 削除チャンネルフィールド名 | 削除したチャンネル | Removed channels |
| `embed.field.name.channel` | チャンネルフィールド名 | チャンネル | Channel |
| `embed.field.name.format` | 形式フィールド名 | 形式 | Format |
| `embed.field.value.format_plain` | プレーンテキスト値 | プレーンテキスト | Plain text |
| `embed.field.value.format_embed` | Embed値 | Embed | Embed |
| `embed.field.name.updated_at` | 最終更新フィールド名 | 最終更新 | Last updated |
| `embed.field.name.updated_by` | 設定者フィールド名 | 設定者 | Set by |
| `embed.field.name.content` | メッセージ内容フィールド名 | メッセージ内容 | Message content |
| `embed.field.name.embed_title` | Embedタイトルフィールド名 | Embedタイトル | Embed title |
| `embed.field.name.embed_color` | Embedカラーフィールド名 | Embedカラー | Embed color |

### UIラベル

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ui.modal.set_title` | 設定モーダルタイトル | スティッキーメッセージの内容を入力 | Enter sticky message content |
| `ui.modal.set_message_label` | 設定メッセージラベル | メッセージ内容 | Message content |
| `ui.modal.set_message_placeholder` | 設定メッセージプレースホルダー | 改行して複数行のメッセージを入力できます（最大2000文字） | Supports multiple lines (max 2000 characters) |
| `ui.modal.set_embed_title` | Embed設定モーダルタイトル | Embed スティッキーメッセージを設定 | Set embed sticky message |
| `ui.modal.set_embed_title_label` | Embedタイトルラベル | タイトル | Title |
| `ui.modal.set_embed_title_placeholder` | Embedタイトルプレースホルダー | Embed のタイトルを入力（最大256文字） | Embed title (optional) |
| `ui.modal.set_embed_description_label` | Embed説明ラベル | 内容 | Description |
| `ui.modal.set_embed_description_placeholder` | Embed説明プレースホルダー | Embed の内容を入力（最大4096文字） | Embed body text (leave blank for none) |
| `ui.modal.set_embed_color_label` | Embedカラーラベル | カラーコード(任意) | Color code (optional) |
| `ui.modal.set_embed_color_placeholder` | Embedカラープレースホルダー | #008969 または 0x008969 形式で入力（省略時: #008969） | #008969 or 0x008969 (default: #008969) |
| `ui.select.remove_placeholder` | 削除セレクトプレースホルダー | 削除するチャンネルを選択（複数選択可） | Select channels to remove (multiple) |
| `ui.button.remove` | 削除ボタン | 削除する | Remove |
| `ui.select.view_placeholder` | 表示セレクトプレースホルダー | チャンネルを選択してください。 | Select a channel |
| `ui.modal.update_title` | 更新モーダルタイトル | スティッキーメッセージを更新 | Update sticky message |
| `ui.modal.update_message_label` | 更新メッセージラベル | メッセージ内容 | Message content |
| `ui.modal.update_message_placeholder` | 更新メッセージプレースホルダー | 改行して複数行入力できます（最大2000文字） | Supports multiple lines (max 2000 characters) |
| `ui.modal.update_embed_title` | Embed更新モーダルタイトル | Embed スティッキーメッセージを更新 | Update embed sticky message |

### ログ

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.channel_delete_cleanup` | チャンネル削除クリーンアップ | channelDelete時クリーンアップ完了 ChannelId: {{channelId}} | Cleaned up on channel delete ChannelId: {{channelId}} |
| `log.channel_delete_cleanup_failed` | チャンネル削除クリーンアップ失敗 | channelDelete時レコード削除失敗 ChannelId: {{channelId}} | Failed to delete record on channel delete ChannelId: {{channelId}} |
| `log.create_handler_error` | messageCreate処理エラー | messageCreate処理エラー ChannelId: {{channelId}} GuildId: {{guildId}} | messageCreate handler error ChannelId: {{channelId}} GuildId: {{guildId}} |
| `log.resend_scheduled_error` | 再送スケジュールエラー | 再送スケジュールエラー | Resend scheduled error |
| `log.send_failed` | メッセージ送信失敗 | メッセージ送信失敗 ChannelId: {{channelId}} GuildId: {{guildId}} | Failed to send message ChannelId: {{channelId}} GuildId: {{guildId}} |
| `log.previous_deleted_or_not_found` | 前回メッセージ削除済み | 前回メッセージ削除済みまたは未存在 ChannelId: {{channelId}} | Previous message already deleted or not found ChannelId: {{channelId}} |
| `log.set_failed` | 設定失敗 | モーダルからの設定失敗 ChannelId: {{channelId}} GuildId: {{guildId}} | Failed to set via modal ChannelId: {{channelId}} GuildId: {{guildId}} |
| `log.set_embed_failed` | Embed設定失敗 | Embedモーダルからの設定失敗 ChannelId: {{channelId}} GuildId: {{guildId}} | Failed to set via embed modal ChannelId: {{channelId}} GuildId: {{guildId}} |
| `log.update_failed` | 更新失敗 | モーダルからの更新失敗 ChannelId: {{channelId}} GuildId: {{guildId}} | Failed to update via modal ChannelId: {{channelId}} GuildId: {{guildId}} |
| `log.update_embed_failed` | Embed更新失敗 | Embedモーダルからの更新失敗 ChannelId: {{channelId}} GuildId: {{guildId}} | Failed to update via embed modal ChannelId: {{channelId}} GuildId: {{guildId}} |
| `log.resend_after_update_failed` | 更新後再送信失敗 | 更新後の再送信失敗 ChannelId: {{channelId}} | Failed to resend after update ChannelId: {{channelId}} |
| `log.resend_after_embed_update_failed` | Embed更新後再送信失敗 | Embed更新後の再送信失敗 ChannelId: {{channelId}} | Failed to resend after embed update ChannelId: {{channelId}} |
| `log.database_find_by_channel_failed` | DB取得失敗 | スティッキーメッセージ取得に失敗 ChannelId: {{channelId}} | Failed to find sticky message ChannelId: {{channelId}} |
| `log.database_find_all_by_guild_failed` | DB全件取得失敗 | スティッキーメッセージ全件取得に失敗 GuildId: {{guildId}} | Failed to find all sticky messages GuildId: {{guildId}} |
| `log.database_create_failed` | DB作成失敗 | スティッキーメッセージ作成に失敗 GuildId: {{guildId}} ChannelId: {{channelId}} | Failed to create sticky message GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.database_update_last_message_id_failed` | DB lastMessageId更新失敗 | スティッキーメッセージ lastMessageId 更新に失敗 Id: {{id}} | Failed to update sticky message lastMessageId Id: {{id}} |
| `log.database_update_content_failed` | DB内容更新失敗 | スティッキーメッセージ内容更新に失敗 Id: {{id}} | Failed to update sticky message content Id: {{id}} |
| `log.database_delete_failed` | DB削除失敗 | スティッキーメッセージ削除に失敗 Id: {{id}} | Failed to delete sticky message Id: {{id}} |
| `log.database_delete_by_channel_failed` | DBチャンネル別削除失敗 | スティッキーメッセージ削除に失敗 ChannelId: {{channelId}} | Failed to delete sticky message by channel ChannelId: {{channelId}} |

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| StickyMessageConfigService | スティッキーメッセージ設定の取得・更新・削除 |
| StickyMessageResendService | デバウンス付き自動再送信 |

---

## テストケース

### ユニットテスト

- [x] set: プレーンテキスト・Embed両対応、既設定時の警告、空メッセージエラー
- [x] remove: セレクトメニュー表示、単一・複数選択削除、Discord側メッセージ削除済みでもDB削除成功
- [x] update: 内容更新、形式切り替え、未設定時エラー
- [x] view: セレクトメニュー表示、詳細Embed表示、再選択で切り替え
- [x] 自動再送信: デバウンス動作、Bot自身のメッセージ無視、前回メッセージ削除済みでも再送信、Bot権限不足時のエラーチャンネル通知

### インテグレーションテスト

- [x] データベース連携（保存・取得・削除・updateLastMessageId）

---

## 参考リソース

- [MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md): メッセージレスポンス統一仕様
- [Discord.js - TextChannel](https://discord.js.org/#/docs/discord.js/main/class/TextChannel)
- [Discord.js - EmbedBuilder](https://discord.js.org/#/docs/discord.js/main/class/EmbedBuilder)
