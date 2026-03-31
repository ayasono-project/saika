# ギルド設定機能 - 仕様書

> Guild Config - ギルド全体の共通設定の管理・バックアップ機能

最終更新: 2026年3月25日

---

## 概要

サーバー（ギルド）全体に適用される共通設定を管理するコマンドです。言語設定の切り替え、エラー通知チャンネルの設定、全設定の一覧確認、設定リセット、および設定のエクスポート/インポートによるバックアップ・リストアを提供します。

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| set-locale | Bot の応答言語をギルド単位で設定（ja / en） |
| set-error-channel | エラー通知チャンネルを設定 |
| view | 現在のギルド設定をページ形式で表示 |
| reset | ギルド設定（言語・エラー通知チャンネル）をリセット |
| reset-all | 全機能の設定を一括リセット |
| export | 現在のギルド設定をJSON形式でエクスポート |
| import | JSONファイルからギルド設定をインポート |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者 | ManageGuild | 全サブコマンドの実行（コマンドレベルで制御） |
| Bot | AttachFiles | `export` サブコマンドでのJSON設定ファイル添付 |

---

## set-locale

### コマンド定義

**コマンド**: `/guild-config set-locale`

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

**コマンド**: `/guild-config set-error-channel`

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

1. `GuildConfigService.getConfig(guildId)` で `errorChannelId` を取得
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

**i18n キー:** `guildConfig:error-notification.*`（`title`, `warn_title`, `feature`, `action`, `message`）

---

## view

### コマンド定義

**コマンド**: `/guild-config view`

**コマンドオプション:** なし

### 動作フロー

1. `repository.getConfig(guildId)` でギルド設定全体を取得（レコードが存在しない場合はデフォルト設定として表示）
2. 各機能フィールドをパースして各ページ用データを生成
3. ページ 1 の Embed + ボタン + セレクトメニューを ephemeral で返信
4. ボタン / セレクトメニューのインタラクション受信
5. 対応ページの Embed に `interaction.update()` で書き換え
6. 5分タイムアウト後にコンポーネントを `disabled` 化

**ビジネスルール:**

- 各ページの内容は `buildPage(pageIndex, config)` のような純粋関数で生成し、インタラクション受信時に再生成する（メモリ保持不要）
- ページ番号はページジャンプボタンのラベル（`{{page}}/{{total}}ページ`）で表示する
- ページ 2 以降は各機能の `*-config view` が使っている Embed 生成ロジック（`buildViewEmbed` 相当の関数）をそのまま呼び出して再利用する（設定を持たない機能はページに含めない）

### UI

**Embed（ページ 1: ギルド設定）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | 🛡️ ギルド設定 |
| フィールド | 言語: 日本語 (ja) |
| フィールド | エラー通知チャンネル: #channel / 未設定 |

**ページ一覧:**

| ページ番号 | タイトル | 内容 |
| --- | --- | --- |
| 1 | 🛡️ ギルド設定 | 言語 + エラー通知チャンネル |
| 2 | 😴 AFK | AFK の詳細設定 |
| 3 | 🔊 VAC | VAC の詳細設定 |
| 4 | 📢 VC募集 | VC募集の詳細設定 |
| 5 | 📌 メッセージ固定 | スティッキーメッセージの詳細設定 |
| 6 | 👋 メンバーログ | メンバーログの詳細設定 |
| 7 | 🔔 Bumpリマインダー | Bumpリマインダーの詳細設定 |

> ページ数は設定を持つ機能数に応じて増減する。
> ページ 2 以降は対応する `*-config view` コマンドが生成する Embed をそのまま再利用する。
> 機能が未設定の場合は各機能の view と同様「未設定」表示を返す。

**Row 1 - ページネーション（共通コンポーネント）:**

単ページ時はこの行ごと非表示。

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `guild-config:page-first` | ⏮ | ― | Secondary | 最初のページ（1ページ目は `disabled`） |
| `guild-config:page-prev` | ◀ | ― | Secondary | 前のページ（1ページ目は `disabled`） |
| `guild-config:page-jump` | ― | {{page}}/{{total}}ページ | Secondary | 押下でモーダル表示、番号入力でページジャンプ |
| `guild-config:page-next` | ▶ | ― | Secondary | 次のページ（最終ページは `disabled`） |
| `guild-config:page-last` | ⏭ | ― | Secondary | 最後のページ（最終ページは `disabled`） |

**Row 2 - 機能セレクトメニュー:**

| コンポーネント | プレースホルダー | 種別 | 動作 |
| --- | --- | --- | --- |
| `guild-config:page-select` | ページを選択... | StringSelect | 選択したページへ直接移動 |

**セレクトメニュー選択肢:**

| ラベル | value |
| --- | --- |
| 1. 🛡️ ギルド設定 | `guild_config` |
| 2. 😴 AFK | `afk` |
| 3. 🔊 VAC | `vac` |
| 4. 📢 VC募集 | `vc_recruit` |
| 5. 📌 メッセージ固定 | `sticky` |
| 6. 👋 メンバーログ | `member_log` |
| 7. 🔔 Bumpリマインダー | `bump` |

