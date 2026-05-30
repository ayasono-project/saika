# ギルド設定機能 - 仕様書

> Guild Settings - ギルド全体の共通設定の管理・バックアップ機能

最終更新: 2026年5月30日

---

## 概要

サーバー（ギルド）全体に適用される共通設定を管理するコマンドです。言語設定の切り替え、エラー通知チャンネルの設定、全設定の一覧確認、設定リセット、および設定のエクスポート/インポートによるバックアップ・リストアを提供します。

エクスポート/インポートは「**同一ギルド内のバックアップおよび DB 移行**」のための機能であり、異なるギルドへの設定コピーは想定しません。export には**設定系**（各機能の有効化フラグ・チャンネル/ロール ID 等）に加え、再構築が困難な **stateful データ**（チケット設定パネル / open 中チケット / スティッキーメッセージ / リアクションロールパネル / VAC が自動作成した VC の追跡情報）も含まれます。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| set-locale | Bot の応答言語をギルド単位で設定（ja / en） |
| set-error-channel | エラー通知チャンネルを設定 |
| view | 現在のギルド設定をページ形式で表示 |
| reset | ギルド設定（言語・エラー通知チャンネル）をリセット |
| reset-all | 全機能の設定を一括リセット |
| export | 現在のギルド設定および stateful データを JSON 形式でエクスポート |
| import | JSON ファイルからギルド設定および stateful データをインポート（設定系は上書き、stateful はマージ） |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者 | ManageGuild | 全サブコマンドの実行（コマンドレベルで制御） |
| Bot | AttachFiles | `export` サブコマンドでのJSON設定ファイル添付 |

---

## set-locale

### コマンド定義

**コマンド**: `/guild-settings set-locale`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `locale` | choices | ✅ | 設定する言語を選択（`ja`: 日本語 / `en`: English） |

### 動作フロー

1. `repository.updateLocale(guildId, locale)` で DB 更新
2. `localeManager.invalidateLocaleCache(guildId)` でキャッシュを即時無効化
3. 完了メッセージを返信（ephemeral）

**ビジネスルール:**

- `set-locale` 実行後は `localeManager.invalidateLocaleCache(guildId)` を必ず呼ぶ。呼ばない場合、TTL（5分）が切れるまで古いロケールが使われ続ける

### UI

**レスポンス（成功）:** `createSuccessEmbed` で言語設定完了を通知

---

## set-error-channel

### コマンド定義

**コマンド**: `/guild-settings set-error-channel`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `channel` | Channel（テキストチャンネル） | ✅ | エラー通知先チャンネル |

### 動作フロー

1. チャンネルの型をバリデーション（テキストチャンネルのみ）
2. `repository.updateErrorChannel(guildId, channelId)` で DB 更新
3. 完了メッセージを返信（ephemeral）

**ビジネスルール:**

- エラー通知チャンネルは、イベント駆動の機能（Bumpリマインダー、メッセージ固定、メンバーログ、VC募集、VAC）でインタラクション起点でないエラーが発生した場合のフォールバック送信先として使用される
- エラー通知チャンネルが未設定の場合、フォールバック先がないエラーはログ出力のみで通知されない
- 通知対象は `logger.error` および `logger.warn` レベルのうち、管理者が知るべきもの。`debug` レベルや意図的な `.catch(() => null)` は対象外

**通知対象箇所（`logger.error` レベル）:**

| # | 機能 | ファイル | 内容 |
| --- | --- | --- | --- |
| 1 | メンバーログ | `guildMemberAddHandler.ts:156` | 入室通知の送信失敗 |
| 2 | メンバーログ | `guildMemberRemoveHandler.ts:175` | 退室通知の送信失敗 |
| 3 | メッセージ固定 | `stickyMessageCreateHandler.ts:27` | 再送処理の失敗 |
| 4 | メッセージ固定 | `stickyMessageChannelDeleteHandler.ts:41` | チャンネル削除時のクリーンアップ失敗 |
| 5 | メッセージ固定 | `stickyMessageResendService.ts:50` | スケジュールされた再送のエラー |
| 6 | メッセージ固定 | `stickyMessageResendService.ts:85` | メッセージ送信失敗 |
| 7 | Bumpリマインダー | `bumpReminderHandler.ts:102` | Bump検出処理の失敗 |
| 8 | Bumpリマインダー | `sendBumpReminder.ts:134` | リマインダー送信失敗 |
| 9 | Bumpリマインダー | `sendBumpPanel.ts:75` | パネル送信失敗 |
| 10 | Bumpリマインダー | `bumpReminderMemberRemoveHandler.ts:39` | メンバー退出時のメンション整理失敗 |
| 11 | Bumpリマインダー | `bumpReminderRoleDeleteHandler.ts:35` | ロール削除時のメンション整理失敗 |
| 12 | Bumpリマインダー | `bumpReminderStartup.ts:52` | 起動時のスケジューラ復元失敗（※対象外：全ギルド横断処理のため特定ギルドへの通知不可。ログ出力のみ） |
| 13 | VC募集 | `vcRecruitVoiceStateUpdate.ts:59` | VC状態変更の処理失敗 |
| 14 | VC募集 | `vcRecruitChannelDeleteHandler.ts:62` | 投稿チャンネル削除失敗 |
| 15 | VC募集 | `vcRecruitChannelDeleteHandler.ts:98` | パネルチャンネル削除失敗 |
| 16 | VAC | `handleVacCreate.ts:99` | コントロールパネル送信失敗 |

