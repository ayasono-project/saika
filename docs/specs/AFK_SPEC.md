# AFK機能 - 仕様書

> ボイスチャンネルの非アクティブユーザーを手動でAFKチャンネルに移動する機能

最終更新: 2026年3月22日

---

## 概要

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| `/afk` | ユーザーをAFKチャンネルに移動 |
| `/afk-config set-channel` | AFKチャンネルを設定 |
| `/afk-config view` | 現在のAFK設定を表示 |
| `/afk-config clear-channel` | AFKチャンネル設定を解除 |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者（`/afk`） | なし | 全メンバー実行可能 |
| 実行者（`/afk-config`） | ManageGuild | AFK設定の管理 |
| Bot | MoveMembers | ユーザーのVC移動 |

---

## /afk

### コマンド定義

**コマンド**: `/afk [user]`

**実行権限**: 全メンバー

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `user` | User | ❌ | 移動対象のユーザー（省略時は実行者自身） |

### 動作フロー

1. AFK機能が有効か確認
2. 対象ユーザーがボイスチャンネルに参加しているか確認
3. 設定されたAFKチャンネルに移動
4. 移動完了をチャンネルに通知

**ビジネスルール:**

- AFK機能が無効（`enabled=false`）または未設定（`channelId=null`）の場合はエラー
- 対象ユーザーがVCに参加していない場合はエラー
- AFKチャンネルが削除済み・存在しない場合はエラー
- Bot に `MoveMembers` 権限が不足している場合は Bot権限不足エラー（共通フォーマット、[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照）

### UI

**成功メッセージ（`createSuccessEmbed` 使用）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | {{user}} を {{channel}} に移動しました。 |

---

## /afk-config set-channel

### コマンド定義

**コマンド**: `/afk-config set-channel`

**実行権限**: ManageGuild

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | VoiceChannel | ✅ | AFKチャンネルとして使用するボイスチャンネル |

### 動作フロー

1. ManageGuild 権限チェック
2. 指定されたチャンネルがボイスチャンネルか確認
3. AFK設定を更新（`enabled: true`、`channelId` を保存）
4. 設定完了を ephemeral で通知

**ビジネスルール:**

- ボイスチャンネル以外が指定された場合はエラー
- 既存設定がある場合は上書き

### UI

**成功メッセージ:**

`createSuccessEmbed` 使用 / ephemeral

| 項目 | 内容 |
| --- | --- |
| タイトル | 設定完了 |
| 説明 | AFKチャンネルを {{channel}} に設定しました。 |

---

## /afk-config view

### コマンド定義

**コマンド**: `/afk-config view`

**実行権限**: ManageGuild

**コマンドオプション:** なし

### 動作フロー

1. ManageGuild 権限チェック
2. 現在のAFK設定を取得
3. 設定状態（有効/無効、チャンネル）を表示
4. ephemeral で応答

### UI

**Embed（`createInfoEmbed` 使用 / ephemeral）:**

設定済み・未設定に関わらず同一フォーマットで表示する。

| 項目 | 内容 |
| --- | --- |
| タイトル | AFK機能 |
| フィールド: 状態 | 有効 / 無効 |
| フィールド: AFKチャンネル | `<#channelId>` / 未設定 |

---

## /afk-config clear-channel

### コマンド定義

**コマンド**: `/afk-config clear-channel`

**実行権限**: ManageGuild

**コマンドオプション:** なし

### 動作フロー

1. ManageGuild 権限チェック
2. AFK設定をクリア（`enabled: false`, `channelId: null`）
3. 完了メッセージを ephemeral で送信

**ビジネスルール:**

- 設定が存在しない場合でも操作は成功扱い（冪等）
- 確認ダイアログなし（設定項目がチャンネル1つのみのため即時実行）

### UI

**成功メッセージ（`createSuccessEmbed` 使用）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | 設定完了 |
| 説明 | AFKチャンネル設定を解除しました。 |

---

## データモデル

### GuildAfkConfig

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルドID（主キー） |
| `enabled` | Boolean | 機能の有効/無効（デフォルト: false） |
| `channelId` | String? | AFKチャンネルID（未設定時は null） |

---

## 制約・制限事項

- なし

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/afk.ts`

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `afk.description` | コマンド説明 | AFKチャンネルにユーザーを移動 | Move user to AFK channel |
| `afk.user.description` | オプション説明 | 移動するユーザー（省略で自分） | User to move (default: yourself) |
| `afk-config.description` | コマンド説明 | AFK機能の設定（サーバー管理権限が必要） | Configure AFK feature (requires Manage Server) |
| `afk-config.set-channel.description` | サブコマンド説明 | AFKチャンネルを設定 | Configure AFK channel |
| `afk-config.set-channel.channel.description` | オプション説明 | AFKチャンネル（ボイスチャンネル） | AFK channel (voice channel) |
| `afk-config.clear-channel.description` | サブコマンド説明 | AFKチャンネル設定を解除 | Clear AFK channel setting |
| `afk-config.view.description` | サブコマンド説明 | 現在の設定を表示 | Show current settings |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.moved` | 移動成功 | {{user}} を {{channel}} に移動しました。 | Moved {{user}} to {{channel}} |
| `user-response.set_channel_success` | チャンネル設定成功 | AFKチャンネルを {{channel}} に設定しました。 | AFK channel configured: {{channel}} |
| `user-response.clear_channel_success` | 解除成功レスポンス | AFKチャンネル設定を解除しました。 | AFK channel setting has been cleared. |
| `user-response.not_configured` | 未設定エラー | AFKチャンネルが設定されていません。\n`/afk-config set-channel` でチャンネルを設定してください。（管理者用） | AFK channel is not configured.\nPlease configure a channel with `/afk-config set-channel` (administrator only). |
| `user-response.member_not_found` | ユーザー不在エラー | ユーザーが見つかりませんでした。 | User not found. |
| `user-response.user_not_in_voice` | VC未参加エラー | 指定されたユーザーはボイスチャンネルにいません。 | The specified user is not in a voice channel. |
| `user-response.channel_not_found` | チャンネル不在エラー | AFKチャンネルが見つかりませんでした。\nチャンネルが削除されている可能性があります。 | AFK channel not found.\nThe channel may have been deleted. |
| `user-response.invalid_channel_type` | チャンネル種別エラー | ボイスチャンネルを指定してください。 | Please specify a voice channel. |

### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.success` | 設定完了タイトル | 設定完了 | Settings Updated |
| `embed.title.config_view` | 設定表示タイトル | AFK機能 | AFK |
| `embed.field.name.status` | 状態フィールド名 | 状態 | Status |
| `embed.field.name.channel` | チャンネルフィールド名 | AFKチャンネル | AFK Channel |
| `embed.field.value.not_configured` | 未設定フィールド値 | 未設定 | Not configured |

### ログ

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.moved` | コマンド実行ログ | ユーザーをAFKチャンネルに移動 GuildId: {{guildId}} UserId: {{userId}} ChannelId: {{channelId}} | moved user to AFK channel GuildId: {{guildId}} UserId: {{userId}} ChannelId: {{channelId}} |
| `log.configured` | コマンド実行ログ | AFKチャンネル設定 GuildId: {{guildId}} ChannelId: {{channelId}} | channel configured GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.channel_cleared` | チャンネル解除ログ | AFKチャンネル設定を解除 GuildId: {{guildId}} | AFK channel setting cleared GuildId: {{guildId}} |
| `log.database_channel_set` | DB操作ログ | AFKチャンネルを設定 GuildId: {{guildId}} ChannelId: {{channelId}} | AFK channel set GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.database_channel_set_failed` | DB操作エラーログ | AFKチャンネル設定に失敗 GuildId: {{guildId}} ChannelId: {{channelId}} | Failed to set AFK channel GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.database_config_saved` | DB操作ログ | AFK設定を保存 GuildId: {{guildId}} | AFK config saved GuildId: {{guildId}} |
| `log.database_config_save_failed` | DB操作エラーログ | AFK設定保存に失敗 GuildId: {{guildId}} | Failed to save AFK config GuildId: {{guildId}} |

---

## テストケース

### ユニットテスト

- [x] `/afk`: ギルド外実行エラー、正常移動+成功Embed、config未設定/無効エラー、メンバー未検出/VC未参加/AFKチャンネル不在エラー、Bot権限不足エラー伝播、userオプション指定
- [x] `/afk-config set-channel`: ManageGuild権限チェック、正常設定、非VCチャンネルエラー
- [x] `/afk-config view`: 設定済み/未設定の表示
- [x] `/afk-config clear-channel`: 設定解除

### インテグレーションテスト

- [x] set-channel → view → /afk 移動の一連フロー

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildConfigRepository | AFK設定の取得・更新 |
