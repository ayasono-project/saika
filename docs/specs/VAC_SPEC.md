# VC自動作成機能 (VAC) - 仕様書

> トリガーチャンネル参加時に専用ボイスチャンネルを自動作成・管理する機能

最終更新: 2026年3月22日

---

## 概要

ユーザーがトリガーチャンネル（CreateVC）に参加すると、自動的にそのユーザー専用のボイスチャンネルを作成する機能です。作成されたVCは参加者が全員退出すると自動的に削除されます。

> **VC操作コマンド（名前変更・人数制限変更）について**: `/vc rename` および `/vc limit` コマンドとして独立機能に切り出されています。詳細は [VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) を参照してください。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| VC自動作成 | トリガーチャンネル参加で専用VCを作成・ユーザーを自動移動 |
| 操作パネル | 作成VCのチャットにパネル設置（名前変更・人数制限・AFK移動・パネル再送信） |
| VC自動削除 | VCが空になると自動削除 |
| create-trigger-vc | トリガーチャンネルを作成 |
| remove-trigger-vc | トリガーチャンネルを削除 |
| view | 現在の設定を表示 |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者 | ManageGuild | `/vac-config` 全サブコマンドの実行（コマンドレベルで制御） |
| Bot | ManageChannels | VCの作成・削除・権限設定 |
| Bot | MoveMembers | ユーザーの自動移動（作成VC・AFK移動） |
| Bot | SendMessages | 操作パネルの送信 |
| Bot | EmbedLinks | パネルのEmbed形式メッセージ |

---

## VC自動作成

### トリガー

**イベント**: `voiceStateUpdate`

**発火条件:**

- ユーザーがトリガーチャンネル（CreateVC）に参加
- VAC機能が有効

### 動作フロー

1. トリガーチャンネルへの参加を確認
2. 同一ユーザーが既に所有VCを持つ場合はそちらに移動
3. 新規VCを作成（名前: `{ユーザー名}'s Room`、カテゴリ: トリガーチャンネルと同じ、人数制限: 99）
4. 作成者に `ManageChannels` 権限を付与
5. VCのチャットに操作パネルを送信
6. ユーザーを新しいVCに自動移動
7. データベースに作成したVCのIDを保存

**ビジネスルール:**