**通知対象箇所（`logger.warn` レベル）:**

| # | 機能 | ファイル | 内容 |
| --- | --- | --- | --- |
| 17 | メンバーログ | `guildMemberAddHandler.ts:39` | 通知先チャンネル消失→設定自動リセット |
| 18 | メンバーログ | `guildMemberRemoveHandler.ts:45` | 通知先チャンネル消失→設定自動リセット |
| 19 | Bumpリマインダー | `sendBumpReminder.ts:39` | リマインダー送信先チャンネル未発見 |
| 20 | VAC | `handleVacCreate.ts:69` | カテゴリのチャンネル上限到達でVC作成不可 |

**通知対象外（debug/軽微/意図的な無視）:**

| # | 機能 | 内容 | 理由 |
| --- | --- | --- | --- |
| 21-22 | Bumpリマインダー | 旧パネル削除失敗 | debug レベル、後続処理に影響なし |
| 23 | メッセージ固定 | 旧メッセージ削除失敗 | debug レベル、既に削除済みの場合 |
| 24-25 | VC募集 | teardown編集失敗 | タイムアウト後の `.catch(() => {})` |
| 26-28 | VAC | チャンネル移動/削除/fetch | 意図的な `.catch(() => null)` |
| 29 | 共通 | `executeWithLoggedError` | VAC内部で使用 |

### UI

**レスポンス（成功）:** `createSuccessEmbed` でチャンネル設定完了を通知

### エラーチャンネル通知の実装

**ユーティリティ:** `src/bot/shared/errorChannelNotifier.ts`

| 関数 | 用途 | Embed |
| --- | --- | --- |
| `notifyErrorChannel(guild, error, context)` | error レベルの通知 | `createErrorEmbed`（赤） |
| `notifyWarnChannel(guild, message, context)` | warn レベルの通知 | `createWarningEmbed`（黄） |

**共通動作:**

1. `GuildSettingsService.getSettings(guildId)` で `errorChannelId` を取得
2. 未設定 → return（何もしない）
3. `guild.channels.fetch(errorChannelId)` でチャンネル取得（テキストチャンネルのみ）
4. Embed 生成（機能名・処理内容・エラーメッセージ/警告メッセージ・タイムスタンプ）
5. チャンネルに送信
6. 送信失敗時は `logger.debug` のみ（再帰通知しない）

**Embed フォーマット:**

| 項目 | 内容 |
| --- | --- |
| タイトル | エラー通知 / 警告通知（i18n） |
| フィールド | 機能（inline）/ 処理（inline）/ 詳細 |
| タイムスタンプ | `setTimestamp()` による自動付与 |
| エラーメッセージ上限 | 1024文字（Discord Embed フィールド制限） |

**i18n キー:** `guildSettings:error-notification.*`（`title`, `warn_title`, `feature`, `action`, `message`）

---

## view

### コマンド定義

**コマンド**: `/guild-settings view`

**コマンドオプション:** なし

### 動作フロー

1. `repository.getSettings(guildId)` でギルド設定を取得（レコードが存在しない場合はデフォルト設定として表示）
2. ギルド設定値（言語・エラー通知チャンネル）の Embed を ephemeral で返信

**ビジネスルール:**

- ギルド設定固有の値（locale・errorChannelId）のみを表示する
- 各機能の設定は各機能の `-settings view` コマンドで確認する

### UI

**Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | ギルド設定 |
| フィールド | 言語: 日本語 (ja) / English (en) |
| フィールド | エラー通知チャンネル: #channel / 未設定 |

---

## reset

ギルド設定（言語・エラー通知チャンネル）のみをリセットする。各機能の設定は保持される。

### コマンド定義

**コマンド**: `/guild-settings reset`

**コマンドオプション:** なし

### 動作フロー

