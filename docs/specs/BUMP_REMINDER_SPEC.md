# Bumpリマインダー機能 - 仕様書

> Disboard・ディス速のBumpリマインダー機能の詳細仕様

最終更新: 2026年3月21日

---

## 概要

DiscordサーバーのBump（宣伝）コマンドを検知し、2時間後にリマインダーを送信する機能です。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| Bump検知 | messageCreateイベントでDisboard/ディス速のBumpを検知 |
| タイマー管理 | JobScheduler + DB永続化による2時間タイマー |
| 通知登録UI（パネル） | Bump検知時にパネル表示、ユーザーが通知ON/OFFをボタンで切替 |
| リマインダー送信 | 2時間後にメンション付きリマインダーを送信 |
| `/bump-reminder-config enable` | Bumpリマインダー機能を有効化 |
| `/bump-reminder-config disable` | Bumpリマインダー機能を無効化 |
| `/bump-reminder-config set-mention` | メンションロールを設定 |
| `/bump-reminder-config remove-mention` | メンションロール設定を削除 |
| `/bump-reminder-config remove-mention-users` | 通知登録ユーザーを選択して削除 |
| `/bump-reminder-config view` | 現在の設定状態を表示 |
| `/bump-reminder-config reset` | Bumpリマインダー設定をリセット |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者（`/bump-reminder-config`） | ManageGuild | 設定コマンドの実行 |
| Bot | SendMessages | リマインダー送信・パネル表示 |

> Bot に上記の権限が不足している場合、リマインダー送信やパネル表示の失敗時はエラーチャンネルへ通知します。詳細は [MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) を参照。

### 対応サービス

| サービス名             | コマンド | Bot ID               | URL                   |
| ---------------------- | -------- | -------------------- | --------------------- |
| **Disboard**           | `/bump`  | `302050872383242240` | https://disboard.org/ |
| **ディス速 (Dissoku)** | `/up`    | `761562078095867916` | https://dissoku.net/  |

### デフォルト動作

**Bumpリマインダー機能はデフォルトで有効です。**

- 新規サーバーでは初期状態で機能が有効化されています
- `/bump` または `/up` コマンドを検知すると自動でリマインダーが設定されます
- 無効化するには `/bump-reminder-config disable` を実行してください

### 自動クリーンアップ

- ロールが削除された場合、DBの `mentionRoleId` を自動的に消去する（`roleDelete` イベント）
- ユーザーがサーバーを退出した場合、DBの `mentionUserIds` から該当ユーザーを自動的に削除する（`guildMemberRemove` イベント）

---

## Bump検知

### トリガー

**イベント**: messageCreate

**発火条件:**

- メッセージの送信者がBumpBot（Disboard ID: `302050872383242240` or ディス速 ID: `761562078095867916`）
- `message.interaction?.commandName` が Disboard では `bump`、ディス速では `up` である
- Bumpリマインダー機能が有効化されている（デフォルトで有効）
- `channelId` が設定済みの場合は、設定チャンネル内での検知のみ有効
- `serviceName` として "Disboard" または "Dissoku" を記録

### 動作フロー

```
1. ユーザーが /bump または /up を実行
   ↓
2. Disboard/ディス速がBump成功メッセージを送信
   ↓
3. messageCreateイベントで検知
  - Bot ID（302050872383242240 or 761562078095867916）を確認
  - `interaction.commandName` が Disboard なら `bump`、ディス速なら `up` か確認
   - serviceName を特定（"Disboard" or "Dissoku"）
   - GuildConfig の enabled を確認（デフォルト true）
  - channelId が設定されている場合は一致チャンネルのみ処理
   ↓
4. BumpReminderManager.setReminder() 実行
   - BumpReminderテーブルに保存（status: "pending"）
  - guildId, channelId, messageId, panelMessageId, serviceName, scheduledAt を記録
  - JobScheduler（setTimeoutベース）でタイマー設定
   ↓
5. 2時間経過
   - タイマー発火
   - taskFactory 実行:
     a. GuildConfig から最新の設定を取得（enabled, mentionRoleId, mentionUserIds）
     b. enabled が false なら送信せずに終了
     c. メンション文字列を構築
     d. serviceName に応じたメッセージを選択
     e. チャンネルにメッセージ送信（元メッセージに返信）
   - BumpReminderテーブルの status を "sent" に更新
```

**ビジネスルール:**

- **データベース更新タイミング:**
  - **Bump検知時**: BumpReminder レコード作成（status: "pending"）
  - **リマインダー送信後**: status を "sent" に更新
  - **disable コマンド実行時**: 該当ギルドの pending レコードを "cancelled" に更新
- **設定変更の即時反映:** リマインダー送信時に最新の設定を取得するため、Bump検知後に設定変更しても送信内容に反映されます。
- **重複防止:** 新しいBump検知時に、同じギルドの既存pendingリマインダーを自動的にキャンセルします。通常運用では Disboard/Dissoku の2時間制限により重複は発生しないため、Bot再起動時のエッジケース対策として機能します。