---

## reset

ギルド設定（言語・エラー通知チャンネル）のみをリセットする。各機能の設定は保持される。

### コマンド定義

**コマンド**: `/guild-config reset`

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
| `guild-config:reset-confirm` | 🗑️ | リセットする | Danger | 設定をリセットして完了メッセージに更新 |
| `guild-config:reset-cancel` | ❌ | キャンセル | Secondary | キャンセルメッセージに更新 |

---

## reset-all

全機能の設定を一括リセットする。ギルド設定（言語・エラー通知チャンネル）も含めてすべて削除される。

### コマンド定義

**コマンド**: `/guild-config reset-all`

**コマンドオプション:** なし

### 動作フロー

1. `createWarningEmbed` で確認ダイアログ Embed + ボタンを ephemeral で送信
2. 「リセットする」ボタン押下 → `repository.deleteConfig(guildId)` で全設定を削除 → `localeManager.invalidateLocaleCache(guildId)` → 完了メッセージに `update()`
3. 「キャンセル」ボタン押下 / 60秒タイムアウト → キャンセルメッセージに `update()`

**ビジネスルール:**

- `deleteConfig` 後は `localeManager.invalidateLocaleCache(guildId)` を呼び出してキャッシュを即時クリアする
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
| `guild-config:reset-all-confirm` | 🗑️ | リセットする | Danger | 全設定を削除して完了メッセージに更新 |
| `guild-config:reset-all-cancel` | ❌ | キャンセル | Secondary | キャンセルメッセージに更新 |

---

## export

### コマンド定義

**コマンド**: `/guild-config export`

**コマンドオプション:** なし

### 動作フロー

1. repository から全設定を取得（GuildConfig + 各機能設定）
2. JSON形式にシリアライズ（`version`, `exportedAt`, `guildId`, `config`）
3. JSONファイルを添付した ephemeral メッセージで返信

**ビジネスルール:**

- 添付ファイル名: `guild-config-{guildId}-{timestamp}.json`
- 設定が存在しない場合はエラーメッセージを返す

### UI

**レスポンス（成功）:** `createSuccessEmbed` でエクスポート完了を通知

**エクスポートJSON構造:**

```json
{
  "version": 1,
  "exportedAt": "2026-03-19T12:00:00.000Z",
  "guildId": "123456789012345678",
  "config": {
    "locale": "ja",
    "errorChannelId": "666666666666666666",
    "afk": {
      "channelId": "111111111111111111"
    },
    "bumpReminder": {
      "enabled": true,
      "mentionRoleIds": ["222222222222222222"],
      "mentionUserIds": []
    },
    "vac": {
      "triggerChannelId": "333333333333333333"
    },
    "memberLog": {
      "channelId": "444444444444444444",
      "joinMessage": null,
      "leaveMessage": null
    },
    "vcRecruit": {
      "channelId": "555555555555555555"
    }
  }
}
```

---

## import

### コマンド定義

**コマンド**: `/guild-config import`

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `file` | Attachment | ✅ | エクスポートしたJSONファイルを添付 |

### 動作フロー

1. 添付ファイルのバリデーション（JSON形式・`version` フィールド・構造チェック）
2. `guildId` が実行サーバーと一致するか検証（不一致の場合はエラー）
3. チャンネル/ロールIDの存在チェック（不在は警告表示）
4. `createWarningEmbed` で確認ダイアログ Embed + ボタンを ephemeral で送信
5. 「インポートする」ボタン押下 → 既存設定を上書き保存 → `localeManager.invalidateLocaleCache(guildId)` → 完了メッセージに `update()`
6. 「キャンセル」ボタン押下 / 60秒タイムアウト → キャンセルメッセージに `update()`

**ビジネスルール:**

- 同一サーバーのバックアップ/リストアのみ対応（`guildId` 一致が必須）
- チャンネル/ロールIDが見つからない場合は警告表示のみでインポート自体は続行可能

### UI

**Embed（確認ダイアログ）:** `createWarningEmbed` を使用

| 項目 | 内容 |
| --- | --- |
| タイトル | ギルド設定インポート確認 |
| 説明 | 現在の設定が上書きされます。この操作は元に戻せません。 |
| フィールド | インポート内容（各機能の設定有無サマリー） |

**ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `guild-config:import-confirm` | ✅ | インポートする | Danger | 設定を上書きインポートして完了メッセージに更新 |
| `guild-config:import-cancel` | ❌ | キャンセル | Secondary | キャンセルメッセージに更新 |

**バリデーションエラー:**

| 条件 | メッセージ |
| --- | --- |
| JSONパースエラー | ファイルの形式が正しくありません。エクスポートしたJSONファイルを添付してください。 |
| `version` 非対応 | このファイルのバージョンには対応していません。 |
| `guildId` 不一致 | このファイルは別のサーバーの設定です。同じサーバーでエクスポートしたファイルを使用してください。 |
| チャンネル/ロールID無効 | 一部のチャンネルまたはロールが見つかりません。設定を確認してください。（警告として表示、インポート自体は続行可能） |