1. `createWarningEmbed` で確認ダイアログ Embed + ボタンを ephemeral で送信
2. 「リセットする」ボタン押下 → `repository.resetGuildSettings(guildId)` で言語・エラー通知チャンネルをデフォルトに戻す → `localeManager.invalidateLocaleCache(guildId)` → 完了メッセージに `update()`
3. 「キャンセル」ボタン押下 / 60秒タイムアウト → キャンセルメッセージに `update()`

**ビジネスルール:**

- リセット後は `localeManager.invalidateLocaleCache(guildId)` を呼び出してキャッシュを即時クリアする
- リセット対象は `locale`・`errorChannelId` のみ。各機能の設定（AFK、Bumpリマインダー等）は影響を受けない

### UI

**Embed（確認ダイアログ）:** `createWarningEmbed` を使用

| 項目 | 内容 |
| --- | --- |
| タイトル | ギルド設定リセット確認 |
| 説明 | ギルド設定（言語・エラー通知チャンネル）をリセットしますか？\nこの操作は元に戻せません。 |

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `guild-settings:reset-confirm` | 🗑️ | リセットする | Danger | 設定をリセットして完了メッセージに更新 |
| `guild-settings:reset-cancel` | ❌ | キャンセル | Secondary | キャンセルメッセージに更新 |

---

## reset-all

全機能の設定を一括リセットする。ギルド設定（言語・エラー通知チャンネル）も含めてすべて削除される。

### コマンド定義

**コマンド**: `/guild-settings reset-all`

**コマンドオプション:** なし

### 動作フロー

1. `createWarningEmbed` で確認ダイアログ Embed + ボタンを ephemeral で送信
2. 「リセットする」ボタン押下 → `repository.deleteSettings(guildId)` で全設定を削除 → `localeManager.invalidateLocaleCache(guildId)` → 完了メッセージに `update()`
3. 「キャンセル」ボタン押下 / 60秒タイムアウト → キャンセルメッセージに `update()`

**ビジネスルール:**

- `deleteSettings` 後は `localeManager.invalidateLocaleCache(guildId)` を呼び出してキャッシュを即時クリアする
- ギルド設定 + 全機能の設定（AFK、Bumpリマインダー、VAC、VC募集、メッセージ固定、メンバーログ）がすべて削除される

### UI

**Embed（確認ダイアログ）:** `createWarningEmbed` を使用

| 項目 | 内容 |
| --- | --- |
| タイトル | 全設定リセット確認 |
| 説明 | 全機能の設定をリセットしますか？\n以下の設定がすべて削除されます。この操作は元に戻せません。 |
| フィールド | 削除対象: 言語設定 / エラー通知チャンネル / AFK / VAC / VC募集 / メッセージ固定 / メンバーログ / Bumpリマインダー |

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `guild-settings:reset-all-confirm` | 🗑️ | リセットする | Danger | 全設定を削除して完了メッセージに更新 |
| `guild-settings:reset-all-cancel` | ❌ | キャンセル | Secondary | キャンセルメッセージに更新 |

---

## export

### コマンド定義

**コマンド**: `/guild-settings export`

**コマンドオプション:** なし

### 動作フロー

1. repository から全設定を取得（GuildSettings + 各機能設定 + stateful データ）
2. JSON 形式にシリアライズ（`version`, `exportedAt`, `guildId`, `settings`, `state`）
3. JSON ファイルを添付した ephemeral メッセージで返信

**ビジネスルール:**

- 添付ファイル名: `guild-settings-{guildId}-{timestamp}.json`
- `GuildSettings` レコード（locale/errorChannelId を保持）が存在しない場合はエラーメッセージを返す（= まだギルドが Bot を一度も触っていない状態）
- `state` フィールドは stateful データ（チケット設定 / open チケット / スティッキー / リアクションロールパネル / VAC 作成済み VC）を格納
- 配列/オブジェクトのフィールド（`GuildReactionRolePanel.buttons` / `GuildVacSettings.createdChannels`・`triggerChannelIds` / `GuildVcRecruitSettings.setups`・`mentionRoleIds` / `GuildBumpReminderSettings.mentionUserIds` / `GuildTicketSettings.staffRoleIds`）は DB 上 **jsonb** で保存され、export では配列/オブジェクトのまま書き出す。`StickyMessage.embedData` も jsonb だが、旧 SQLite 版が出力した export ファイルとの互換のため export 表現では JSON 文字列化し、import 時にパースして jsonb へ保存する

**export 対象外:**

| 対象 | 理由 |
| --- | --- |
| `BumpReminder`（予約済みリマインダーキュー） | 時刻ベースのスケジュールで鮮度が落ちる |
| `Ticket` の `status="closed"` | 履歴扱い・運用復元には不要 |
| `VcRecruitSettings.setups[].createdVoiceChannelIds` | VC 募集が作成した一時 VC のランタイム追跡情報。バックアップ価値が薄い。export 時は JSON から省略し、import 時は `setups[].createdVoiceChannelIds = []` で書き込む |