---

## タイマー管理

### トリガー

**イベント**: Bump検知後に `BumpReminderManager.setReminder()` を実行

### 動作フロー

**JobSchedulerの動作:**

1. **データベースに保存**: BumpReminderテーブルに `pending` ステータスで保存

- guildId, channelId, messageId, panelMessageId, serviceName, scheduledAt, status

2. **1回実行ジョブを登録**: `setTimeout` ベースで指定時刻にタスクを実行
3. **実行後にステータス更新**: `sent` または `cancelled` に変更

**ビジネスルール:**

- **メンション構築ロジック:** メンションがある場合は `{メンション文字列}\n{リマインダーメッセージ}` の形式で連結し、メンションがない場合はリマインダーメッセージのみを送信します（空行を入れない）。
- **serviceName の活用:** Bump検知時に `Disboard` または `Dissoku` を記録し、DBに保存します。リマインダー送信時にこの値を参照してサービス別のメッセージを選択します（どちらでもない場合は汎用メッセージにフォールバック）。

### Bot再起動時の復元

**実装場所**: `src/bot/events/clientReady.ts`

起動時に `pending` ステータスのリマインダーを全て取得し、以下を行います：

- 同一ギルドの重複pendingを最新1件へ整理
- 期限超過分を即時実行
- 未来分を再スケジュール

**復元の特徴:**

- **DB駆動**: メモリ上のタイマーは消失するが、DBの `pending` レコードから完全復元
- **過去時刻の処理**: Bot停止中に通知時刻を過ぎた場合でも即座に通知
- **serviceName保持**: Disboard/Dissoku のどちらか正しいメッセージを送信

---

## 通知登録UI（パネル）

### トリガー

**イベント**: Bump検知成功後にパネルメッセージを自動送信

### 動作フロー

1. Bump検知時にパネルメッセージ（Embed + ボタン）を送信
2. ユーザーがボタンで通知ON/OFFを切替
3. リマインダー送信後にパネルを自動削除

**ビジネスルール:**

- パネルメッセージはサービス（Disboard/Dissoku）ごとに管理（各サービス最大1つ）
- 新しいBump検知時に同サービスの前のパネルを削除し、新しいパネルを送信
- リマインダー送信後にパネルを自動削除
- ユーザーはリマインダー送信前であればボタンから通知ON/OFFを切り替え可能

### UI

**Embed:**

<table border="1" cellpadding="8" width="420">
<tr><th align="left">ℹ️ Bumpリマインダー機能</th></tr>
<tr><td>
54分後にリマインドが通知されます。<br>
（Discordの相対タイムスタンプ形式で表示）
</td></tr>
<tr><td><kbd>🔔 ユーザー通知をONにする</kbd> <kbd>🔕 ユーザー通知をOFFにする</kbd></td></tr>
</table>

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `bump-reminder:mention-on:<guildId>` | 🔔 | ユーザー通知をONにする | Primary | ユーザーのBump通知を有効化（冪等） |
| `bump-reminder:mention-off:<guildId>` | 🔕 | ユーザー通知をOFFにする | Secondary | ユーザーのBump通知を無効化（冪等） |

- `🔔 ユーザー通知をONにする`: ユーザーのBump通知を有効化（冪等）
  - 未登録 → 登録（エフェメラル返答:「通知をONにしました。」）
  - 登録済み → 何もせず成功扱い（エフェメラル返答:「通知をONにしました。」）
- `🔕 ユーザー通知をOFFにする`: ユーザーのBump通知を無効化（冪等）
  - 登録済み → 解除（エフェメラル返答:「通知をOFFにしました。」）
  - 未登録 → 何もせず成功扱い（エフェメラル返答:「通知をOFFにしました。」）

---

## リマインダー送信

### トリガー

**イベント**: タイマー発火（Bump検知から2時間後）

### 動作フロー

1. GuildConfig から最新の設定を取得
2. enabled が false なら送信せずに終了
3. メンション文字列を構築
4. serviceName に応じたメッセージを選択
5. チャンネルにメッセージ送信（元メッセージに返信）
6. BumpReminderテーブルの status を "sent" に更新

**ビジネスルール:**

- **通知対象:**
  1. 設定されたメンションロール（`mentionRoleId`）
  2. 設定されたメンションユーザー（`mentionUserIds`）
- **サービス別メッセージ**: DisboardとDissokuで異なるメッセージ
- **設定の動的取得**: リマインダー送信時に最新の設定を取得（Bump検知後の設定変更も反映）

### UI

**メッセージ例:**

```
# メンションなしの場合
⏰ `/bump`が出来るようになったよ！

# メンションありの場合
@BumpRole @User1 @User2
⏰ `/bump`が出来るようになったよ！

# ディス速の場合
@BumpRole
⏰ `/up`が出来るようになったよ！
```

