# メンバーログ機能 - 仕様書

> Member Log - メンバー参加・脱退時のログ機能

最終更新: 2026年3月22日（ローカライズセクションを実装に合わせて更新）

---

## 概要

サーバーにメンバーが参加・退出した際に、指定されたチャンネルに通知メッセージとメンバー情報パネルを表示し、メンバーの出入りを把握できるようにする機能です。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| メンバー参加通知 | `guildMemberAdd` イベントで参加情報・招待経路をEmbed通知 |
| メンバー退出通知 | `guildMemberRemove` イベントで退出情報・滞在期間をEmbed通知 |
| set-channel | 通知チャンネルを設定 |
| enable | メンバーログ機能を有効化 |
| disable | メンバーログ機能を無効化 |
| set-join-message | カスタム参加メッセージを設定（モーダル入力） |
| set-leave-message | カスタム退出メッセージを設定（モーダル入力） |
| clear-join-message | カスタム参加メッセージを削除 |
| clear-leave-message | カスタム退出メッセージを削除 |
| view | 現在の設定を表示 |
| reset | 確認ダイアログ付きでメンバーログ設定をリセット |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者 | ManageGuild | 全サブコマンドの実行（コマンドレベルで制御） |
| Bot | ViewChannel, SendMessages, EmbedLinks | 通知チャンネルへのEmbed送信 |
| Bot | ManageGuild | 招待リンク追跡（なければ招待元「不明」表示） |

### 共通ビジネスルール（参加・退出通知）