### UI

**レスポンス（成功）:** `createSuccessEmbed` でエクスポート完了を通知

**エクスポート JSON 構造:**

```json
{
  "version": 1,
  "exportedAt": "2026-05-14T12:00:00.000Z",
  "guildId": "123456789012345678",
  "settings": {
    "locale": "ja",
    "errorChannelId": "666666666666666666",
    "afk": {
      "enabled": true,
      "channelId": "111111111111111111"
    },
    "bumpReminder": {
      "enabled": true,
      "channelId": "777777777777777777",
      "mentionRoleId": "222222222222222222",
      "mentionUserIds": []
    },
    "vac": {
      "enabled": true,
      "triggerChannelIds": ["333333333333333333"]
    },
    "memberLog": {
      "enabled": true,
      "channelId": "444444444444444444",
      "joinMessage": null,
      "leaveMessage": null
    },
    "vcRecruit": {
      "enabled": true,
      "mentionRoleIds": [],
      "setups": [
        {
          "categoryId": "888888888888888888",
          "panelChannelId": "555555555555555555",
          "postChannelId": "999999999999999999",
          "panelMessageId": "101010101010101010",
          "threadArchiveDuration": 1440
        }
      ]
    }
  },
  "state": {
    "ticketSettings": [
      {
        "categoryId": "111000000000000001",
        "enabled": true,
        "staffRoleIds": ["222000000000000001"],
        "panelChannelId": "333000000000000001",
        "panelMessageId": "444000000000000001",
        "panelTitle": "サポート",
        "panelDescription": "サポートが必要な場合は下のボタンからチケットを作成してください。",
        "panelColor": "#00A8F3",
        "autoDeleteDays": 7,
        "maxTicketsPerUser": 1,
        "ticketCounter": 12
      }
    ],
    "openTickets": [
      {
        "categoryId": "111000000000000001",
        "channelId": "555000000000000001",
        "userId": "666000000000000001",
        "ticketNumber": 12,
        "subject": "ログインできません",
        "elapsedDeleteMs": 0
      }
    ],
    "stickyMessages": [
      {
        "channelId": "777000000000000001",
        "content": "このチャンネルのルール: ...",
        "embedData": null,
        "updatedBy": "888000000000000001",
        "lastMessageId": "999000000000000001"
      }
    ],
    "reactionRolePanels": [
      {
        "channelId": "101100000000000001",
        "messageId": "121200000000000001",
        "mode": "toggle",
        "title": "ロール選択",
        "description": "ボタンを押してロールを取得・解除できます。",
        "color": "#00A8F3",
        "buttons": [
          { "buttonId": 1, "label": "通知", "emoji": "", "style": "primary", "roleIds": ["131300000000000001"] }
        ],
        "buttonCounter": 1
      }
    ],
    "vacCreatedChannels": [
      {
        "voiceChannelId": "141400000000000001",
        "ownerId": "151500000000000001",
        "createdAt": 1747200000000
      }
    ]
  }
}
```

> 注: `state.openTickets[]` の各要素は `categoryId` で `state.ticketSettings[]` と紐付く。`openTickets[].ticketNumber` は対応する `ticketSettings[].ticketCounter` 以下である前提（`ticketCounter` は最後に発行された番号）。

---

## import

### コマンド定義

**コマンド**: `/guild-settings import`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `file` | Attachment | ✅ | エクスポートしたJSONファイルを添付 |

### 動作フロー

1. 添付ファイルのバリデーション（JSON 形式・`version` フィールド・構造チェック）
2. `guildId` が実行サーバーと一致するか検証（不一致の場合はエラー）
3. チャンネル/ロール ID の存在チェック（不在は警告表示）
4. stateful データのマージ計画を算出（新規 insert 予定件数のカウント）
5. `createWarningEmbed` で確認ダイアログ Embed + ボタンを ephemeral で送信（設定有無サマリー + 新規 insert 予定件数を表示）
6. 「インポートする」ボタン押下 → マージ方式に従いインポート実行 → `localeManager.invalidateLocaleCache(guildId)` → 完了メッセージに `update()`
7. 「キャンセル」ボタン押下 / 60秒タイムアウト → キャンセルメッセージに `update()`

**ビジネスルール:**

- 同一サーバーのバックアップ/リストアのみ対応（`guildId` 一致が必須）
- チャンネル/ロール ID が見つからない場合は警告表示のみでインポート自体は続行可能
- マージ方式は下記「インポートマージ方式」に従う
- インポート全体（設定系の上書き + stateful の insert 群）は単一トランザクション (`prisma.$transaction`) でラップし、部分失敗時は全体をロールバックする
- jsonb カラムの内容（`embedData` / `buttons` 等）に対する深いスキーマ検証は行わない（export 元が同一インスタンスのため有効データ前提。不正データは実利用時に既存のエラーハンドリング経路で検知される）