**ローカライゼーション:**

| 言語   | Disboard                            | Dissoku                           |
| ------ | ----------------------------------- | --------------------------------- |
| 日本語 | `⏰ /bump が出来るようになったよ！` | `⏰ /up が出来るようになったよ！` |
| 英語   | `⏰ /bump is ready!`                | `⏰ /up is ready!`                |

---

## /bump-reminder-config enable

### コマンド定義

**コマンド**: `/bump-reminder-config enable`

**コマンドオプション:** なし

### 動作フロー

1. Bumpリマインダー機能を有効化（またはdisable後の再有効化）
2. 既存のメンション設定は維持

**ビジネスルール:**

- デフォルトで有効なため、通常は実行不要です

---

## /bump-reminder-config disable

### コマンド定義

**コマンド**: `/bump-reminder-config disable`

**コマンドオプション:** なし

### 動作フロー

1. Bumpリマインダー機能を無効化
2. 進行中のリマインダーもキャンセル（ステータスを `cancelled` に変更）

---

## /bump-reminder-config set-mention

### コマンド定義

**コマンド**: `/bump-reminder-config set-mention`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `role` | Role | ✅ | メンションするロール |

### 動作フロー

1. リマインダー送信時にメンションするロールを設定
2. 指定したロールに設定（上書き）

**ビジネスルール:**

- ユーザー単位の通知登録はBump検知時のパネルUIボタンから行います

---

## /bump-reminder-config remove-mention

### コマンド定義

**コマンド**: `/bump-reminder-config remove-mention`

**コマンドオプション:** なし

### 動作フロー

1. メンションロール設定を削除

---

## /bump-reminder-config remove-mention-users

### コマンド定義

**コマンド**: `/bump-reminder-config remove-mention-users`

**コマンドオプション:** なし

### 動作フロー

1. DB から `mentionUserIds` を取得
2. 登録ユーザーが0人の場合はエラー
3. 登録済みユーザーの StringSelectMenu（複数選択可）+ 一括選択ボタン + ページネーションを ephemeral で送信
4. ユーザー選択後「削除する」ボタン押下 → 選択されたユーザーを `mentionUserIds` から削除 → 完了メッセージに `update()`

**ビジネスルール:**

- StringSelectMenu の選択肢は1ページ25件、超過時はページネーション行を表示（1ページのみの場合はページネーション行ごと非表示）
- サーバーを退出済みのユーザーも `<@userId>` 形式で選択肢に表示される
- 「全員を選択」ボタンで全ページの全ユーザーを選択状態にできる
- 複数ページにまたがる選択はページ遷移しても保持される
- サーバー退出済みユーザーは `guildMemberRemove` イベントで自動除去されるため、通常はリストに残らない

### UI

**Embed:**

`createInfoEmbed` 使用 / ephemeral

| 項目 | 内容 |
| --- | --- |
| タイトル | 通知ユーザー削除 |
| 説明 | 削除するユーザーを選択してください。 |
| フィールド | 現在ページのユーザー一覧（番号付き `<@userId>` 形式、削除選択済みは ~~取り消し線~~） |

**表示例:**

```
1. <@111111111111111111>
2. ~~<@222222222222222222>~~
3. <@333333333333333333>
```

**Row 1 - ページネーション:**

単ページ時はこの行ごと非表示。

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `bump-reminder:page-first` | ⏮ | ― | Secondary | 最初のページ（1ページ目は `disabled`） |
| `bump-reminder:page-prev` | ◀ | ― | Secondary | 前のページ（1ページ目は `disabled`） |
| `bump-reminder:page-jump` | ― | {{page}}/{{total}}ページ | Secondary | 押下でモーダル表示、番号入力でページジャンプ |
| `bump-reminder:page-next` | ▶ | ― | Secondary | 次のページ（最終ページは `disabled`） |
| `bump-reminder:page-last` | ⏭ | ― | Secondary | 最後のページ（最終ページは `disabled`） |

**Row 2 - セレクトメニュー:**

| コンポーネント | 種別 | 設定 |
| --- | --- | --- |
| `bump-reminder:user-select` | StringSelect | `minValues: 0`, `maxValues: 現ページのユーザー数` |

選択肢: Embed のユーザー一覧と1:1対応（番号付き `<@userId>` 形式、1ページ最大25件）

**Row 3 - 選択ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `bump-reminder:all-user-select` | ☑️ | 全員を選択 | Secondary | 全ページの全ユーザーを選択 |

**Row 4 - 削除ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `bump-reminder:user-delete` | 🗑️ | 削除する | Danger | 選択ユーザーを削除して完了メッセージに更新 |

**エラー（登録ユーザー0人）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | 通知登録されているユーザーがいません。 |

---

## /bump-reminder-config view

### コマンド定義

**コマンド**: `/bump-reminder-config view`

