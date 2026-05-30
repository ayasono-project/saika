# AFK機能 - 仕様書

> ボイスチャンネルの非アクティブユーザー、または指定 VC の参加者全員を手動でAFKチャンネルに移動する機能

最終更新: 2026年5月30日

> **ステータス**: `/afk` の `target` 拡張(VC 一括指定)および public 化は実装完了(2026-05-30)。型表現・共通ユーティリティ・確認ダイアログのオープン項目は [VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) で確定済み。

---

## 概要

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| `/afk` | 指定ユーザー、または指定 VC の全員を AFK チャンネルに移動 |
| `/afk-settings set-channel` | AFKチャンネルを設定 |
| `/afk-settings view` | 現在のAFK設定を表示 |
| `/afk-settings clear-channel` | AFKチャンネル設定を解除 |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者（`/afk`） | なし | 全メンバー実行可能。コード側で Discord 権限チェックは行わない |
| 実行者（`/afk-settings`） | ManageGuild | AFK設定の管理 |
| Bot | MoveMembers | ユーザーのVC移動 |

**Bot ロール階層(`/afk`):** Bot のロールが対象メンバーのロールより上位にある必要がある。階層不足時は Bot 権限不足エラー(共通フォーマット、[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照)を返す。

### 出力可視性ポリシー

`/afk` の成功時応答は **public(非 ephemeral)** で統一する(共有リソースの状態変更、透明性確保のため)。エラー応答・確認ダイアログ・キャンセル/タイムアウト応答は ephemeral。`/afk-settings` 系は従来通り ephemeral。

判定原則の本文は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「コマンド設計原則(ephemeral / public)」を参照(本タスクで新設)。

---

## /afk

### コマンド定義

**コマンド**: `/afk [target]`

**実行権限**: 全メンバー(コード側で Discord 権限チェックなし)

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `target-member` | User | ❌ | 移動対象のメンバー。省略時は実行者自身 |
| `target-channel` | Voice Channel | ❌ | 当該 VC の全員をサーバー AFK チャンネルに移動 |

`target` の型表現は [VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) と統一し **案 A**(2オプション + コード側で「両方未指定=自分 / 両方指定=競合エラー」を判定)を採用。共通解決ヘルパー `resolveVcActionTarget`(`src/bot/shared/vcActionTarget.ts`)を使う。

**従来の `user` オプションからの変更点:**

- `user` → `target-member`(User) + `target-channel`(VoiceChannel) に変更(VC 一括指定に対応)
- 既存ローカライズキー `afk.user.description` → `afk.target-member.description` / `afk.target-channel.description` に置換
- 成功時応答は `formatActionLog`(action='afk') の public Embed に変更(従来の `afk:user-response.moved` は未使用化)

### 動作フロー

#### target が User または省略の場合(個別移動)

1. AFK機能が有効か確認
2. 対象ユーザー(省略時は実行者)がボイスチャンネルに参加しているか確認
3. Bot のロール階層が対象を上回るか確認(target 指定時のみ)
4. 設定された AFK チャンネルに `voice.setChannel(afkChannel)` で移動
5. public で `formatActionLog` Embed を返す([VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) の「共通: アクションログ Embed」参照)

#### target が Channel の場合(一括移動)

1. AFK機能が有効か確認
2. 対象 VC が AFK チャンネル自身でないことを確認
3. 対象 VC に 1 人以上参加しているか確認
4. 確認ダイアログを ephemeral で表示([VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) の「共通: 一括確認ダイアログ」参照)
5. 実行ボタン押下 → 実行時点で対象 VC のメンバー一覧を再取得し、各メンバーに対して順次 `voice.setChannel(afkChannel)`
6. 完了後、public で `formatActionLog` Embed を返す(対象人数・失敗内訳を含む)

**ビジネスルール:**

- AFK機能が無効（`enabled=false`）または未設定（`channelId=null`）の場合はエラー
- 対象ユーザーがVCに参加していない場合はエラー
- AFKチャンネルが削除済み・存在しない場合はエラー
- target=channel で対象 VC が AFK チャンネル自身 → エラー「対象 VC が AFK チャンネルと同じです」
- target=channel で対象 VC が空(受付時点 / 実行時点いずれでも) → エラー「対象 VC には誰もいません」(ephemeral)
- ロール階層不足 → Bot 権限不足エラー
- 一括時、一部メンバーで失敗しても残りは続行(失敗内訳を Embed に含める)
- Bot に `MoveMembers` 権限が不足している場合は Bot権限不足エラー（共通フォーマット、[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照）

### UI

成功時の Embed は [VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) の「共通: アクションログ Embed」(`action='afk'`)で生成。public で送信する。

一括時の確認ダイアログは [VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) の「共通: 一括確認ダイアログ」を流用。

---

## /afk-settings set-channel

### コマンド定義

**コマンド**: `/afk-settings set-channel`

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

## /afk-settings view

### コマンド定義

**コマンド**: `/afk-settings view`

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

## /afk-settings clear-channel

### コマンド定義

**コマンド**: `/afk-settings clear-channel`

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

### GuildAfkSettings

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
| `afk.target-member.description` | オプション説明 | 移動するメンバー（省略で自分） | Member to move (default: yourself) |
| `afk.target-channel.description` | オプション説明 | 全員をAFKチャンネルに移動する対象VC | VC whose members will all be moved to the AFK channel |
| `afk-settings.description` | コマンド説明 | AFK機能の設定（サーバー管理権限が必要） | Configure AFK feature (requires Manage Server) |
| `afk-settings.set-channel.description` | サブコマンド説明 | AFKチャンネルを設定 | Configure AFK channel |
| `afk-settings.set-channel.channel.description` | オプション説明 | AFKチャンネル（ボイスチャンネル） | AFK channel (voice channel) |
| `afk-settings.clear-channel.description` | サブコマンド説明 | AFKチャンネル設定を解除 | Clear AFK channel setting |
| `afk-settings.view.description` | サブコマンド説明 | 現在の設定を表示 | Show current settings |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.moved` | 移動成功 | {{user}} を {{channel}} に移動しました。 | Moved {{user}} to {{channel}} |
| `user-response.set_channel_success` | チャンネル設定成功 | AFKチャンネルを {{channel}} に設定しました。 | AFK channel configured: {{channel}} |
| `user-response.clear_channel_success` | 解除成功レスポンス | AFKチャンネル設定を解除しました。 | AFK channel setting has been cleared. |
| `user-response.not_configured` | 未設定エラー | AFKチャンネルが設定されていません。\n`/afk-settings set-channel` でチャンネルを設定してください。（管理者用） | AFK channel is not configured.\nPlease configure a channel with `/afk-settings set-channel` (administrator only). |
| `user-response.member_not_found` | ユーザー不在エラー | ユーザーが見つかりませんでした。 | User not found. |
| `user-response.user_not_in_voice` | VC未参加エラー | 指定されたユーザーはボイスチャンネルにいません。 | The specified user is not in a voice channel. |
| `user-response.channel_not_found` | チャンネル不在エラー | AFKチャンネルが見つかりませんでした。\nチャンネルが削除されている可能性があります。 | AFK channel not found.\nThe channel may have been deleted. |
| `user-response.invalid_channel_type` | チャンネル種別エラー | ボイスチャンネルを指定してください。 | Please specify a voice channel. |
| `user-response.target_is_afk` | 対象VCがAFKチャンネルと同一 | 対象VCがAFKチャンネルと同じです。 | The target VC is the same as the AFK channel. |

> 一括移動時の確認ダイアログ・アクションログ・対象/失敗内訳の文言、メンバー不在/VC未参加エラーは `vc` 名前空間の共通キー(`vc:bulk-confirm.*` / `vc:action-log.*` / `vc:user-response.member_not_found` 等)を参照する。詳細は [VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) のローカライズを参照。

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
- [x] `/afk-settings set-channel`: ManageGuild権限チェック、正常設定、非VCチャンネルエラー
- [x] `/afk-settings view`: 設定済み/未設定の表示
- [x] `/afk-settings clear-channel`: 設定解除

### インテグレーションテスト

- [x] set-channel → view → /afk 移動の一連フロー

### target 拡張・public 化に伴う追加テスト

- [x] `/afk` target=member / target省略: 既存挙動が維持され、応答が **public** で返る
- [x] `/afk` target=channel 正常系: 確認ダイアログ → 実行 → 対象 VC 全員が AFK チャンネルに移動、結果が public
- [x] `/afk` target=channel: 対象 VC が AFK チャンネル自身でエラー
- [x] `/afk` target=channel: 対象 VC が空(受付時点 / 実行後の再取得時点)で no-op エラー
- [x] `/afk` target=channel: 確認ダイアログのキャンセル / タイムアウト動作
- [x] `/afk` target=channel: 一部メンバーで `setChannel` 失敗時に残りを続行、失敗内訳が Embed に表示（共通 `vcBulkAction` テストで検証）
- [x] `/afk`: `formatActionLog`(action='afk', individual/bulk)が正しいテンプレートで生成される

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildSettingsRepository | AFK設定の取得・更新 |
| [VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) | `formatActionLog` および一括確認ダイアログを共有 |
| [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) | ephemeral/public 判定原則の親ドキュメント(本タスクで該当セクションを新設) |