### インポートマージ方式

**設定系（`settings.*`）: export 上書き**

- `locale` / `errorChannelId` / `afk` / `bumpReminder` / `vac.enabled` / `vac.triggerChannelIds` / `memberLog` / `vcRecruit` を現在の DB 値に関係なく export 値で上書き
- 既存レコードがなければ insert、あれば update

**stateful データ（`state.*`）: 現 DB 優先 + 欠落分のみ insert（削除はしない）**

import 時は現 DB に存在しないものだけを追加し、既存レコードには触れない（更新も削除もしない）。これにより、import 後でも進行中の運用データ（チケット番号進捗・open チケットの本文修正・パネルの最新メッセージ等）が失われない。

| 対象 | マージキー | 動作 |
| --- | --- | --- |
| `state.ticketSettings[]` (`GuildTicketSettings`) | `(guildId, categoryId)` | 同一 `categoryId` の設定が DB にあればスキップ。なければ insert（`ticketCounter` は JSON 値で初期化） |
| `state.openTickets[]` (`Ticket` open のみ) | `channelId` | 同一 `channelId` に open チケットが DB にあればスキップ。なければ insert（`id` は新規 cuid、`status="open"` 固定） |
| `state.stickyMessages[]` (`StickyMessage`) | `channelId` | 同一 `channelId` のレコードが DB にあればスキップ。なければ insert（`id` は新規 cuid） |
| `state.reactionRolePanels[]` (`GuildReactionRolePanel`) | `(channelId, messageId)` | 同一の組のレコードが DB にあればスキップ。なければ insert（`id` は新規 cuid、`buttonCounter` は JSON 値で初期化） |
| `state.vacCreatedChannels[]` (`GuildVacSettings.createdChannels`) | `voiceChannelId` | 同一 `voiceChannelId` が DB の配列にあればスキップ。なければ追加（既存配列に union） |

> マージキーの設計指針: `id` (cuid) は Discord 外部から参照されない内部識別子のため import 時に新規生成し、衝突リスクを排除する。マージキーには Discord 側で実体を識別する値（`channelId` / `messageId` / `categoryId` / `voiceChannelId`）を使う。open Ticket は 1 チャンネル ≒ 1 オープンチケットの運用前提があるため `channelId` をマージキーとする（DB 上は `@@index` のみで unique 制約はないが、運用上は重複しない）。

**チケット番号の整合性:**

`Ticket.ticketNumber` は表示用の連番（DB 上 unique 制約なし、チャンネル名生成用）であり、衝突しても機能影響はない。マージ時の挙動は以下のとおり:

- 新規 insert 時は JSON の `ticketCounter` / `ticketNumber` をそのまま採用する
- `GuildTicketSettings` がスキップ（既存維持）されると、export 側の `ticketCounter` は反映されない。同カテゴリで `state.openTickets[]` が追加されると、表示番号が局所的に非連続になる可能性があるが、チャンネル名や `ticketNumber` の重複は発生しない（次回採番は既存 `ticketCounter + 1` から再開）。

### UI

**Embed（確認ダイアログ）:** `createWarningEmbed` を使用

| 項目 | 内容 |
| --- | --- |
| タイトル | ギルド設定インポート確認 |
| 説明 | 設定系は上書き、stateful データはマージ（既存優先）で取り込みます。この操作は元に戻せません。 |
| フィールド「設定系」 | 各機能の設定有無サマリー（言語 / エラー通知 / AFK / Bump リマインダー / VAC / メンバーログ / VC 募集） |
| フィールド「stateful（新規追加予定）」 | チケット設定 N 件 / open チケット N 件 / スティッキー N 件 / リアクションロールパネル N 件 / VAC 作成済み VC N 件 |

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `guild-settings:import-confirm` | ✅ | インポートする | Danger | 設定を上書きインポートして完了メッセージに更新 |
| `guild-settings:import-cancel` | ❌ | キャンセル | Secondary | キャンセルメッセージに更新 |

**バリデーションエラー:**

| 条件 | メッセージ |
| --- | --- |
| JSONパースエラー | ファイルの形式が正しくありません。エクスポートしたJSONファイルを添付してください。 |
| `version` 非対応 | このファイルのバージョンには対応していません。 |
| `guildId` 不一致 | このファイルは別のサーバーの設定です。同じサーバーでエクスポートしたファイルを使用してください。 |
| チャンネル/ロールID無効 | 一部のチャンネルまたはロールが見つかりません。設定を確認してください。（警告として表示、インポート自体は続行可能） |