**コマンドオプション:** なし

### 動作フロー

1. 現在の設定状態を取得
2. 設定内容を ephemeral で表示

### UI

**表示内容:**

_メンション対象が設定されている場合:_

<table border="1" cellpadding="8" width="420">
<tr><th align="left" colspan="2">Bumpリマインダー機能</th></tr>
<tr><td>状態</td><td>有効</td></tr>
<tr><td>メンションロール</td><td>@BumpRole</td></tr>
<tr><td>メンションユーザー</td><td>@User1, @User2, @User3</td></tr>
</table>

_メンション対象が設定されていない場合:_

<table border="1" cellpadding="8" width="420">
<tr><th align="left" colspan="2">Bumpリマインダー機能</th></tr>
<tr><td>状態</td><td>有効</td></tr>
<tr><td>メンションロール</td><td>なし</td></tr>
<tr><td>メンションユーザー</td><td>なし</td></tr>
</table>

**注意:**

- ユーザー個別のBump通知ON/OFFはパネルUIのボタンからのみ管理可能
- Bump検知時にパネルUIが表示され、ユーザーが自分でBump通知の受信を管理できます

---

## /bump-reminder-config reset

### コマンド定義

**コマンド**: `/bump-reminder-config reset`

**コマンドオプション:** なし

### 動作フロー

1. 確認ダイアログ Embed + ボタンを ephemeral で送信
2. 「リセットする」ボタン押下 → 設定をデフォルト状態に戻す + 進行中リマインダーをキャンセル → 完了メッセージに `update()`
3. 「キャンセル」ボタン押下 / 60秒タイムアウト → キャンセルメッセージに `update()`

**ビジネスルール:**

- リセット後のデフォルト状態: `enabled: true`、`mentionRoleId: null`、`mentionUserIds: []`（機能は有効のまま、メンション設定のみクリア）
- 進行中の `pending` リマインダーは全て `cancelled` に更新
- メモリ上のタイマー（setTimeout）もキャンセル
- パネルメッセージが残っている場合は削除を試みる（失敗は無視）
- 設定が存在しない場合でもリセット操作は成功扱い（冪等）

### UI

**Embed（確認ダイアログ）:**

`createWarningEmbed` 使用

| 項目 | 内容 |
| --- | --- |
| タイトル | Bumpリマインダー設定リセット |
| 説明 | Bumpリマインダー設定をリセットしますか？\n以下の設定が削除されます。この操作は元に戻せません。 |
| フィールド | 削除対象: 有効/無効設定 / メンションロール / メンションユーザー / 進行中のリマインダー |

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `bump-reminder:reset-confirm` | 🗑️ | リセットする | Danger | 設定を全クリアして完了メッセージに更新 |
| `bump-reminder:reset-cancel` | ❌ | キャンセル | Secondary | キャンセルメッセージに更新 |

---

## データモデル

### BumpReminder

リマインダーの永続化に独立したテーブルを使用：

| フィールド      | 型       | 説明                                              |
| --------------- | -------- | ------------------------------------------------- |
| `id`            | String   | レコードID（主キー）                              |
| `guildId`       | String   | ギルドID                                          |
| `channelId`     | String   | 通知先チャンネルID                                |
| `messageId`     | String?  | 元のBumpメッセージID（返信用）                    |
| `panelMessageId`| String?  | パネルメッセージID（新Bump検知時に旧パネル削除用） |
| `serviceName`   | String?  | サービス名（`Disboard` または `Dissoku`）          |
| `scheduledAt`   | DateTime | 通知予定時刻                                      |
| `status`        | String   | 状態（`pending` / `sent` / `cancelled`）          |

**ステータス管理:**

- `pending`: リマインダー待機中（Bot再起動時に復元対象）
- `sent`: リマインダー送信完了
- `cancelled`: キャンセル済み（disable コマンド実行時など）

### GuildBumpReminderConfig

Bumpリマインダーの設定情報：

| フィールド      | 型       | 説明                                              |
| --------------- | -------- | ------------------------------------------------- |
| `guildId`       | String   | ギルドID（主キー）                                |
| `enabled`       | Boolean  | 機能有効/無効（DBデフォルト: false、アプリデフォルト: true） |
| `channelId`     | String?  | Bump検知対象チャンネルID（未設定時は全チャンネルで検知） |
| `mentionRoleId` | String?  | メンションロールID                                |
| `mentionUserIds`| String[] | メンションユーザーIDリスト（JSON配列保存）        |

**重要な設計判断:**

- **BumpReminderテーブル**: リマインダーの実行状態を管理（1ギルド複数リマインダー可能、ただし実際は最後の1件のみ有効）
- **GuildBumpReminderConfigテーブル**: ギルド全体の設定（メンション対象など）
- リマインダー送信時に GuildBumpReminderConfig から最新の設定を取得することで、Bump検知後の設定変更も反映