---

## データモデル

### GuildConfig（既存 + 拡張）

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルドID（主キー） |
| `locale` | String | Bot 応答言語（デフォルト: `"ja"`） |
| `errorChannelId` | String? | エラー通知チャンネルID（新規追加） |
| `createdAt` | DateTime | 作成日時 |
| `updatedAt` | DateTime | 更新日時 |

> `locale` フィールドは Prisma スキーマ・`IBaseGuildRepository` インターフェース・`LocaleManager` のいずれも既に実装済み。`errorChannelId` は新規追加。

### エクスポートJSON スキーマ

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `version` | number | スキーマバージョン（現在: `1`） |
| `exportedAt` | string (ISO 8601) | エクスポート日時 |
| `guildId` | string | エクスポート元のギルドID |
| `config` | object | 全設定データ（locale + errorChannelId + 各機能設定） |

---

## 制約・制限事項

- view のページ操作タイムアウト: 5分（タイムアウト後はコンポーネントを `disabled` 化）
- reset / reset-all / import の確認ダイアログタイムアウト: 60秒
- import は同一サーバーの設定ファイルのみ対応（異サーバー間のコピーは非対応）
- Bot がギルドからキック・BAN・退出した場合、そのギルドの全設定データ（全機能の設定テーブル・ランタイムデータ）が自動削除される。退出前に設定を保持したい場合は `/guild-config export` でエクスポートしておくこと

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/guildConfig.ts`

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `guild-config.description` | コマンド説明 | ギルド設定を管理（サーバー管理権限が必要） | Manage guild settings (requires Manage Server) |
| `guild-config.set-locale.description` | サブコマンド説明 | Botの応答言語を設定 | Set bot response language |
| `guild-config.set-locale.locale.description` | オプション説明 | 設定する言語を選択 | Select a language |
| `guild-config.set-error-channel.description` | サブコマンド説明 | エラー通知チャンネルを設定 | Set error notification channel |
| `guild-config.set-error-channel.channel.description` | オプション説明 | エラー通知先テキストチャンネル | Text channel for error notifications |
| `guild-config.view.description` | サブコマンド説明 | 現在のギルド設定を表示 | View current guild settings |
| `guild-config.reset.description` | サブコマンド説明 | ギルド設定をリセット | Reset guild settings |
| `guild-config.reset-all.description` | サブコマンド説明 | 全機能の設定を一括リセット | Reset all feature settings |
| `guild-config.export.description` | サブコマンド説明 | ギルド設定をエクスポート | Export guild settings |
| `guild-config.import.description` | サブコマンド説明 | JSONファイルからギルド設定をインポート | Import guild settings from JSON file |
| `guild-config.import.file.description` | オプション説明 | エクスポートしたJSONファイル | Exported JSON file |

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
| `embed.description.import_confirm` | インポート確認説明 | 現在の設定が上書きされます。この操作は元に戻せません。 | Current settings will be overwritten. This action cannot be undone. |

### UIラベル

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ui.select.view_placeholder` | ページセレクトプレースホルダー | ページを選択... | Select a page... |
| `ui.select.guild_config` | セレクト選択肢 | ギルド設定 | Guild Settings |
| `ui.select.afk` | セレクト選択肢 | AFK | AFK |
| `ui.select.vac` | セレクト選択肢 | VAC | VAC |
| `ui.select.vc_recruit` | セレクト選択肢 | VC募集 | VC Recruit |
| `ui.select.sticky` | セレクト選択肢 | メッセージ固定 | Sticky Message |
| `ui.select.member_log` | セレクト選択肢 | メンバーログ | Member Log |
| `ui.select.bump` | セレクト選択肢 | Bumpリマインダー | Bump Reminder |
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

※ ページネーション関連キー（`page_jump.label`, `page_jump_modal.title`, `page_jump_modal.input.label`）は `common.ts` で共通定義

---

## テストケース

### ユニットテスト

- [x] set-locale: ja/enロケール設定
- [x] set-error-channel: テキストチャンネル正常設定、非テキストチャンネルエラー
- [x] view: ページネーション、セレクトメニューでのページ切替、各機能ページの表示（設定あり/なし）
- [x] reset: 確認ダイアログ、確認→設定リセット+キャッシュ無効化、キャンセル、タイムアウト
- [x] reset-all: 確認ダイアログ（削除対象フィールド表示）、確認→全削除+キャッシュ無効化、キャンセル
- [x] export: 設定あり→JSON添付、設定なし→エラー
- [x] import: JSONパース/バリデーションエラー、確認ダイアログ、リソース不在警告、正常インポート

### インテグレーションテスト

- [x] リポジトリ: getConfig/saveConfig/updateConfig/deleteConfig/exists/getLocale

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| LocaleManager | `invalidateLocaleCache()` による言語キャッシュの即時無効化（set-locale / reset / reset-all / import 後に必須） |
| 各機能 config view | view のページ 2〜8 で各機能の `buildViewEmbed` 相当の関数を再利用 |
| GuildConfigRepository | 全設定の取得・更新・削除（データ層は実装済み） |