- 同名のチャンネルが既に存在する場合は末尾に連番を付加（例: `しゅん's Room (2)`）
- カテゴリのチャンネル数が上限（50）に達している場合はVC作成をスキップしてエラーを返す
- 作成者にはチャンネルスコープの `ManageChannels` 権限を付与（Discord標準UI経由での詳細設定用）
- `@everyone` への `ManageChannels` 付与は行わない（チャンネル削除・権限上書きも含まれるため）
- Bot に `ManageChannels` / `MoveMembers` 権限が不足している場合はエラーチャンネルへ通知し処理を中断（[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照）

### UI

**操作パネルEmbed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | 🎤 ボイスチャンネル操作パネル |
| 説明 | このパネルからVCの設定を変更できます。 |

**パネルボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `vac:rename:{channelId}` | ✏️ | VC名を変更 | Primary | モーダルでVC名を入力 |
| `vac:limit:{channelId}` | 👥 | 人数制限を変更 | Primary | モーダルで人数を入力（0-99、0=無制限） |
| `vac:afk:{channelId}` | 🔇 | メンバーをAFKに移動 | Primary | ユーザーセレクトメニューで選択・移動 |
| `vac:refresh:{channelId}` | 🔄 | パネルを最下部に移動 | Secondary | 既存パネル削除→新規送信 |

**パネル操作の権限:**

| ユーザー種別 | パネル操作 | Discord UI操作 |
| --- | --- | --- |
| VC参加中のユーザー | 名前変更・人数制限・AFK移動・パネル再送信 | 不可（作成者を除く） |
| 作成者 | 上記すべて | チャンネルスコープ `ManageChannels` により編集・削除可能 |
| サーバー管理者 | 上記すべて（VC参加が必要） | 全チャンネルの編集・削除が可能 |
| VC未参加ユーザー | 不可（エラーメッセージ） | 不可 |

**モーダル:**

| コンポーネント | フィールド | ラベル | スタイル | 制約 |
| --- | --- | --- | --- | --- |
| `vac:rename-modal:{channelId}` | `vac:rename-vc-name-modal-input` | VC名 | Short | ― |
| `vac:limit-modal:{channelId}` | `vac:limit-modal-input` | 人数制限 | Short | 0-99（0=無制限） |

---

## VC自動削除

### トリガー

**イベント**: `voiceStateUpdate`

**発火条件:**

- VAC管理下のVCからユーザーが退出
- VCが完全に空になった

### 動作フロー

1. 退出後にVCが空であることを確認
2. VAC管理下のVCであればチャンネルを削除
3. データベースから削除

---

## /vac-config create-trigger-vc

### コマンド定義

**コマンド**: `/vac-config create-trigger-vc`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `category` | String（autocomplete） | ❌ | 作成先カテゴリ（`TOP` またはカテゴリ名）。未指定時はコマンド実行チャンネルのカテゴリ（なければTOP） |

### 動作フロー

1. 作成先カテゴリを決定（`category` 指定 or 実行チャンネルのカテゴリ or TOP）
2. 同一カテゴリ内に既存トリガーチャンネルがある場合はエラー
3. 「CreateVC」ボイスチャンネルを作成
4. トリガーチャンネルとしてデータベースに登録
5. 完了メッセージを返信（ephemeral）

**ビジネスルール:**

- トリガーチャンネルはカテゴリごとに1個まで
- 別カテゴリなら複数トリガーチャンネルを作成可能（カテゴリA、カテゴリB、TOP に各1個ずつ等）

### UI

**レスポンス（成功）:** `createSuccessEmbed` でトリガーチャンネル作成完了を通知

---

## /vac-config remove-trigger-vc

### コマンド定義

**コマンド**: `/vac-config remove-trigger-vc`

**コマンドオプション:** なし

### 動作フロー

1. データベースから現在のギルドのすべてのトリガーチャンネルを取得
2. カテゴリ名付きのセレクトメニュー（複数選択可）を ephemeral で返信
3. 「削除する」ボタン押下時:
   - 選択された各トリガーチャンネルを削除（Discord側チャンネル + DB登録解除）
   - 削除完了メッセージを ephemeral で返信

**ビジネスルール:**

- Discord側チャンネルが既に削除されている場合はエラーを無視してDB登録のみ解除
- 全選択すれば一括削除（リセット相当）が可能

### UI

**セレクトメニュー:**

| コンポーネント | プレースホルダー | 種別 | 設定 |
| --- | --- | --- | --- |
| `vac-config:trigger-remove-select` | 削除するトリガーチャンネルを選択（複数選択可） | StringSelect | `minValues: 1`, `maxValues: 設定数` |

選択肢: `#CreateVC (カテゴリ名)` 形式で表示

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `vac-config:trigger-remove-confirm` | 🗑️ | 削除する | Danger | 選択トリガーチャンネルを削除 |

**エラーケース:**

| 状況 | メッセージ |
| --- | --- |
| トリガーチャンネル未設定 | トリガーチャンネルが設定されていません。 |

---

## /vac-config view

### コマンド定義

**コマンド**: `/vac-config view`

**コマンドオプション:** なし

### 動作フロー

1. 現在のVC自動作成機能の設定を取得
2. トリガーチャンネル一覧と作成されたVC一覧を ephemeral で表示

### UI

**Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | VC自動作成機能 |
| フィールド: トリガーチャンネル | `#CreateVC (カテゴリ名)` の一覧 / 未設定 |
| フィールド: 作成されたVC | `#ユーザー名's Room (@ユーザー名)` の一覧 / なし |

---

## データモデル

### GuildVacConfig

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルドID（主キー） |
| `enabled` | Boolean | 機能の有効/無効（デフォルト: false） |
| `triggerChannelIds` | String[] | トリガーチャンネルIDのリスト（JSON配列保存） |
| `createdChannels` | VacChannelPair[] | 作成済みチャンネル情報のリスト（JSON配列保存） |

### VacChannelPair

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `voiceChannelId` | String | 作成されたボイスチャンネルID |
| `ownerId` | String | 作成者（所有者）のユーザーID |
| `createdAt` | Number | 作成日時（Unixタイムスタンプ） |

---

## 制約・制限事項

- トリガーチャンネルはカテゴリごとに1個まで
- カテゴリのチャンネル数上限: 50（Discord制限）
- デフォルト人数制限: 99
- Bot再起動時に全ギルドを確認し、DBに残っているが存在しないトリガーチャンネルや作成済みVCを自動除去。空のまま残っているVCがあれば削除する
- `channelDelete` イベントでトリガーチャンネル・作成済みVCの自動登録解除
- リセットコマンドは不要（`/vac-config remove-trigger-vc` で全選択により一括削除可能。作成済みVCは空室時に自動削除される）

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/vac.ts`

キー命名規則は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「翻訳キー命名規則」を参照。

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `vac-config.description` | コマンド説明 | VC自動作成機能の設定（サーバー管理権限が必要） | Configure voice auto-create feature (Manage Server) |
| `vac-config.create-trigger-vc.description` | サブコマンド説明 | トリガーチャンネルを作成 | Create trigger channel |
| `vac-config.create-trigger-vc.category.description` | オプション説明 | 作成先カテゴリ（TOP またはカテゴリ。未指定時は実行カテゴリ） | Destination category (TOP or category; defaults to current category) |
| `vac-config.remove-trigger-vc.description` | サブコマンド説明 | トリガーチャンネルを削除 | Remove trigger channel |
| `vac-config.remove-trigger-vc.category.description` | レガシー（未使用） | 削除対象（TOP またはカテゴリ。未指定時は実行カテゴリ） | Target category (TOP or category; defaults to current category) |
| `vac-config.remove-trigger-vc.category.top` | レガシー（未使用） | TOP（カテゴリなし） | TOP (no category) |
| `vac-config.view.description` | サブコマンド説明 | 現在の設定を表示 | Show current settings |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.trigger_created` | トリガー作成成功 | トリガーチャンネル {{channel}} を作成しました。 | Created trigger channel {{channel}} |
| `user-response.trigger_removed` | トリガー削除成功（単数） | トリガーチャンネル {{channel}} を削除しました。 | Removed trigger channel {{channel}} |
| `user-response.triggers_removed` | トリガー削除成功（複数） | {{count}}件のトリガーチャンネルを削除しました。 | Removed {{count}} trigger channel(s). |
| `user-response.renamed` | VC名変更成功 | VC名を {{name}} に変更しました。 | VC name has been changed to {{name}} |
| `user-response.limit_changed` | 人数制限変更成功 | 人数制限を {{limit}} に設定しました。 | User limit has been set to {{limit}} |
| `user-response.members_moved` | AFK移動成功 | {{channel}} へ移動しました。 | Moved to {{channel}}. |
| `user-response.panel_refreshed` | パネル再送信成功 | パネルを最下部に移動しました。 | Panel moved to the bottom |
| `user-response.unlimited` | 無制限表示 | 無制限 | unlimited |
| `user-response.not_configured` | 未設定エラー | VC自動作成機能が設定されていません。 | Voice auto-create feature is not configured. |
| `user-response.trigger_not_found` | トリガー不在エラー | 指定されたカテゴリーにはトリガーチャンネルはありません。 | There is no trigger channel in the specified category. |
| `user-response.already_exists` | トリガー重複エラー | トリガーチャンネルが既に存在します。 | A trigger channel already exists. |
| `user-response.category_full` | カテゴリ満杯エラー | カテゴリ内のチャンネル数が上限に達しています。 | The category has reached the channel limit. |
| `user-response.no_permission` | 権限不足エラー | チャンネルを作成または編集する権限がありません。 | Missing permission to create or edit channels. |
| `user-response.not_in_vc` | VC未参加エラー（パネル） | このVCに参加しているユーザーのみ操作できます。 | Only users currently in this VC can use this action. |
| `user-response.not_in_any_vc` | VC未参加エラー（コマンド） | このコマンドはVC参加中にのみ使用できます。 | This command can only be used while in a VC. |
| `user-response.not_vac_channel` | VAC管理外エラー | このVCは自動作成チャンネルではありません。 | This VC is not managed by auto-create feature. |
| `user-response.name_required` | VC名未入力エラー | VC名を入力してください。 | Please enter a VC name. |
| `user-response.limit_out_of_range` | 人数制限範囲エラー | 人数制限は0〜99の範囲で指定してください。 | User limit must be between 0 and 99. |
| `user-response.afk_move_failed` | AFK移動失敗 | AFK チャンネルへの移動に失敗しました。対象ユーザーがVCから退出した可能性があります。 | Failed to move to AFK channel. The target user(s) may have left the VC. |

### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.success` | 設定成功タイトル | 設定完了 | Settings Updated |
| `embed.title.remove_error` | 削除エラータイトル | 削除エラー | Removal Error |
| `embed.title.config_view` | 設定表示タイトル | VC自動作成機能 | Voice Auto-Create |
| `embed.field.name.trigger_channels` | トリガーチャンネルフィールド名 | トリガーチャンネル | Trigger channels |
| `embed.field.name.created_vcs` | 作成VC数フィールド名 | 作成されたVC数 | Created VC count |
| `embed.field.name.created_vc_details` | 作成VC詳細フィールド名 | 作成されたVC | Created VCs |
| `embed.field.value.not_configured` | 未設定値 | 未設定 | Not configured |
| `embed.field.value.no_created_vcs` | 作成VCなし値 | なし | None |
| `embed.field.value.top` | TOPカテゴリ値 | TOP | TOP |
| `embed.title.panel` | 操作パネルタイトル | ボイスチャンネル操作パネル | Voice Channel Control Panel |
| `embed.description.panel` | 操作パネル説明 | このパネルからVCの設定を変更できます。 | You can change VC settings from this panel. |

### UIラベル

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ui.select.trigger_remove_placeholder` | トリガー削除セレクトメニュープレースホルダー | 削除するトリガーチャンネルを選択（複数選択可） | Select trigger channels to remove (multiple) |
| `ui.button.trigger_remove_confirm` | トリガー削除確認ボタン | 削除する | Delete |
| `ui.button.rename` | VC名変更ボタン | VC名を変更 | Change VC Name |
| `ui.button.limit` | 人数制限ボタン | 人数制限を変更 | Change User Limit |
| `ui.modal.limit_placeholder` | 人数制限プレースホルダー | 0〜99（0: 無制限） | 0–99 (0: unlimited) |
| `ui.button.afk` | AFK移動ボタン | メンバーをAFKに移動 | Move Members to AFK |
| `ui.button.refresh` | パネル再送信ボタン | パネルを最下部に移動 | Move Panel to Bottom |

### ログ

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.startup_cleanup_stale_trigger_removed` | 起動クリーンアップ: 不正トリガー除去 | 起動クリーンアップ: 不正トリガーチャンネルを除去 GuildId: {{guildId}} ChannelId: {{channelId}} | Startup cleanup: removed stale trigger channel GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.startup_cleanup_orphaned_channel_removed` | 起動クリーンアップ: 孤立チャンネル除去 | 起動クリーンアップ: 存在しないVACチャンネルをDB削除 GuildId: {{guildId}} ChannelId: {{channelId}} | Startup cleanup: removed orphaned VAC channel from DB GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.startup_cleanup_empty_channel_deleted` | 起動クリーンアップ: 空VC削除 | 起動クリーンアップ: 空VACチャンネルを削除 GuildId: {{guildId}} ChannelId: {{channelId}} | Startup cleanup: deleted empty VAC channel GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.startup_cleanup_done` | 起動クリーンアップ完了 | 起動クリーンアップ完了 トリガー {{removedTriggers}} 件・チャンネル {{removedChannels}} 件を削除 | Startup cleanup done: removed {{removedTriggers}} triggers and {{removedChannels}} channels |
| `log.startup_cleanup_done_none` | 起動クリーンアップ完了（不整合なし） | 起動クリーンアップ完了 不整合なし | Startup cleanup done No inconsistencies found |
| `log.voice_state_update_failed` | voiceStateUpdate処理失敗 | voiceStateUpdate処理失敗 | Failed to process voiceStateUpdate |
| `log.channel_created` | VC作成ログ | VCチャンネル作成 GuildId: {{guildId}} ChannelId: {{channelId}} OwnerId: {{ownerId}} | channel created GuildId: {{guildId}} ChannelId: {{channelId}} OwnerId: {{ownerId}} |
| `log.channel_deleted` | VC削除ログ | VCチャンネル削除 GuildId: {{guildId}} ChannelId: {{channelId}} | channel deleted GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.category_full` | カテゴリ満杯ログ | カテゴリがチャンネル上限に達しました。 GuildId: {{guildId}} CategoryId: {{categoryId}} | category reached channel limit GuildId: {{guildId}} CategoryId: {{categoryId}} |
| `log.trigger_removed_by_delete` | トリガー削除検知ログ | 削除されたトリガーチャンネルを設定から除外 GuildId: {{guildId}} ChannelId: {{channelId}} | removed deleted trigger channel from config GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.channel_delete_sync_failed` | channelDelete同期失敗 | channelDelete同期処理失敗 | Failed to sync config on channelDelete |
| `log.panel_send_failed` | パネル送信失敗 | 操作パネル送信失敗 | Failed to send control panel |
| `log.startup_cleanup_failed` | 起動クリーンアップ失敗 | 起動時クリーンアップ失敗 | Startup cleanup failed |
| `log.database_trigger_added` | DBトリガー追加ログ | VACトリガーチャンネルを追加 GuildId: {{guildId}} ChannelId: {{channelId}} | VAC trigger channel added GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.database_trigger_add_failed` | DBトリガー追加失敗 | VACトリガーチャンネル追加に失敗 GuildId: {{guildId}} ChannelId: {{channelId}} | Failed to add VAC trigger channel GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.database_trigger_removed` | DBトリガー削除ログ | VACトリガーチャンネルを削除 GuildId: {{guildId}} ChannelId: {{channelId}} | VAC trigger channel removed GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.database_trigger_remove_failed` | DBトリガー削除失敗 | VACトリガーチャンネル削除に失敗 GuildId: {{guildId}} ChannelId: {{channelId}} | Failed to remove VAC trigger channel GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.database_channel_registered` | DB管理チャンネル登録ログ | VAC管理チャンネルを登録 GuildId: {{guildId}} ChannelId: {{voiceChannelId}} | VAC managed channel registered GuildId: {{guildId}} ChannelId: {{voiceChannelId}} |
| `log.database_channel_register_failed` | DB管理チャンネル登録失敗 | VAC管理チャンネル登録に失敗 GuildId: {{guildId}} ChannelId: {{voiceChannelId}} | Failed to register VAC managed channel GuildId: {{guildId}} ChannelId: {{voiceChannelId}} |
| `log.database_channel_unregistered` | DB管理チャンネル削除ログ | VAC管理チャンネルを削除 GuildId: {{guildId}} ChannelId: {{voiceChannelId}} | VAC managed channel unregistered GuildId: {{guildId}} ChannelId: {{voiceChannelId}} |
| `log.database_channel_unregister_failed` | DB管理チャンネル削除失敗 | VAC管理チャンネル削除に失敗 GuildId: {{guildId}} ChannelId: {{voiceChannelId}} | Failed to unregister VAC managed channel GuildId: {{guildId}} ChannelId: {{voiceChannelId}} |

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildConfigRepository | VAC設定の取得・更新 |
| AFK機能 | 操作パネルのAFK移動ボタンでAFKチャンネルを参照 |

---

## テストケース

### ユニットテスト

- [x] create-trigger-vc: カテゴリ指定・TOP指定・未指定、カテゴリ単位制約、成功メッセージ
- [x] remove-trigger-vc: カテゴリ指定・TOP指定・未指定、対象不在時の処理
- [x] view: 設定表示、未設定表示
- [x] VC自動作成: トリガー検知、VC作成、権限付与、パネル設置、自動移動、DB保存、Bot権限不足時のエラーチャンネル通知
- [x] VC自動削除: 空室検知、VC削除、DB削除
- [x] 操作パネル: VC名変更、人数制限変更、AFK移動、パネル再送信、VC未参加拒否
- [x] channelDelete: トリガー削除検知、自動登録解除
- [x] Bot再起動: 空VC検知・クリーンアップ、DB同期、トリガー同期

### インテグレーションテスト

- [x] データベース連携（VAC設定の保存・取得・更新・削除）

---

## 参考リソース

- [VC_COMMAND_SPEC.md](VC_COMMAND_SPEC.md) - VC操作コマンド仕様（名前変更・人数制限変更）
- [AFK_SPEC.md](AFK_SPEC.md) - AFK機能仕様（AFK移動機能で使用）