---

## 制約・制限事項

- チャンネルが存在しない、またはテキスト送信不可の場合はリマインダー送信をスキップ
- 送信直前に設定を再取得し、無効化されていた場合は送信せずに終了
- Bot再起動時の復元エラー:
  - pending レコードのチャンネルが存在しない → スキップ
  - 設定が無効 → スキップ
  - ギルドから退出済み → 自然にスキップ（guilds.cache に存在しない）
- 追加対応（未実装）:
  - 送信不可・DB接続エラー時にギルド設定のログチャンネルへエラー通知する（ギルド設定機能実装時に対応）

---

## ローカライズ

**翻訳ファイル:**

- `src/shared/locale/locales/{ja,en}/features/bumpReminder.ts`

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `bump-reminder-config.description` | コマンド説明 | Bumpリマインダーの設定（サーバー管理権限が必要） | Configure bump reminder (requires Manage Server) |
| `bump-reminder-config.enable.description` | サブコマンド説明 | Bumpリマインダー機能を有効化 | Enable bump reminder feature |
| `bump-reminder-config.disable.description` | サブコマンド説明 | Bumpリマインダー機能を無効化 | Disable bump reminder feature |
| `bump-reminder-config.set-mention.description` | サブコマンド説明 | メンションロールを設定 | Set mention role |
| `bump-reminder-config.set-mention.role.description` | オプション説明 | リマインダーでメンションするロール | Role to mention in reminders |
| `bump-reminder-config.remove-mention.description` | サブコマンド説明 | メンションロール設定を削除 | Remove mention role setting |
| `bump-reminder-config.remove-mention-users.description` | サブコマンド説明 | 通知ユーザーを削除 | Remove notification users |
| `bump-reminder-config.reset.description` | サブコマンド説明 | Bumpリマインダー設定をリセット | Reset bump reminder settings |
| `bump-reminder-config.view.description` | サブコマンド説明 | 現在の設定を表示 | Show current settings |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.enable_success` | 有効化成功 | Bumpリマインダー機能を有効化しました。 | Bump reminder feature has been enabled |
| `user-response.disable_success` | 無効化成功 | Bumpリマインダー機能を無効化しました。 | Bump reminder feature has been disabled |
| `user-response.set_mention_role_success` | ロール設定成功 | メンションロールを {{role}} に設定しました。 | Mention role set to {{role}} |
| `user-response.set_mention_error` | ロール設定失敗 | メンションロールの設定に失敗しました。 | Failed to set mention role. |
| `user-response.remove_mention_role` | ロール削除成功 | メンションロールの登録を削除しました。 | Mention role registration has been removed |
| `user-response.reminder_message_disboard` | Disboardリマインド通知 | ⏰ `/bump` が出来るようになったよ！ | ⏰ `/bump` is ready! |
| `user-response.reminder_message_dissoku` | Dissokuリマインド通知 | ⏰ `/up` が出来るようになったよ！ | ⏰ `/up` is ready! |
| `user-response.reminder_message` | 汎用リマインド通知 | ⏰ **Bump出来るようになったよ！** | ⏰ **Ready to bump!** |
| `user-response.panel_scheduled_at` | リマインド予定表示 | <t:{{timestamp}}:R>にリマインドが通知されます。 | Reminder will be sent <t:{{timestamp}}:R>. |
| `user-response.panel_mention_toggled_on` | 通知ON切替成功 | 通知をONにしました。 | Notification turned ON. |
| `user-response.panel_mention_toggled_off` | 通知OFF切替成功 | 通知をOFFにしました。 | Notification turned OFF. |
| `user-response.reset_success` | リセット成功 | Bumpリマインダー設定をリセットしました。 | Bump reminder settings have been reset. |
| `user-response.reset_cancelled` | リセットキャンセル | リセットをキャンセルしました。 | Reset has been cancelled. |
| `user-response.remove_users_success` | ユーザー削除成功 | 選択したユーザーを通知リストから削除しました。 | Selected users have been removed from the notification list. |
| `user-response.remove_users_empty` | ユーザー0人エラー | 通知登録されているユーザーがいません。 | No users are registered for notifications. |
| `user-response.panel_update_failed` | 通知リスト更新失敗 | Bump通知リストの更新に失敗しました。 | Failed to update the notification list. |

### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.success` | 設定完了タイトル | 設定完了 | Settings Updated |
| `embed.description.not_configured` | 未設定説明 | Bumpリマインダーが設定されていません。 | Bump reminder is not configured. |
| `embed.title.reset_confirm` | リセット確認タイトル | Bumpリマインダー設定リセット確認 | Confirm Bump Reminder Reset |
| `embed.description.reset_confirm` | リセット確認説明 | Bumpリマインダー設定をリセットしますか？\n以下の設定が削除されます。この操作は元に戻せません。 | Are you sure you want to reset bump reminder settings?\nThe following settings will be deleted. This action cannot be undone. |
| `embed.field.name.reset_target` | リセット削除対象フィールド名 | 削除対象 | Targets to Delete |
| `embed.field.value.reset_target` | リセット削除対象フィールド値 | 有効/無効設定 / メンションロール / メンションユーザー / 進行中のリマインダー | Enabled/Disabled setting / Mention role / Mention users / Pending reminders |
| `embed.title.remove_users` | 通知ユーザー削除タイトル | 通知ユーザー削除 | Remove Notification Users |
| `embed.description.remove_users` | 通知ユーザー削除説明 | 削除するユーザーを選択してください。 | Select users to remove. |
| `embed.title.config_view` | 設定表示タイトル | Bumpリマインダー機能 | Bump Reminder Feature |
| `embed.description.config_view` | 設定表示説明 | 現在の設定状態 | Current settings status |
| `embed.title.panel` | パネルタイトル | Bumpリマインダー機能 | Bump Reminder |
| `embed.field.name.status` | 状態フィールド名 | 状態 | Status |
| `embed.field.name.mention_role` | ロールフィールド名 | メンションロール | Mention Role |
| `embed.field.name.mention_users` | ユーザーフィールド名 | メンションユーザー | Mention Users |