---

## データモデル

### GuildSettings

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルド ID（主キー） |
| `locale` | String | Bot 応答言語（デフォルト: `"ja"`） |
| `errorChannelId` | String? | エラー通知チャンネル ID |
| `createdAt` | DateTime | 作成日時 |
| `updatedAt` | DateTime | 更新日時 |

### エクスポート JSON スキーマ（v1）

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `version` | number | スキーマバージョン（現在: `1`） |
| `exportedAt` | string (ISO 8601) | エクスポート日時 |
| `guildId` | string | エクスポート元のギルド ID |
| `settings` | object | 設定系データ（locale / errorChannelId / 各機能設定） |
| `state` | object | stateful データ（チケット設定・open チケット・スティッキー・リアクションロールパネル・VAC 作成済み VC） |

**`settings` フィールドの内訳:**

| キー | 型 | 説明 |
| --- | --- | --- |
| `locale` | string | Bot 応答言語 |
| `errorChannelId` | string? | エラー通知チャンネル ID |
| `afk` | `AfkSettings`? | AFK 設定（[AFK_SPEC](AFK_SPEC.md) 参照） |
| `bumpReminder` | `BumpReminderSettings`? | Bump リマインダー設定 |
| `vac` | `{enabled, triggerChannelIds[]}`? | VAC 設定（createdChannels は `state` 側） |
| `memberLog` | `MemberLogSettings`? | メンバーログ設定 |
| `vcRecruit` | `VcRecruitSettings`? | VC 募集設定（[VC_RECRUIT_SPEC](VC_RECRUIT_SPEC.md) 参照） |

**`state` フィールドの内訳:**

| キー | 型 | 説明 |
| --- | --- | --- |
| `ticketSettings[]` | `GuildTicketSettings[]` | チケット設定パネル（[TICKET_SPEC](TICKET_SPEC.md) 参照） |
| `openTickets[]` | `Ticket[]` | open 状態のチケットのみ（closed は対象外）。`categoryId` で `ticketSettings[]` と紐付く |
| `stickyMessages[]` | `StickyMessage[]` | スティッキーメッセージ（[STICKY_MESSAGE_SPEC](STICKY_MESSAGE_SPEC.md) 参照）。`embedData` は DB 上は jsonb だが export 表現では JSON 文字列として保持（旧 SQLite export 互換） |
| `reactionRolePanels[]` | `GuildReactionRolePanel[]` | リアクションロールパネル（[REACTION_ROLE_SPEC](REACTION_ROLE_SPEC.md) 参照） |
| `vacCreatedChannels[]` | `VacChannelPair[]` | VAC（ボイス自動作成）が自動生成した VC の追跡情報（`GuildVacSettings.createdChannels`）。Bot 再起動後も VC 管理を継続するために必要 |

> 各 stateful データの配列要素では `guildId` を省略する（トップレベルの `guildId` と一致するため）。`id` (cuid) / `createdAt` / `updatedAt` も export には含めない（import 時に DB 側で再生成）。

---

## 制約・制限事項