| エラー | 対応 |
| --- | --- |
| チャンネルが削除された | 通知をスキップ、ログに記録 |
| Bot権限不足 | メッセージ送信失敗、エラーチャンネルへ通知（[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照） |
| メンバー情報取得失敗 | 基本情報のみで通知、エラーログ記録 |
| 招待情報取得失敗 | 招待元を「不明」として表示、通知は継続（エラーログ記録しない） |
| レート制限 | キュー処理で順次送信 |

---

## メンバー参加通知

### トリガー

**イベント**: `guildMemberAdd`

**発火条件:**

- メンバーログ機能が有効
- 通知チャンネルが設定済み

### 動作フロー

1. 機能が有効かチェック
2. 通知チャンネルを取得
3. メンバー情報を収集（ユーザー名・ID・アイコン・アカウント作成日・現在のメンバー数）
4. 招待情報を取得（招待リンク・招待者）
5. Embedを生成
6. 通知チャンネルに送信
7. ログに記録

**ビジネスルール:**

- カスタム参加メッセージが設定されている場合、プレースホルダーを展開してプレーンテキスト（`content`）として Embed と一緒に送信する
- アカウント作成日時は `date-fns` の `intervalToDuration` で年・月・日単位に算出し、`<t:timestamp:f>(x年xヶ月x日)` 形式で表示する（0の単位は省略、例: `3ヶ月5日`）
- 招待リンクの特定はキャッシュとの差分比較で行う。Bot起動時に各サーバーの招待一覧（コード→使用回数）をメモリにキャッシュし、`guildMemberAdd` 発火時に再取得して使用回数が増えたリンクを特定する
- 招待情報が取得できない場合は招待元フィールドを「不明」として表示し、通知自体は継続（エラーログ記録しない。権限なしは正常ケース扱い）
- 招待元の表示形式: ユーザー → `discord.gg/XXXXX（<@userId>）` / サービスBot → `discord.gg/XXXXX（サービス名）` / 特定不可 → `不明`

### UI

**Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | 👋 新しいメンバーが参加しました！ |
| カラー | ビリジアン（`#008969`） |
| サムネイル | ユーザーアイコン画像 |
| フィールド: ユーザー | `<@userId>` |
| フィールド: アカウント作成日時 | `2020年12月23日 21:36(5年3ヶ月7日)` 形式 |
| フィールド: サーバー参加日時 | Discord `:f` フォーマット（取得可能な場合のみ） |
| フィールド: 招待元 | `discord.gg/XXXXX（<@userId>）` / `discord.gg/XXXXX（サービス名）` / `不明` |
| フィールド: メンバー数 | 参加後の現在メンバー数 |
| フッター | なし（タイムスタンプのみ） |

---

## メンバー退出通知

### トリガー

**イベント**: `guildMemberRemove`

**発火条件:**

- メンバーログ機能が有効
- 通知チャンネルが設定済み

### 動作フロー

1. 機能が有効かチェック
2. 通知チャンネルを取得
3. メンバー情報を収集（ユーザー名・ID・アイコン・アカウント作成日・サーバー参加日・滞在期間・現在のメンバー数）
4. Embedを生成
5. 通知チャンネルに送信
6. ログに記録

**ビジネスルール:**

- `guildMemberRemove` 発火時点では Discord から `PartialGuildMember` が渡される場合があり、ユーザー情報（アイコン・アカウント作成日時など）が `null` になることがある。その場合は該当フィールドを省略する
- カスタム退出メッセージが設定されている場合、プレースホルダーを展開してプレーンテキスト（`content`）として Embed と一緒に送信する
- 滞在期間は `date-fns` の `intervalToDuration` で年・月・日単位に算出する（0の単位は省略、例: `3年5日`）。参加日時が取得できない場合は「不明」と表示する

### UI

**Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | 👋 メンバーが退出しました |
| カラー | 茜色（`#b7282d`） |
| サムネイル | ユーザーアイコン画像（取得可能な場合のみ） |
| フィールド: ユーザー | `<@userId>` |
| フィールド: アカウント作成日時 | `2020年12月23日 21:36(5年3ヶ月7日)` 形式（取得可能な場合のみ） |
| フィールド: サーバー参加日時 | Discord `:f` フォーマット（取得可能な場合のみ） |
| フィールド: サーバー退出日時 | Discord `:f` フォーマット |
| フィールド: 滞在期間 | `x年xヶ月x日` 形式（0の単位は省略、参加日時取得不可の場合は「不明」） |
| フィールド: メンバー数 | 退出後の現在メンバー数 |
| フッター | なし（タイムスタンプのみ） |

---

## /member-log-config set-channel

### コマンド定義

**コマンド**: `/member-log-config set-channel`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | Channel（テキストチャンネル） | ✅ | 通知を送信するテキストチャンネル |

### 動作フロー

1. Bot権限チェック: `ViewChannel`, `SendMessages`, `EmbedLinks`
2. チャンネルを設定に保存
3. 完了メッセージを返信（ephemeral）

### UI

**レスポンス（成功）:** `createSuccessEmbed` でチャンネル設定完了を通知

---

## /member-log-config enable

### コマンド定義

**コマンド**: `/member-log-config enable`

**コマンドオプション:** なし

### 動作フロー

1. チャンネルが設定済みかチェック（未設定の場合はエラー）
2. 機能を有効化
3. 完了メッセージを返信（ephemeral）

**ビジネスルール:**

- チャンネルが未設定の場合はエラーメッセージを返す

### UI

**レスポンス（成功）:** `createSuccessEmbed` で有効化完了を通知

---

## /member-log-config disable

### コマンド定義

**コマンド**: `/member-log-config disable`

**コマンドオプション:** なし

### 動作フロー

1. 機能を無効化
2. 完了メッセージを返信（ephemeral）

### UI

**レスポンス（成功）:** `createSuccessEmbed` で無効化完了を通知

---

## /member-log-config set-join-message

### コマンド定義

**コマンド**: `/member-log-config set-join-message`

**コマンドオプション:** なし（モーダル入力）

### 動作フロー

1. モーダルを表示
2. ユーザーがメッセージを入力して送信
3. カスタム参加メッセージを保存
4. 完了メッセージを返信（ephemeral）

### UI

**モーダル:**

| フィールド | ラベル | スタイル | 必須 | 制約 |
| --- | --- | --- | --- | --- |
| `member-log-config:join-message-modal-input` | 参加メッセージ | Paragraph | ✅ | 最大500文字 |

使用可能なプレースホルダー:

- `{userMention}`: ユーザーメンション（`<@userId>` 形式）
- `{userName}`: ユーザー名
- `{memberCount}`: メンバー数
- `{serverName}`: サーバー名

---

## /member-log-config set-leave-message

### コマンド定義

**コマンド**: `/member-log-config set-leave-message`

**コマンドオプション:** なし（モーダル入力）

### 動作フロー

1. モーダルを表示
2. ユーザーがメッセージを入力して送信
3. カスタム退出メッセージを保存
4. 完了メッセージを返信（ephemeral）

### UI

**モーダル:**

| フィールド | ラベル | スタイル | 必須 | 制約 |
| --- | --- | --- | --- | --- |
| `member-log-config:leave-message-modal-input` | 退出メッセージ | Paragraph | ✅ | 最大500文字 |

使用可能なプレースホルダーは参加メッセージと同じ。

---

## /member-log-config clear-join-message

### コマンド定義

**コマンド**: `/member-log-config clear-join-message`

**コマンドオプション:** なし

### 動作フロー

1. 設定済みのカスタム参加メッセージを削除し、メッセージなし状態に戻す
2. 完了メッセージを返信（ephemeral）

### UI

**レスポンス（成功）:** `createSuccessEmbed` で削除完了を通知

---

## /member-log-config clear-leave-message

### コマンド定義

**コマンド**: `/member-log-config clear-leave-message`

**コマンドオプション:** なし

### 動作フロー

1. 設定済みのカスタム退出メッセージを削除し、メッセージなし状態に戻す
2. 完了メッセージを返信（ephemeral）

### UI

**レスポンス（成功）:** `createSuccessEmbed` で削除完了を通知

---

## /member-log-config view

### コマンド定義

**コマンド**: `/member-log-config view`

**コマンドオプション:** なし

### 動作フロー

1. 現在の設定状態を取得
2. 設定内容を ephemeral で表示

### UI

**Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | メンバーログ機能 |
| フィールド: 状態 | 有効 / 無効 |
| フィールド: 通知チャンネル | #channel / 未設定 |
| フィールド: カスタム参加メッセージ | メッセージ内容 / 未設定 |
| フィールド: カスタム退出メッセージ | メッセージ内容 / 未設定 |

---

## /member-log-config reset

### コマンド定義

**コマンド**: `/member-log-config reset`

**コマンドオプション:** なし

### 動作フロー

1. `createWarningEmbed` で確認ダイアログ Embed + ボタンを ephemeral で送信
2. 「リセットする」ボタン押下 → 設定をデフォルト状態に戻す → 完了メッセージに `update()`
3. 「キャンセル」ボタン押下 / 60秒タイムアウト → キャンセルメッセージに `update()`

**ビジネスルール:**

- リセット後のデフォルト状態: `enabled: false`、`channelId: null`、`joinMessage: null`、`leaveMessage: null`
- 設定が存在しない場合でもリセット操作は成功扱い（冪等）

### UI

**Embed（確認ダイアログ）:** `createWarningEmbed` を使用

| 項目 | 内容 |
| --- | --- |
| タイトル | メンバーログ設定リセット確認 |
| 説明 | メンバーログ設定をリセットしますか？\n以下の設定が削除されます。この操作は元に戻せません。 |
| フィールド | 削除対象: 有効/無効設定 / 通知チャンネル / カスタム参加メッセージ / カスタム退出メッセージ |

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `member-log-config:reset-confirm` | 🗑️ | リセットする | Danger | 設定をリセットして完了メッセージに更新 |
| `member-log-config:reset-cancel` | ❌ | キャンセル | Secondary | キャンセルメッセージに更新 |

---

## データモデル

### GuildMemberLogConfig

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルドID（主キー） |
| `enabled` | Boolean | 機能の有効/無効（デフォルト: false） |
| `channelId` | String? | 通知チャンネルID（未設定時は null） |
| `joinMessage` | String? | カスタム参加メッセージ（`{userMention}` / `{userName}` / `{memberCount}` / `{serverName}` 置換可） |
| `leaveMessage` | String? | カスタム退出メッセージ（`{userMention}` / `{userName}` / `{memberCount}` / `{serverName}` 置換可） |

---

## 制約・制限事項

- カスタムメッセージの最大文字数: 500文字
- `guildMemberRemove` で `PartialGuildMember` が渡された場合、ユーザー情報（アイコン・アカウント作成日時など）は省略
- 招待リンク追跡には Bot に `ManageGuild` 権限が必要（なければ「不明」表示）
- バニティURL（サーバーカスタムURL）経由の参加は検出不可
- Bot再起動直後は招待キャッシュが空のため、最初の参加者は特定できない場合がある
- 招待キャッシュはインメモリで保持されるため、Bot再起動時にリセットされる

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/memberLog.ts`

キー命名規則は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「翻訳キー命名規則」を参照。

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `member-log-config.description` | コマンド説明 | メンバーログ機能の設定（サーバー管理権限が必要） | Configure member log feature (requires Manage Server) |
| `member-log-config.set-channel.description` | サブコマンド説明 | 通知チャンネルを設定 | Set the notification channel |
| `member-log-config.set-channel.channel.description` | オプション説明 | 通知を送信するテキストチャンネル | Text channel to send notifications to |
| `member-log-config.enable.description` | サブコマンド説明 | メンバーログ機能を有効化 | Enable member log feature |
| `member-log-config.disable.description` | サブコマンド説明 | メンバーログ機能を無効化 | Disable member log feature |
| `member-log-config.set-join-message.description` | サブコマンド説明 | カスタム参加メッセージを設定 | Set a custom join message |
| `member-log-config.set-leave-message.description` | サブコマンド説明 | カスタム退出メッセージを設定 | Set a custom leave message |
| `member-log-config.clear-join-message.description` | サブコマンド説明 | カスタム参加メッセージを削除 | Clear the custom join message |
| `member-log-config.clear-leave-message.description` | サブコマンド説明 | カスタム退出メッセージを削除 | Clear the custom leave message |
| `member-log-config.view.description` | サブコマンド説明 | 現在の設定を表示 | Show current settings |
| `member-log-config.reset.description` | サブコマンド説明 | メンバーログ設定をリセット | Reset member log settings |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.set_channel_success` | チャンネル設定成功 | 通知チャンネルを {{channel}} に設定しました。 | Notification channel set to {{channel}} |
| `user-response.enable_success` | 有効化成功 | メンバーログ機能を有効化しました。 | Member log feature has been enabled |
| `user-response.enable_error_no_channel` | チャンネル未設定エラー | 通知チャンネルが設定されていません。先に /member-log-config set-channel を実行してください。 | No notification channel is configured. Run /member-log-config set-channel first. |
| `user-response.disable_success` | 無効化成功 | メンバーログ機能を無効化しました。 | Member log feature has been disabled |
| `user-response.set_join_message_success` | 参加メッセージ設定成功 | 参加メッセージを設定しました。 | Join message has been set |
| `user-response.set_leave_message_success` | 退出メッセージ設定成功 | 退出メッセージを設定しました。 | Leave message has been set |
| `user-response.clear_join_message_success` | 参加メッセージ削除成功 | 参加メッセージを削除しました。 | Join message has been cleared |
| `user-response.clear_leave_message_success` | 退出メッセージ削除成功 | 退出メッセージを削除しました。 | Leave message has been cleared |
| `user-response.text_channel_only` | チャンネル種別エラー | テキストチャンネルを指定してください。 | Please specify a text channel. |
| `user-response.channel_deleted_notice` | チャンネル削除通知 | ⚠️ メンバーログの通知チャンネルが削除されました。\n設定をリセットしたので、`/member-log-config set-channel` で再設定してください。 | ⚠️ The member log notification channel has been deleted.\nSettings have been reset. Please reconfigure with `/member-log-config set-channel`. |
| `user-response.reset_success` | リセット成功 | メンバーログ設定をリセットしました。 | Member log settings have been reset. |
| `user-response.reset_cancelled` | リセットキャンセル | リセットをキャンセルしました。 | Reset has been cancelled. |

### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.success` | 設定成功タイトル | 設定完了 | Settings Updated |
| `embed.title.config_view` | 設定表示タイトル | メンバーログ機能 | Member Log |
| `embed.description.not_configured` | 未設定説明 | メンバーログが設定されていません。 | Member log is not configured. |
| `embed.field.name.status` | 状態フィールド名 | 状態 | Status |
| `embed.field.name.channel` | チャンネルフィールド名 | 通知チャンネル | Notification Channel |
| `embed.field.name.join_message` | 参加メッセージフィールド名 | 参加メッセージ | Join Message |
| `embed.field.name.leave_message` | 退出メッセージフィールド名 | 退出メッセージ | Leave Message |
| `embed.title.join` | 参加通知タイトル | 👋 新しいメンバーが参加しました！ | 👋 A new member has joined! |
| `embed.field.name.join_username` | 参加通知: ユーザー | ユーザー | User |
| `embed.field.name.join_account_created` | 参加通知: アカウント作成日時 | アカウント作成日時 | Account Created |
| `embed.field.name.join_server_joined` | 参加通知: サーバー参加日時 | サーバー参加日時 | Joined Server At |
| `embed.field.name.join_member_count` | 参加通知: メンバー数 | メンバー数 | Member Count |
| `embed.field.name.join_invited_by` | 参加通知: 招待元 | 招待元 | Invite Source |
| `embed.title.leave` | 退出通知タイトル | 👋 メンバーが退出しました。 | 👋 A member has left |
| `embed.field.name.leave_username` | 退出通知: ユーザー | ユーザー | User |
| `embed.field.name.leave_account_created` | 退出通知: アカウント作成日時 | アカウント作成日時 | Account Created |
| `embed.field.name.leave_server_joined` | 退出通知: サーバー参加日時 | サーバー参加日時 | Joined Server At |
| `embed.field.name.leave_server_left` | 退出通知: サーバー退出日時 | サーバー退出日時 | Left Server At |
| `embed.field.name.leave_stay_duration` | 退出通知: 滞在期間 | 滞在期間 | Stay Duration |
| `embed.field.name.leave_member_count` | 退出通知: メンバー数 | メンバー数 | Member Count |
| `embed.field.value.days` | 日数フォーマット | {{count}}日 | {{count}} days |
| `embed.field.value.member_count` | メンバー数フォーマット | {{count}}名 | {{count}} members |
| `embed.field.value.unknown` | 不明表示 | 不明 | Unknown |
| `embed.field.value.age_years` | 経過年数 | {{count}}年 | {{count}}yr |
| `embed.field.value.age_months` | 経過月数 | {{count}}ヶ月 | {{count}}mo |
| `embed.field.value.age_days` | 経過日数 | {{count}}日 | {{count}}d |
| `embed.field.value.age_separator` | 経過年齢区切り | （空文字） | （スペース） |
| `embed.title.reset_confirm` | リセット確認タイトル | メンバーログ設定リセット確認 | Member Log Settings Reset |
| `embed.description.reset_confirm` | リセット確認説明 | メンバーログ設定をリセットしますか？\n以下の設定が削除されます。この操作は元に戻せません。 | Reset member log settings?\nThe following settings will be deleted. This action cannot be undone. |
| `embed.field.name.reset_target` | 削除対象フィールド名 | 削除対象 | Targets |
| `embed.field.value.reset_target` | 削除対象フィールド値 | 有効/無効設定 / 通知チャンネル / カスタム参加メッセージ / カスタム退出メッセージ | Enabled/Disabled / Notification Channel / Custom Join Message / Custom Leave Message |

### UIラベル

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ui.modal.set_join_message_title` | 参加メッセージモーダルタイトル | 参加メッセージを設定 | Set Join Message |
| `ui.modal.set_join_message_label` | 参加メッセージ入力ラベル | 参加メッセージ | Join message |
| `ui.modal.set_join_message_placeholder` | 参加メッセージプレースホルダー | {userMention}, {userName}, {memberCount}, {serverName} を使用可（最大500文字） | Supports {userMention}, {userName}, {memberCount}, {serverName} (max 500 characters) |
| `ui.modal.set_leave_message_title` | 退出メッセージモーダルタイトル | 退出メッセージを設定 | Set Leave Message |
| `ui.modal.set_leave_message_label` | 退出メッセージ入力ラベル | 退出メッセージ | Leave message |
| `ui.modal.set_leave_message_placeholder` | 退出メッセージプレースホルダー | {userMention}, {userName}, {memberCount}, {serverName} を使用可（最大500文字） | Supports {userMention}, {userName}, {memberCount}, {serverName} (max 500 characters) |
| `ui.button.reset_confirm` | リセット確認ボタン | リセットする | Reset |
| `ui.button.reset_cancel` | リセットキャンセルボタン | キャンセル | Cancel |

### ログ

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.join_notification_sent` | 参加通知送信ログ | 参加通知を送信 GuildId: {{guildId}} UserId: {{userId}} | join notification sent GuildId: {{guildId}} UserId: {{userId}} |
| `log.leave_notification_sent` | 退出通知送信ログ | 退出通知を送信 GuildId: {{guildId}} UserId: {{userId}} | leave notification sent GuildId: {{guildId}} UserId: {{userId}} |
| `log.notification_failed` | 通知送信失敗ログ | 通知送信失敗 GuildId: {{guildId}} | failed to send notification GuildId: {{guildId}} |
| `log.channel_not_found` | チャンネル不在ログ | チャンネルが見つかりません。 GuildId: {{guildId}} ChannelId: {{channelId}} | channel not found GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.channel_deleted_config_cleared` | チャンネル削除検知ログ | チャンネルが削除されたため設定をリセットしました。 GuildId: {{guildId}} ChannelId: {{channelId}} | channel deleted, config cleared GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.config_set_channel` | チャンネル設定ログ | チャンネル設定 GuildId: {{guildId}} ChannelId: {{channelId}} | channel configured GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.config_enabled` | 有効化ログ | 有効化 GuildId: {{guildId}} | enabled GuildId: {{guildId}} |
| `log.config_disabled` | 無効化ログ | 無効化 GuildId: {{guildId}} | disabled GuildId: {{guildId}} |
| `log.config_join_message_set` | 参加メッセージ設定ログ | 参加メッセージ設定 GuildId: {{guildId}} | join message set GuildId: {{guildId}} |
| `log.config_leave_message_set` | 退出メッセージ設定ログ | 退出メッセージ設定 GuildId: {{guildId}} | leave message set GuildId: {{guildId}} |
| `log.config_join_message_cleared` | 参加メッセージ削除ログ | 参加メッセージ削除 GuildId: {{guildId}} | join message cleared GuildId: {{guildId}} |
| `log.config_leave_message_cleared` | 退出メッセージ削除ログ | 退出メッセージ削除 GuildId: {{guildId}} | leave message cleared GuildId: {{guildId}} |
| `log.database_user_setting_find_failed` | DB取得失敗ログ | ユーザー設定取得に失敗 UserId: {{userId}} GuildId: {{guildId}} | Failed to find user setting UserId: {{userId}} GuildId: {{guildId}} |
| `log.database_user_setting_upsert_failed` | DB保存失敗ログ | ユーザー設定保存に失敗 UserId: {{userId}} GuildId: {{guildId}} | Failed to upsert user setting UserId: {{userId}} GuildId: {{guildId}} |
| `log.config_reset` | リセットログ | 設定リセット GuildId: {{guildId}} | settings reset GuildId: {{guildId}} |

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildConfigRepository | メンバーログ設定の取得・更新 |
| InviteTracker | 招待リンクのキャッシュ・差分比較 |
| date-fns | アカウント経過年齢・滞在期間の算出 |

---

## テストケース

### ユニットテスト

- [x] Embed生成
- [x] メッセージフォーマット
- [x] 滞在期間計算
- [x] 設定コマンド各種

### インテグレーションテスト

- [x] guildMemberAddイベント処理
- [x] guildMemberRemoveイベント処理
- [x] チャンネル権限チェック
- [x] Bot権限不足時のエラーチャンネル通知
- [x] カスタムメッセージ展開

---

## 参考リソース

- [Discord.js - GuildMemberAdd](https://discord.js.org/#/docs/discord.js/main/class/Client?scrollTo=e-guildMemberAdd)
- [Discord.js - GuildMemberRemove](https://discord.js.org/#/docs/discord.js/main/class/Client?scrollTo=e-guildMemberRemove)
- [Discord.js - EmbedBuilder](https://discord.js.org/#/docs/discord.js/main/class/EmbedBuilder)