### UIラベル

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ui.button.mention_on` | 通知ONボタン | ユーザー通知をONにする | Turn Notification ON |
| `ui.button.mention_off` | 通知OFFボタン | ユーザー通知をOFFにする | Turn Notification OFF |
| `ui.button.reset_confirm` | リセット確認ボタン | リセットする | Reset |
| `ui.button.reset_cancel` | リセットキャンセルボタン | キャンセル | Cancel |
| `ui.button.select_all` | 全員選択ボタン | 全員を選択 | Select All |
| `ui.button.submit_delete` | 削除実行ボタン | 削除する | Delete |

※ ページネーション関連キー（`page_jump.label`, `page_jump_modal.title`, `page_jump_modal.input.label`）は `common.ts` で共通定義

### ログ

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.detected` | Bump検知ログ | Bumpを検知 GuildId: {{guildId}} Service: {{service}} | bump detected GuildId: {{guildId}} Service: {{service}} |
| `log.detection_failed` | Bump検知失敗ログ | Bump検知処理に失敗 GuildId: {{guildId}} | failed to handle bump detection GuildId: {{guildId}} |
| `log.panel_mention_updated` | メンション更新ログ | メンション {{action}} UserId: {{userId}} GuildId: {{guildId}} | mention {{action}} UserId: {{userId}} GuildId: {{guildId}} |
| `log.panel_handle_failed` | パネル処理失敗ログ | パネルボタン処理失敗 | Failed to handle panel button |
| `log.panel_reply_failed` | パネル返信失敗ログ | パネルボタン エラー返信失敗 | Failed to send error reply for panel button |
| `log.config_enabled` | 有効化ログ | 有効化 GuildId: {{guildId}} ChannelId: {{channelId}} | enabled GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.config_disabled` | 無効化ログ | 無効化 GuildId: {{guildId}} | disabled GuildId: {{guildId}} |
| `log.config_mention_set` | ロール設定ログ | メンションロール設定 GuildId: {{guildId}} RoleId: {{roleId}} | mention role set GuildId: {{guildId}} RoleId: {{roleId}} |
| `log.config_reset` | 設定リセットログ | 設定リセット GuildId: {{guildId}} | settings reset GuildId: {{guildId}} |
| `log.config_mention_removed` | メンション削除ログ | メンション設定削除 GuildId: {{guildId}} Target: {{target}} | mention settings removed GuildId: {{guildId}} Target: {{target}} |
| `log.config_users_removed` | ユーザー削除ログ | メンションユーザー削除 GuildId: {{guildId}} UserIds: {{userIds}} | mention users removed GuildId: {{guildId}} UserIds: {{userIds}} |
| `log.scheduler_task_failed` | タスク失敗ログ | タスク失敗 GuildId: {{guildId}} | Task failed GuildId: {{guildId}} |
| `log.scheduler_description` | スケジューラー説明ログ | GuildId: {{guildId}} ExecuteAt: {{executeAt}} | GuildId: {{guildId}} ExecuteAt: {{executeAt}} |
| `log.scheduler_scheduled` | スケジュール登録ログ | {{minutes}} 分後にリマインダーをスケジュール GuildId: {{guildId}} | Scheduled reminder in {{minutes}} minutes GuildId: {{guildId}} |
| `log.scheduler_cancelling` | キャンセル中ログ | 既存リマインダーをキャンセル中 GuildId: {{guildId}} | Cancelling existing reminder GuildId: {{guildId}} |
| `log.scheduler_cancelled` | キャンセル完了ログ | リマインダーをキャンセルしました。 GuildId: {{guildId}} | Reminder cancelled GuildId: {{guildId}} |
| `log.scheduler_executing_immediately` | 即時実行ログ | 期限切れリマインダーを即座に実行 GuildId: {{guildId}} | Executing overdue reminder immediately GuildId: {{guildId}} |
| `log.scheduler_restored` | 復元ログ | 保留中リマインダー {{count}} 件を復元 | Restored {{count}} pending reminders |
| `log.scheduler_restored_none` | 復元対象なしログ | 復元対象のリマインダーなし | No pending reminders to restore |
| `log.scheduler_sent` | 送信成功ログ | リマインダーを送信 GuildId: {{guildId}} ChannelId: {{channelId}} | Reminder sent GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.scheduler_send_failed` | 送信失敗ログ | リマインダー送信に失敗 GuildId: {{guildId}} ChannelId: {{channelId}} | Reminder send failed GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.scheduler_channel_not_found` | チャンネル不在ログ | チャンネルが見つかりません。 GuildId: {{guildId}} ChannelId: {{channelId}} | Channel not found GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.scheduler_disabled` | 無効化状態ログ | 無効化されています。 GuildId: {{guildId}} | Disabled GuildId: {{guildId}} |
| `log.scheduler_restore_failed` | 復元失敗ログ | 復元に失敗: | Failed to restore: |
| `log.scheduler_duplicates_cancelled` | 重複キャンセルログ | 重複リマインダー {{count}} 件をキャンセル | Cancelled {{count}} duplicate reminders |
| `log.scheduler_duplicates_none` | 重複なしログ | 重複リマインダーなし | No duplicate reminders to cancel |
| `log.scheduler_unregistered_channel` | 未登録チャンネルスキップログ | 未登録チャンネルのためスキップ GuildId: {{guildId}} ChannelId: {{channelId}} ExpectedChannelId: {{expectedChannelId}} | Skipping unregistered channel GuildId: {{guildId}} ChannelId: {{channelId}} ExpectedChannelId: {{expectedChannelId}} |
| `log.scheduler_orphaned_panel_delete_failed` | 孤立パネル削除失敗ログ | 孤立パネルメッセージ削除失敗 PanelMessageId: {{panelMessageId}} | Failed to delete orphaned panel message PanelMessageId: {{panelMessageId}} |
| `log.scheduler_panel_deleted` | パネル削除ログ | パネルメッセージを削除 GuildId: {{guildId}} PanelMessageId: {{panelMessageId}} | Deleted panel message GuildId: {{guildId}} PanelMessageId: {{panelMessageId}} |
| `log.scheduler_panel_delete_failed` | パネル削除失敗ログ | パネルメッセージ削除失敗 PanelMessageId: {{panelMessageId}} | Failed to delete panel message PanelMessageId: {{panelMessageId}} |
| `log.scheduler_panel_send_failed` | パネル送信失敗ログ | パネルの送信に失敗 | Failed to send panel |
| `log.database_created` | DB作成ログ | Bumpリマインダーを作成 Id: {{id}} GuildId: {{guildId}} | Bump reminder created Id: {{id}} GuildId: {{guildId}} |
| `log.database_create_failed` | DB作成失敗ログ | Bumpリマインダー作成に失敗 GuildId: {{guildId}} | Failed to create bump reminder GuildId: {{guildId}} |
| `log.database_find_failed` | DB取得失敗ログ | Bumpリマインダー取得に失敗 Id: {{id}} | Failed to find bump reminder Id: {{id}} |
| `log.database_find_all_failed` | DB全件取得失敗ログ | 保留中Bumpリマインダーの取得に失敗 | Failed to find pending bump reminders |
| `log.database_status_updated` | DBステータス更新ログ | Bumpリマインダーのステータスを更新 Id: {{id}} Status: {{status}} | Bump reminder status updated Id: {{id}} Status: {{status}} |
| `log.database_update_failed` | DB更新失敗ログ | Bumpリマインダー更新に失敗 Id: {{id}} | Failed to update bump reminder Id: {{id}} |
| `log.database_deleted` | DB削除ログ | Bumpリマインダーを削除 Id: {{id}} | Bump reminder deleted Id: {{id}} |
| `log.database_delete_failed` | DB削除失敗ログ | Bumpリマインダー削除に失敗 Id: {{id}} | Failed to delete bump reminder Id: {{id}} |
| `log.database_cancelled_by_guild` | ギルド単位キャンセルログ | 保留中Bumpリマインダーをキャンセル GuildId: {{guildId}} | Cancelled pending bump reminders GuildId: {{guildId}} |
| `log.database_cancelled_by_channel` | チャンネル単位キャンセルログ | 保留中Bumpリマインダーをキャンセル GuildId: {{guildId}} ChannelId: {{channelId}} | Cancelled pending bump reminders GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.database_cancel_failed` | キャンセル失敗ログ | Bumpリマインダーキャンセルに失敗 GuildId: {{guildId}} | Failed to cancel bump reminders GuildId: {{guildId}} |
| `log.database_cleanup_completed` | クリーンアップ完了ログ | 古いBumpリマインダー {{count}} 件をクリーンアップ ({{days}} 日以前) | Cleaned up {{count}} old bump reminders older than {{days}} days |
| `log.database_cleanup_failed` | クリーンアップ失敗ログ | 古いBumpリマインダーのクリーンアップに失敗 | Failed to cleanup old bump reminders: |

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildConfigRepository | Bumpリマインダー設定の取得・更新 |
| BumpReminderRepository | リマインダーの永続化・ステータス管理 |
| JobScheduler | タイマー管理（setTimeout ベース） |

---

## テストケース

### 実装済みテスト

- ユニットテスト: `tests/unit/bot/features/bump-reminder/`
- インテグレーションテスト: `tests/integration/bot/features/bump-reminder/`

### 追加予定テスト

**reset サブコマンド:**

- [x] 確認ダイアログが表示されること
- [x] 「リセットする」ボタンで設定がデフォルト状態に戻ること（enabled: true、メンション設定クリア）
- [x] 「キャンセル」ボタンでリセットが中止されること
- [x] リセット後に成功メッセージが表示されること

**remove-mention-users サブコマンド:**

- [x] 登録済みユーザーがセレクトメニューに表示されること
- [x] サーバー不在のユーザーも選択肢に含まれること
- [x] 複数ユーザーを選択して削除できること
- [x] 「全員を選択」ボタンで全ユーザーが選択されること
- [x] 「サーバー不在のみ選択」ボタンで不在ユーザーのみ選択されること
- [x] 選択済みユーザーがEmbed上で取り消し線表示になること
- [x] 25人超の場合にページネーションが動作すること
- [x] 1ページのみの場合にページネーション行が非表示になること
- [x] 削除後に成功メッセージが表示されること
- [x] 登録ユーザーが0人の場合にエラーメッセージが表示されること

**権限チェック集約:**

- [x] execute 入口で ManageGuild 権限チェックが行われること
- [x] 各サブコマンド内で個別の権限チェックが行われないこと

---

## 実装メモ

### ディス速のBot ID確認方法

✅ **確認済み**: `761562078095867916`

1. ディス速をサーバーに招待
2. `/up` コマンドを実行
3. レスポンスメッセージの送信者IDを確認
4. 確認したIDを定数として設定

### JobScheduler による実装

**JobScheduler を使用した理由:**

1. **一貫性**: スケジューリング処理を共通化
2. **再利用性**: 繰り返しジョブと一回実行ジョブを同一APIで管理
3. **保守性**: ジョブ登録・削除・監視を集約

**動作概要:**

1. リマインダー登録時にDBへ保存（永続化）
2. `setTimeout` ベースの1回実行ジョブをメモリ上に設定
3. 実行後にDBのステータスを `sent` に更新

### Bot再起動時の復元戦略

**ハイブリッドアプローチ:**

- **DB**: 永続的な真実の記録（pending レコード）
- **メモリ**: 実行中のタイマー（1回実行ジョブ）

**復元フロー:**

起動時にpendingリマインダーを全件取得し、タイマーを再設定します。送信時に最新の設定を取得するため、Bump検知後の設定変更も反映されます。

### Bumpリマインダー機能のテスト方法

**テストモードの有効化:**

`.env`ファイルで`TEST_MODE`を有効化すると、実際のBumpBotなしでテストできます。

```bash
# .env
TEST_MODE="true"
```

**テストモードの動作:**

- `test bump` というメッセージを送信すると、Disboardの`/bump`検知として動作
- `test up` というメッセージを送信すると、Dissokuの`/up`検知として動作
- リマインダーの遅延時間が **2時間から1分に短縮**

**テスト手順:**

1. `.env`で`TEST_MODE="true"`を設定
2. Botを再起動
3. Discordチャンネルで`test bump`または`test up`を送信
4. パネルUIが表示される（ボタンでBump通知を設定可能）
5. 1分後にリマインダーメッセージが送信される（パネルはリマインド後に自動削除）

**注意:**

- 本番環境では必ず`TEST_MODE`をコメントアウトまたは削除してください
- テストモードではユーザーメッセージを検知するため、通常のBot検知は無効化されません

---

## 参考リソース

- [Disboard公式サイト](https://disboard.org/)
- [ディス速公式サイト](https://dissoku.net/)
- [Discord.js - MessageCreateEvent](https://discord.js.org/#/docs/discord.js/main/class/Client?scrollTo=e-messageCreate)
- [Discord.js - ButtonBuilder](https://discord.js.org/#/docs/discord.js/main/class/ButtonBuilder)

---

## 今後の改善案

- **統計機能**: Bump回数の記録と表示
- **通知カスタマイズ**: リマインダーメッセージのカスタマイズ機能