- reset / reset-all / import の確認ダイアログタイムアウト: 60 秒
- import は**同一サーバー**の設定ファイルのみ対応（異サーバー間のコピーは非対応）
- import は**バックアップ復元・DB 移行**を想定。設定系は上書き、stateful データはマージ（既存優先、削除なし）の簡素化方式
- Bot がギルドからキック・BAN・退出した場合、そのギルドの全設定データ（全機能の設定テーブル・ランタイムデータ）が自動削除される。退出前に設定を保持したい場合は `/guild-settings export` でエクスポートしておくこと
- export 対象外データの一覧は [export セクション](#export) の「export 対象外」表を参照

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/guildSettings.ts`

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `guild-settings.description` | コマンド説明 | ギルド設定を管理（サーバー管理権限が必要） | Manage guild settings (requires Manage Server) |
| `guild-settings.set-locale.description` | サブコマンド説明 | Botの応答言語を設定 | Set bot response language |
| `guild-settings.set-locale.locale.description` | オプション説明 | 設定する言語を選択 | Select a language |
| `guild-settings.set-error-channel.description` | サブコマンド説明 | エラー通知チャンネルを設定 | Set error notification channel |
| `guild-settings.set-error-channel.channel.description` | オプション説明 | エラー通知先テキストチャンネル | Text channel for error notifications |
| `guild-settings.view.description` | サブコマンド説明 | 現在のギルド設定を表示 | View current guild settings |
| `guild-settings.reset.description` | サブコマンド説明 | ギルド設定をリセット | Reset guild settings |
| `guild-settings.reset-all.description` | サブコマンド説明 | 全機能の設定を一括リセット | Reset all feature settings |
| `guild-settings.export.description` | サブコマンド説明 | ギルド設定をエクスポート | Export guild settings |
| `guild-settings.import.description` | サブコマンド説明 | JSONファイルからギルド設定をインポート | Import guild settings from JSON file |
| `guild-settings.import.file.description` | オプション説明 | エクスポートしたJSONファイル | Exported JSON file |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.set_locale_success` | 言語設定成功 | サーバーの言語を「{{locale}}」に設定しました。 | Server language has been set to "{{locale}}". |
| `user-response.set_error_channel_success` | エラーチャンネル設定成功 | エラー通知チャンネルを {{channel}} に設定しました。 | Error notification channel has been set to {{channel}}. |
| `user-response.invalid_channel_type` | チャンネル型エラー | テキストチャンネルを指定してください。 | Please specify a text channel. |
| `user-response.reset_success` | リセット成功 | ギルド設定をリセットしました。 | Guild settings have been reset. |
| `user-response.reset_cancelled` | リセットキャンセル | リセットをキャンセルしました。 | Reset has been cancelled. |
| `user-response.reset_all_success` | 全リセット成功 | 全機能の設定をリセットしました。 | All feature settings have been reset. |
| `user-response.reset_all_cancelled` | 全リセットキャンセル | リセットをキャンセルしました。 | Reset has been cancelled. |
| `user-response.export_success` | エクスポート成功 | ギルド設定をエクスポートしました。 | Guild settings have been exported. |
| `user-response.export_empty` | エクスポート対象なし | エクスポートする設定がありません。 | No settings to export. |
| `user-response.import_success` | インポート成功 | ギルド設定をインポートしました。 | Guild settings have been imported. |
| `user-response.import_cancelled` | インポートキャンセル | インポートをキャンセルしました。 | Import has been cancelled. |
| `user-response.import_invalid_json` | JSONパースエラー | ファイルの形式が正しくありません。エクスポートしたJSONファイルを添付してください。 | Invalid file format. Please attach an exported JSON file. |
| `user-response.import_unsupported_version` | バージョン非対応エラー | このファイルのバージョンには対応していません。 | This file version is not supported. |
| `user-response.import_guild_mismatch` | ギルドID不一致エラー | このファイルは別のサーバーの設定です。同じサーバーでエクスポートしたファイルを使用してください。 | This file belongs to a different server. Please use a file exported from the same server. |
| `user-response.import_missing_channels` | チャンネル/ロール不在警告 | 一部のチャンネルまたはロールが見つかりません。設定を確認してください。 | Some channels or roles were not found. Please review the settings. |


### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.view` | 設定表示タイトル | ギルド設定 | Guild Settings |
| `embed.field.name.locale` | 言語フィールド名 | 言語 | Language |
| `embed.field.name.error_channel` | エラーチャンネルフィールド名 | エラー通知チャンネル | Error Notification Channel |
| `embed.field.value.not_configured` | 未設定値 | 未設定 | Not configured |
| `embed.title.reset_confirm` | リセット確認タイトル | ギルド設定リセット確認 | Guild Settings Reset |
| `embed.description.reset_confirm` | リセット確認説明 | ギルド設定（言語・エラー通知チャンネル）をリセットしますか？\nこの操作は元に戻せません。 | Reset guild settings (language, error channel)?\nThis action cannot be undone. |
| `embed.title.reset_all_confirm` | 全リセット確認タイトル | 全設定リセット確認 | Reset All Settings |
| `embed.description.reset_all_confirm` | 全リセット確認説明 | 全機能の設定をリセットしますか？\n以下の設定がすべて削除されます。この操作は元に戻せません。 | Reset all feature settings?\nAll settings below will be deleted. This action cannot be undone. |
| `embed.field.name.reset_all_target` | 削除対象フィールド名 | 削除対象 | Targets |
| `embed.field.value.reset_all_target` | 削除対象フィールド値 | 言語設定 / エラー通知チャンネル / AFK / VAC / VC募集 / メッセージ固定 / メンバーログ / Bumpリマインダー | Language / Error Channel / AFK / VAC / VC Recruit / Sticky Message / Member Log / Bump Reminder |
| `embed.title.import_confirm` | インポート確認タイトル | ギルド設定インポート確認 | Import Guild Settings |
| `embed.description.import_confirm` | インポート確認説明 | 設定系は上書き、stateful データはマージ（既存優先）で取り込みます。この操作は元に戻せません。 | Settings will be overwritten and stateful data will be merged (existing rows kept). This action cannot be undone. |
| `embed.field.name.import_config` | 設定系フィールド名 | 設定系 | Settings |
| `embed.field.name.import_state` | stateful フィールド名 | stateful（新規追加予定） | Stateful (new inserts) |
| `embed.field.value.import_state_summary` | stateful 件数サマリー | チケット設定: {{ticketSettings}} 件 / open チケット: {{openTickets}} 件 / スティッキー: {{stickyMessages}} 件 / リアクションロール: {{reactionRolePanels}} 件 / VAC 作成 VC: {{vacCreatedChannels}} 件 | Ticket configs: {{ticketSettings}} / Open tickets: {{openTickets}} / Sticky messages: {{stickyMessages}} / Reaction role panels: {{reactionRolePanels}} / VAC created VCs: {{vacCreatedChannels}} |

### UIラベル

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ui.button.reset_confirm` | リセット確認ボタン | リセットする | Reset |
| `ui.button.reset_cancel` | リセットキャンセルボタン | キャンセル | Cancel |
| `ui.button.reset_all_confirm` | 全リセット確認ボタン | リセットする | Reset |
| `ui.button.reset_all_cancel` | 全リセットキャンセルボタン | キャンセル | Cancel |
| `ui.button.import_confirm` | インポート確認ボタン | インポートする | Import |
| `ui.button.import_cancel` | インポートキャンセルボタン | キャンセル | Cancel |

### エラーチャンネル通知

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `error-notification.title` | エラー通知タイトル | エラー通知 | Error Notification |
| `error-notification.warn_title` | 警告通知タイトル | 警告通知 | Warning Notification |
| `error-notification.feature` | 機能フィールド名 | 機能 | Feature |
| `error-notification.action` | 処理フィールド名 | 処理 | Action |
| `error-notification.message` | 詳細フィールド名 | 詳細 | Details |

### ログ

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.locale_set` | 言語設定ログ | 言語設定 GuildId: {{guildId}} Locale: {{locale}} | Language set GuildId: {{guildId}} Locale: {{locale}} |
| `log.error_channel_set` | エラーチャンネル設定ログ | エラー通知チャンネル設定 GuildId: {{guildId}} ChannelId: {{channelId}} | Error channel set GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.reset` | リセットログ | ギルド設定リセット GuildId: {{guildId}} | Guild settings reset GuildId: {{guildId}} |
| `log.reset_all` | 全リセットログ | 全設定リセット GuildId: {{guildId}} | All settings reset GuildId: {{guildId}} |
| `log.exported` | エクスポートログ | ギルド設定エクスポート GuildId: {{guildId}} | Guild settings exported GuildId: {{guildId}} |
| `log.imported` | インポートログ | ギルド設定インポート GuildId: {{guildId}} | Guild settings imported GuildId: {{guildId}} |

---

## テストケース

### ユニットテスト

- [x] set-locale: ja/en ロケール設定
- [x] set-error-channel: テキストチャンネル正常設定、非テキストチャンネルエラー
- [x] view: ギルド設定値（言語・エラーチャンネル）の単一 Embed 表示（設定あり/なし）
- [x] reset: 確認ダイアログ、確認→設定リセット+キャッシュ無効化、キャンセル、タイムアウト
- [x] reset-all: 確認ダイアログ（削除対象フィールド表示）、確認→全削除+キャッシュ無効化、キャンセル
- [x] export: 設定あり→ JSON 添付、設定なし→エラー
- [x] import: JSON パース/バリデーションエラー、確認ダイアログ、リソース不在警告、正常インポート
- [x] export: stateful データ（ticketSettings / openTickets / stickyMessages / reactionRolePanels / vacCreatedChannels）が JSON `state` フィールドに含まれる
- [x] export: `VcRecruitSettings.setups[].createdVoiceChannelIds` が export 対象外であること（aggregate で配列を空にしてから返す）
- [x] export: `StickyMessage.embedData`（DB は jsonb）が JSON 文字列としてシリアライズされる
- [x] import: stateful データのマージ（マージキー一致時スキップ・不一致時 insert）が各モデルで動作
- [x] import: 確認ダイアログに「設定系サマリー」「stateful 新規追加予定件数」が表示される
- [x] import: `setups[].createdVoiceChannelIds` が空配列で書き込まれる

### インテグレーションテスト

- [x] リポジトリ: getSettings / saveSettings / updateSettings / deleteSettings / exists / getLocale
- [x] `IGuildSettingsAggregateRepository.getFullSettings`: stateful データ含む全件取得（unit テストでモック化検証）
- [x] `IGuildSettingsAggregateRepository.importFullSettings`: マージ方式（既存スキップ + 新規 insert）が各 stateful モデルで動作（unit テストでモック化検証）

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| LocaleManager | `invalidateLocaleCache()` による言語キャッシュの即時無効化（set-locale / reset / reset-all / import 後に必須） |
| GuildSettingsRepository | 全設定の取得・更新・削除（データ層は実装済み） |
