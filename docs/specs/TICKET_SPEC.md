# チケット機能 - 仕様書

> ユーザーがボタンからチケット（専用チャンネル）を作成し、スタッフとやりとりできるチケット機能

最終更新: 2026年3月26日

---

## 概要

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| パネル設置 | 管理者がチケット作成用パネル（Embed + ボタン）をチャンネルに設置 |
| チケット作成 | ユーザーがパネルのボタンを押してチケットチャンネルを作成 |
| チケットクローズ | チケットを読み取り専用にする（ボタン or コマンド） |
| チケット再オープン | クローズ済みチケットを再オープン（ボタン or コマンド） |
| チケット削除 | チケットチャンネルを即時削除（スタッフのみ、ボタン or コマンド） |
| 自動削除 | クローズ後、設定期間経過でチケットチャンネルを自動削除 |
| `/ticket-config` | チケット機能の設定管理 |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者（config系） | ManageGuild | 設定管理 |
| 実行者（close/open） | なし（作成者 or スタッフロール判定） | チケット操作 |
| 実行者（delete） | なし（スタッフロール判定） | チケット削除 |
| Bot | ManageChannels | チケットチャンネルの作成・削除 |
| Bot | ManageRoles | チケットチャンネルの権限オーバーライド設定 |
| Bot | SendMessages | 初期メッセージ・通知送信 |

---

## パネル設置（setup）

### コマンド定義

**コマンド**: `/ticket-config setup`

**実行権限**: ManageGuild

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `category` | Channel（CategoryChannel） | ✅ | チケット作成先カテゴリ |

### 動作フロー

1. ManageGuild 権限チェック
2. 指定カテゴリが既に別のパネルで使用されていないか確認
3. RoleSelectMenu を表示（スタッフロール選択、複数選択可）
4. ロール選択後、モーダルを表示（パネルタイトル・説明文入力、デフォルト値プリフィル）
5. 実行チャンネルにパネル Embed + ボタンを設置
6. 設定を DB に保存

**ビジネスルール:**

- 同一カテゴリに対して複数のパネルを設置不可 → エラー
- スタッフロールは1つ以上必須
- パネルタイトル・説明文はデフォルト値がプリフィルされる

### UI

**RoleSelectMenu:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `ticket:setup-roles:<sessionId>` | RoleSelect（複数選択可） | スタッフロールを選択 |

**モーダル:**

| フィールド | ラベル | スタイル | 必須 | デフォルト値 |
| --- | --- | --- | --- | --- |
| `ticket:setup-title` | パネルタイトル | Short | ✅ | サポート |
| `ticket:setup-description` | パネル説明文 | Paragraph | ✅ | サポートが必要な場合は下のボタンからチケットを作成してください。 |
| `ticket:setup-color` | カラー（例: #00A8F3） | Short | ❌ | #00A8F3 |

**パネル Embed（設置後）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | {カスタムタイトル}（デフォルト: サポート） |
| 説明 | {カスタム説明文}（デフォルト: サポートが必要な場合は下のボタンからチケットを作成してください。） |
| カラー | {カスタムカラー}（デフォルト: `#00A8F3`） |

**パネルボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `ticket:create:<categoryId>` | 🎫 | チケットを作成 | Primary | チケット作成モーダルを表示 |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | チケットパネルを設置しました。 |

---

## チケット作成

### トリガー

**イベント**: パネルのボタンクリック

**発火条件:**

- ユーザーがパネルの「チケットを作成」ボタンをクリック

### 動作フロー

1. ユーザーの同時チケット数が上限未満か確認
2. モーダルを表示（件名・詳細入力）
3. 指定カテゴリ配下にチケットチャンネルを作成（チャンネル名: `ticket-{連番}`）
   - Bot に `ManageChannels` / `ManageRoles` 権限が不足している場合は Bot権限不足エラー（共通フォーマット、[MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) 参照）
4. チャンネル権限オーバーライドを設定:
   - `@everyone`: ViewChannel 拒否
   - チケット作成者: ViewChannel / SendMessages / ReadMessageHistory 許可
   - スタッフロール: ViewChannel / SendMessages / ReadMessageHistory 許可
   - Bot: ViewChannel / SendMessages / ManageChannels / ManageRoles 許可
5. 初期メッセージ Embed + ボタンを送信
6. 作成者とスタッフロールへのメンションメッセージを送信（通知目的）
7. チケット情報を DB に保存

**ビジネスルール:**

- ユーザーあたりの同時チケット上限（デフォルト1件、設定可）を超える場合はエラー
- 連番はカテゴリごとにインクリメント

### UI

**チケット作成モーダル:**

| フィールド | ラベル | スタイル | 必須 | 制約 |
| --- | --- | --- | --- | --- |
| `ticket:create-subject` | 件名 | Short | ✅ | 最大100文字 |
| `ticket:create-detail` | 詳細 | Paragraph | ✅ | 最大1000文字 |

**初期メッセージ Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | チケット: {件名} |
| 説明 | {詳細内容} |
| フィールド: 作成者 | @User |
| フィールド: 作成日時 | YYYY/MM/DD HH:mm |
| カラー | パネル設定のカスタムカラー（デフォルト: `#00A8F3`） |

**初期メッセージボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `ticket:close:<ticketId>` | 🔒 | クローズ | Secondary | チケットをクローズ（作成者・スタッフ） |
| `ticket:delete:<ticketId>` | 🗑️ | 削除 | Danger | チケットを即時削除（スタッフのみ） |

---

## チケットクローズ

### トリガー

**イベント**: ボタンクリック or `/ticket close` コマンド

### コマンド定義

**コマンド**: `/ticket close`

**実行権限**: チケット作成者 or スタッフロール

**コマンドオプション:** なし（チケットチャンネル内で実行）

### 動作フロー

1. 実行チャンネルがチケットチャンネルか確認
2. 実行者がチケット作成者またはスタッフロールを持っているか確認
3. チケットが open 状態か確認
4. チャンネルの権限オーバーライドを変更:
   - チケット作成者: SendMessages 拒否
   - スタッフロール: SendMessages 拒否
5. チケットステータスを `closed` に更新
6. 自動削除タイマーを開始（残り時間から再開）
7. クローズ通知 Embed + ボタンを送信

**ビジネスルール:**

- 既にクローズ済みの場合はエラー
- 自動削除タイマーは `autoDeleteDays - elapsedDeleteMs` で残り時間を算出

### UI

**クローズ通知 Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | チケットクローズ |
| 説明 | チケットをクローズしました。<t:{{timestamp}}:R>に自動削除されます。 |

`createInfoEmbed` 使用

**クローズ通知ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `ticket:open:<ticketId>` | 🔓 | 再オープン | Secondary | チケットを再オープン（作成者・スタッフ） |
| `ticket:delete:<ticketId>` | 🗑️ | 削除 | Danger | チケットを即時削除（スタッフのみ） |

---

## チケット再オープン

### トリガー

**イベント**: ボタンクリック or `/ticket open` コマンド

### コマンド定義

**コマンド**: `/ticket open`

**実行権限**: チケット作成者 or スタッフロール

**コマンドオプション:** なし（チケットチャンネル内で実行）

### 動作フロー

1. 実行チャンネルがチケットチャンネルか確認
2. 実行者がチケット作成者またはスタッフロールを持っているか確認
3. チケットが closed 状態か確認
4. チャンネルの権限オーバーライドを元に戻す:
   - チケット作成者: SendMessages 許可
   - スタッフロール: SendMessages 許可
5. 自動削除タイマーをストップ（経過時間を `elapsedDeleteMs` に保持）
6. チケットステータスを `open` に更新
7. クローズ通知 Embed を更新（ボタンを無効化 or 削除）
8. 再オープン通知を送信

**ビジネスルール:**

- 既にオープン中の場合はエラー
- タイマーの経過時間は保持される（リセットしない）

### UI

**再オープン通知 Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | チケットオープン |
| 説明 | チケットをオープンしました。 |

`createInfoEmbed` 使用

**再オープン通知ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `ticket:close:<ticketId>` | 🔒 | クローズ | Secondary | チケットをクローズ（作成者・スタッフ） |
| `ticket:delete:<ticketId>` | 🗑️ | 削除 | Danger | チケットを即時削除（スタッフのみ） |

---

## チケット削除

### トリガー

**イベント**: ボタンクリック or `/ticket delete` コマンド

### コマンド定義

**コマンド**: `/ticket delete`

**実行権限**: スタッフロールのみ

**コマンドオプション:** なし（チケットチャンネル内で実行）

### 動作フロー

1. 実行チャンネルがチケットチャンネルか確認
2. 実行者がスタッフロールを持っているか確認
3. 確認ダイアログ Embed を表示
4. 確認ボタンが押されたら:
   - 自動削除タイマーをキャンセル（存在する場合）
   - DB からチケットレコードを削除
   - チケットチャンネルを削除

**ビジネスルール:**

- チケット作成者は即時削除不可
- 確認ダイアログ必須

### UI

**確認ダイアログ Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | チケット削除確認 |
| 説明 | このチケットチャンネルを削除します。この操作は取り消せません。 |

`createErrorEmbed` 使用

**確認ダイアログボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `ticket:delete-confirm:<ticketId>` | 🗑️ | 削除する | Danger | チケットチャンネルを削除 |
| `ticket:delete-cancel:<ticketId>` | ❌ | キャンセル | Secondary | ダイアログを閉じる |

---

## 自動削除

### トリガー

**イベント**: クローズ後、設定期間経過（スケジューラー）

**発火条件:**

- チケットが `closed` 状態
- `autoDeleteDays` で設定された期間（経過時間を差し引き）が満了

### 動作フロー

1. DB からチケットレコードを削除
2. チケットチャンネルを削除

**ビジネスルール:**

- Bot 再起動時に DB から `closed` 状態のチケットを取得し、残り時間でタイマーを再スケジュール
- 残り時間 = `autoDeleteDays` (ms換算) - `elapsedDeleteMs`
- 残り時間が0以下の場合は即時削除

---

## パネル削除検知

パネルメッセージまたはパネル設置チャンネルが削除された場合、設定を自動クリーンアップする。

### トリガー

**イベント**: `messageDelete` / `channelDelete`

**発火条件:**

- `messageDelete`: 削除されたメッセージの ID がいずれかの `panelMessageId` と一致する
- `channelDelete`: 削除されたチャンネルの ID がいずれかの `panelChannelId` と一致する

### 動作フロー

1. 削除されたメッセージ ID / チャンネル ID から対応する `GuildTicketConfig` を特定
2. 該当設定を DB から削除

**ビジネスルール:**

- **既存チケットチャンネルは削除しない** — オープン中のチケットで進行中のやりとりが失われるのを防ぐため
- **チケットの DB レコードは残す** — クローズ・再オープン・削除ボタンは引き続き動作する
- **自動削除タイマーはクローズ済みチケットについてそのまま維持** — 設定削除前の `autoDeleteDays` に基づくタイマーが満了すれば通常通り削除される
- 新規チケットの作成のみ不可能になる（パネルボタンが存在しないため）
- 管理者が再設置したい場合は `/ticket-config setup` で再度パネルを設置できる

### 操作時フォールバック

Bot がオフラインの間に削除が行われた場合、イベントを受信できない。そのため、以下の箇所ではパネルメッセージの存在確認を行い、不在の場合は DB レコードを削除してエラーを返す:

- `view`（設定一覧表示時 — パネルメッセージが存在しない設定を DB から削除して除外）
- `teardown`（撤去対象一覧表示時 — パネルメッセージが存在しない設定を DB から削除して除外）
- `edit-panel`（モーダル送信後のメッセージ更新時）
- `setup`（既存設定の重複チェック時 — パネルメッセージが存在しない場合は古い設定を削除し、再セットアップを許可）
- チケット作成ボタン（ボタンクリック時に config が見つからない場合はエラー Embed を返す）

**エラーメッセージ:**

| 項目 | 内容 |
| --- | --- |
| 説明 | パネルメッセージが見つかりませんでした。パネルが削除された可能性があります。 |

（キー `user-response.panel_not_found` を使用）

### 翻訳キー

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.panel_not_found` | パネルメッセージ不在 | パネルメッセージが見つかりませんでした。パネルが削除された可能性があります。 | Panel message not found. The panel may have been deleted. |
| `user-response.panels_cleaned_up` | パネルクリーンアップ通知 | {{count}}件のパネルが削除済みのためクリーンアップしました。 | {{count}} panel(s) cleaned up because the message was deleted. |

---

## /ticket-config setup

（「パネル設置（setup）」セクション参照）

---

## /ticket-config teardown

### コマンド定義

**コマンド**: `/ticket-config teardown`

**実行権限**: ManageGuild

**コマンドオプション:** なし（セレクトメニューでカテゴリ選択）

### 動作フロー

1. ManageGuild 権限チェック
2. 設定済みカテゴリ一覧を確認
3. **1件の場合**: セレクトメニューをスキップし、直接確認ダイアログを表示
4. **複数件の場合**: セレクトメニュー（複数選択可）+ 全選択ボタンを表示
5. カテゴリ選択後、選択されたカテゴリのオープン中チケットの有無を確認
6. オープン中チケットがある場合は警告 Embed を表示
7. 確認後:
   - 自動削除タイマーをすべてキャンセル
   - 全チケットチャンネルを削除
   - パネルメッセージを削除
   - DB からチケットレコードと設定を削除

**ビジネスルール:**

- 設定が1件の場合はセレクトメニューをスキップ（UX向上）
- セレクトメニューは複数選択可能（全カテゴリを一度に撤去可能）
- オープン中チケットがない場合は通常の確認フロー
- オープン中チケットがある場合は警告付き確認（チケットも全削除）

### UI

**カテゴリ選択セレクトメニュー（複数件の場合のみ）:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `ticket:teardown-select:<sessionId>` | StringSelect（複数選択可） | 撤去するカテゴリを選択 |

**確認 Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | チケット撤去確認 |
| 説明 | オープンチケットなし: 選択したカテゴリのパネル・設定を削除します。この操作は取り消せません。 |
| 説明（オープンチケットあり） | オープン中のチケットが{{count}}件あります。続行するとチケットチャンネルも全て削除されます。この操作は取り消せません。 |
| フィールド: 削除対象カテゴリ | `#カテゴリ1`, `#カテゴリ2`（カンマ区切り） |
| フィールド: オープン中のチケット（N件） | `#ticket-1`, `#ticket-2`...（上限超過時は「他 X件」と省略、オープンチケットがある場合のみ表示） |

`createWarningEmbed` 使用

---

## /ticket-config view

### コマンド定義

**コマンド**: `/ticket-config view`

**実行権限**: ManageGuild

**コマンドオプション:** なし

### 動作フロー

1. ManageGuild 権限チェック
2. 全カテゴリの設定を取得
3. 設定がない場合は「設定がありません」と表示
4. 1件の場合はそのまま Embed 表示
5. 複数件の場合はページネーション + カテゴリ選択で表示

### UI

**設定表示 Embed（1ページ = 1カテゴリ）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | チケット設定 |
| フィールド: カテゴリ | `#カテゴリ名` |
| フィールド: スタッフロール | `@Role1` `@Role2` ... |
| フィールド: 自動削除期間 | {N}日 |
| フィールド: 同時チケット上限 | {N}件 |
| フィールド: パネル設置チャンネル | `#チャンネル名` |
| フィールド: オープン中のチケット数 | N件 |

`createInfoEmbed` 使用

**ページネーション（複数カテゴリ時）:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `ticket:page-first` | ⏮ | ― | Secondary | 最初のページ（1ページ目は disabled） |
| `ticket:page-prev` | ◀ | ― | Secondary | 前のページ（1ページ目は disabled） |
| `ticket:page-jump` | ― | {{page}}/{{total}}ページ | Secondary | 押下でモーダル表示、番号入力でページジャンプ |
| `ticket:page-next` | ▶ | ― | Secondary | 次のページ（最終ページは disabled） |
| `ticket:page-last` | ⏭ | ― | Secondary | 最後のページ（最終ページは disabled） |

**カテゴリ選択セレクトメニュー:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `ticket:view-select:<sessionId>` | StringSelect | カテゴリを選択してページジャンプ |

---

## /ticket-config edit-panel

### コマンド定義

**コマンド**: `/ticket-config edit-panel`

**実行権限**: ManageGuild

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `category` | Channel（CategoryChannel） | ✅ | 編集対象のカテゴリ |

### 動作フロー

1. ManageGuild 権限チェック
2. 指定カテゴリの設定が存在するか確認
3. モーダルを表示（現在の設定値をプリフィル）
4. パネル Embed を更新
5. 設定を DB に保存

### UI

**モーダル:**

| フィールド | ラベル | スタイル | 必須 | プリフィル |
| --- | --- | --- | --- | --- |
| `ticket:edit-panel-title` | パネルタイトル | Short | ✅ | 現在の設定値 |
| `ticket:edit-panel-description` | パネル説明文 | Paragraph | ✅ | 現在の設定値 |
| `ticket:edit-panel-color` | カラー（例: #00A8F3） | Short | ❌ | 現在の設定値 |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | パネルを更新しました。 |

---

## /ticket-config set-roles

### コマンド定義

**コマンド**: `/ticket-config set-roles`

**実行権限**: ManageGuild

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `category` | Channel（CategoryChannel） | ✅ | 対象カテゴリ |

### 動作フロー

1. ManageGuild 権限チェック
2. 指定カテゴリの設定が存在するか確認
3. RoleSelectMenu を表示（複数選択可）
4. 選択されたロールで既存ロールを上書き
5. 設定を DB に保存

**ビジネスルール:**

- 1つ以上のロール選択が必須

### UI

**RoleSelectMenu:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `ticket:set-roles:<sessionId>` | RoleSelect（複数選択可） | スタッフロールを上書き |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | スタッフロールを設定しました。 |

---

## /ticket-config add-roles

### コマンド定義

**コマンド**: `/ticket-config add-roles`

**実行権限**: ManageGuild

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `category` | Channel（CategoryChannel） | ✅ | 対象カテゴリ |

### 動作フロー

1. ManageGuild 権限チェック
2. 指定カテゴリの設定が存在するか確認
3. RoleSelectMenu を表示（複数選択可）
4. 選択されたロールを既存ロールに追加
5. 設定を DB に保存

**ビジネスルール:**

- 既に追加済みのロールは重複登録しない（冪等）

### UI

**RoleSelectMenu:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `ticket:add-roles:<sessionId>` | RoleSelect（複数選択可） | スタッフロールを追加 |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | スタッフロールを追加しました。 |

---

## /ticket-config remove-roles

### コマンド定義

**コマンド**: `/ticket-config remove-roles`

**実行権限**: ManageGuild

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `category` | Channel（CategoryChannel） | ✅ | 対象カテゴリ |

### 動作フロー

1. ManageGuild 権限チェック
2. 指定カテゴリの設定が存在するか確認
3. RoleSelectMenu を表示（複数選択可）
4. 選択されたロールを既存ロールから削除
5. 設定を DB に保存

**ビジネスルール:**

- 最後の1ロールを削除しようとした場合はエラー（スタッフロール0件は不可）

### UI

**RoleSelectMenu:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `ticket:remove-roles:<sessionId>` | RoleSelect（複数選択可） | スタッフロールを削除 |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | スタッフロールを削除しました。 |

---

## /ticket-config set-auto-delete

### コマンド定義

**コマンド**: `/ticket-config set-auto-delete`

**実行権限**: ManageGuild

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `category` | Channel（CategoryChannel） | ✅ | 対象カテゴリ |
| `days` | Integer | ✅ | 自動削除までの日数 |

### 動作フロー

1. ManageGuild 権限チェック
2. 指定カテゴリの設定が存在するか確認
3. 自動削除日数を更新
4. 設定を DB に保存

**ビジネスルール:**

- `days` は 1 以上の整数
- 既存のクローズ済みチケットのタイマーには影響しない（新規クローズ分から適用）

### UI

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | 自動削除期間を{{days}}日に設定しました。 |

---

## /ticket-config set-max-tickets

### コマンド定義

**コマンド**: `/ticket-config set-max-tickets`

**実行権限**: ManageGuild

**コマンドオプション:**

| オプション名 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `category` | Channel（CategoryChannel） | ✅ | 対象カテゴリ |
| `count` | Integer | ✅ | ユーザーあたりの同時チケット上限 |

### 動作フロー

1. ManageGuild 権限チェック
2. 指定カテゴリの設定が存在するか確認
3. 同時チケット上限を更新
4. 設定を DB に保存

**ビジネスルール:**

- `count` は 1 以上の整数

### UI

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | 同時チケット上限を{{count}}件に設定しました。 |

---

## データモデル

### GuildTicketConfig

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `guildId` | String | ギルドID（複合主キー） |
| `categoryId` | String | チケット作成先カテゴリID（複合主キー） |
| `enabled` | Boolean | 有効/無効（デフォルト: false） |
| `staffRoleIds` | String | スタッフロールID（JSON配列） |
| `panelChannelId` | String | パネル設置チャンネルID |
| `panelMessageId` | String | パネルメッセージID |
| `panelTitle` | String | パネルタイトル（デフォルト: サポート） |
| `panelDescription` | String | パネル説明文（デフォルト: サポートが必要な場合は下のボタンからチケットを作成してください。） |
| `panelColor` | String | パネル・チケットEmbedカラー（デフォルト: #00A8F3） |
| `autoDeleteDays` | Int | 自動削除日数（デフォルト: 7） |
| `maxTicketsPerUser` | Int | ユーザーあたり同時チケット上限（デフォルト: 1） |
| `ticketCounter` | Int | チケット連番カウンター（デフォルト: 0） |

### Ticket

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | String | 主キー（cuid） |
| `guildId` | String | ギルドID |
| `categoryId` | String | 対応するカテゴリID |
| `channelId` | String | チケットチャンネルID |
| `userId` | String | 作成者のユーザーID |
| `ticketNumber` | Int | チケット番号（連番） |
| `subject` | String | 件名 |
| `status` | String | `open` / `closed` |
| `elapsedDeleteMs` | Int | 削除タイマー経過時間（ミリ秒、デフォルト: 0） |
| `closedAt` | DateTime? | 最後にクローズした日時 |
| `createdAt` | DateTime | 作成日時 |
| `updatedAt` | DateTime | 更新日時 |

---

## 制約・制限事項

- 同一カテゴリに対して複数のパネルを設置不可
- ユーザーあたりの同時チケット上限（デフォルト1件、設定変更可）
- チケット即時削除はスタッフロールのみ
- 自動削除タイマーはBot再起動時にDBから復元
- パネル Embed のフィールド値上限（1024文字）を超えるチケット一覧は先頭N件 + 「他 X件」で省略
- パネルメッセージまたはパネル設置チャンネルが削除された場合、設定のみ自動削除（既存チケットは維持）

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/ticket.ts`

キー命名規則は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「翻訳キー命名規則」を参照。

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ticket.description` | コマンド説明 | チケットの操作 | Manage tickets |
| `ticket.close.description` | サブコマンド説明 | チケットをクローズ | Close the ticket |
| `ticket.open.description` | サブコマンド説明 | チケットを再オープン | Reopen the ticket |
| `ticket.delete.description` | サブコマンド説明 | チケットを削除 | Delete the ticket |
| `ticket-config.description` | コマンド説明 | チケット機能の設定（サーバー管理権限が必要） | Configure ticket feature (requires Manage Server) |
| `ticket-config.setup.description` | サブコマンド説明 | チケットパネルを設置 | Set up ticket panel |
| `ticket-config.setup.category.description` | オプション説明 | チケット作成先カテゴリ | Category for ticket channels |
| `ticket-config.teardown.description` | サブコマンド説明 | チケットパネルを撤去 | Remove ticket panel |
| `ticket-config.view.description` | サブコマンド説明 | 現在の設定を表示 | Show current settings |
| `ticket-config.edit-panel.description` | サブコマンド説明 | パネルのタイトル・説明文を編集 | Edit panel title and description |
| `ticket-config.edit-panel.category.description` | オプション説明 | 編集対象のカテゴリ | Target category |
| `ticket-config.set-roles.description` | サブコマンド説明 | スタッフロールを上書き設定 | Set staff roles (overwrite) |
| `ticket-config.set-roles.category.description` | オプション説明 | 対象カテゴリ | Target category |
| `ticket-config.add-roles.description` | サブコマンド説明 | スタッフロールを追加 | Add staff roles |
| `ticket-config.add-roles.category.description` | オプション説明 | 対象カテゴリ | Target category |
| `ticket-config.remove-roles.description` | サブコマンド説明 | スタッフロールを削除 | Remove staff roles |
| `ticket-config.remove-roles.category.description` | オプション説明 | 対象カテゴリ | Target category |
| `ticket-config.set-auto-delete.description` | サブコマンド説明 | 自動削除期間を設定 | Set auto-delete period |
| `ticket-config.set-auto-delete.category.description` | オプション説明 | 対象カテゴリ | Target category |
| `ticket-config.set-auto-delete.days.description` | オプション説明 | 自動削除までの日数 | Days until auto-delete |
| `ticket-config.set-max-tickets.description` | サブコマンド説明 | 同時チケット上限を設定 | Set max tickets per user |
| `ticket-config.set-max-tickets.category.description` | オプション説明 | 対象カテゴリ | Target category |
| `ticket-config.set-max-tickets.count.description` | オプション説明 | ユーザーあたりの上限数 | Max tickets per user |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.setup_success` | パネル設置成功 | チケットパネルを設置しました。 | Ticket panel has been set up. |
| `user-response.teardown_success` | パネル撤去成功 | チケットパネルを撤去しました。 | Ticket panel has been removed. |
| `user-response.teardown_cancelled` | 撤去キャンセル | キャンセルしました。 | Cancelled. |
| `user-response.ticket_created` | チケット作成成功 | チケットを作成しました: {{channel}} | Ticket created: {{channel}} |
| `user-response.ticket_closed` | クローズ成功 | チケットをクローズしました。 | Ticket has been closed. |
| `user-response.ticket_opened` | 再オープン成功 | チケットを再オープンしました。 | Ticket has been reopened. |
| `user-response.ticket_deleted` | 削除成功 | チケットを削除しました。 | Ticket has been deleted. |
| `user-response.delete_cancelled` | 削除キャンセル | キャンセルしました。 | Cancelled. |
| `user-response.edit_panel_success` | パネル編集成功 | パネルを更新しました。 | Panel has been updated. |
| `user-response.set_roles_success` | ロール上書き成功 | スタッフロールを設定しました。 | Staff roles have been set. |
| `user-response.add_roles_success` | ロール追加成功 | スタッフロールを追加しました。 | Staff roles have been added. |
| `user-response.remove_roles_success` | ロール削除成功 | スタッフロールを削除しました。 | Staff roles have been removed. |
| `user-response.set_auto_delete_success` | 自動削除期間変更成功 | 自動削除期間を{{days}}日に設定しました。 | Auto-delete period set to {{days}} days. |
| `user-response.set_max_tickets_success` | 上限変更成功 | 同時チケット上限を{{count}}件に設定しました。 | Max tickets per user set to {{count}}. |
| `user-response.category_already_setup` | カテゴリ重複エラー | このカテゴリには既にチケットパネルが設定されています。 | A ticket panel is already set up for this category. |
| `user-response.config_not_found` | 設定未存在エラー | このカテゴリのチケット設定が見つかりません。 | Ticket configuration not found for this category. |
| `user-response.no_configs` | 設定なしエラー | チケット設定がありません。 | No ticket configurations found. |
| `user-response.not_ticket_channel` | チケットチャンネル外エラー | このコマンドはチケットチャンネル内でのみ実行できます。 | This command can only be used in a ticket channel. |
| `user-response.not_authorized` | 権限不足エラー | この操作を実行する権限がありません。 | You do not have permission to perform this action. |
| `user-response.ticket_already_closed` | 既にクローズ済みエラー | このチケットは既にクローズされています。 | This ticket is already closed. |
| `user-response.ticket_already_open` | 既にオープン済みエラー | このチケットは既にオープンされています。 | This ticket is already open. |
| `user-response.max_tickets_reached` | 上限超過エラー | チケットの同時作成上限（{{max}}件）に達しています。 | You have reached the maximum number of simultaneous tickets ({{max}}). |
| `user-response.cannot_remove_last_role` | 最後のロール削除エラー | スタッフロールを0件にすることはできません。 | Cannot remove all staff roles. |
| `user-response.and_more` | チケット一覧省略 | 他 {{count}}件 | and {{count}} more |

### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.panel_default` | パネルデフォルトタイトル | サポート | Support |
| `embed.description.panel_default` | パネルデフォルト説明文 | サポートが必要な場合は下のボタンからチケットを作成してください。 | If you need support, please create a ticket using the button below. |
| `embed.title.ticket` | チケット初期メッセージタイトル | チケット: {{subject}} | Ticket: {{subject}} |
| `embed.field.name.created_by` | 作成者フィールド名 | 作成者 | Created by |
| `embed.field.name.created_at` | 作成日時フィールド名 | 作成日時 | Created at |
| `embed.title.closed` | クローズ通知タイトル | チケットクローズ | Ticket Closed |
| `embed.description.closed` | クローズ説明 | チケットをクローズしました。 | Ticket has been closed. |
| `embed.description.auto_delete` | 自動削除通知 | <t:{{timestamp}}:R>に自動削除されます | Will be automatically deleted <t:{{timestamp}}:R> |
| `embed.description.reopened` | 再オープン説明 | チケットを再オープンしました。 | Ticket has been reopened. |
| `embed.title.reopened` | 再オープン通知タイトル | チケット再オープン | Ticket Reopened |
| `embed.title.delete_confirm` | 削除確認タイトル | チケット削除確認 | Ticket Deletion |
| `embed.description.delete_warning` | 削除警告文 | このチケットチャンネルを削除します。この操作は取り消せません。 | This ticket channel will be deleted. This action cannot be undone. |
| `embed.title.teardown_confirm` | 撤去確認タイトル | チケット撤去確認 | Ticket Removal |
| `embed.description.teardown_confirm` | 撤去確認説明（チケットなし） | 選択したカテゴリのパネル・設定を削除します。この操作は取り消せません。 | The panel and settings for the selected category will be deleted. This action cannot be undone. |
| `embed.description.teardown_warning` | 撤去警告文（チケットあり） | オープン中のチケットが{{count}}件あります。続行するとチケットチャンネルも全て削除されます。この操作は取り消せません。 | There are {{count}} open tickets. Continuing will also delete all ticket channels. This action cannot be undone. |
| `embed.field.name.open_tickets` | オープンチケットフィールド名 | オープン中のチケット（{{count}}件） | Open tickets ({{count}}) |
| `embed.title.config_view` | 設定表示タイトル | チケット設定 | Ticket Settings |
| `embed.field.name.category` | カテゴリフィールド名 | カテゴリ | Category |
| `embed.field.name.staff_roles` | スタッフロールフィールド名 | スタッフロール | Staff Roles |
| `embed.field.name.auto_delete` | 自動削除期間フィールド名 | 自動削除期間 | Auto-delete Period |
| `embed.field.name.max_tickets` | 同時上限フィールド名 | 同時チケット上限 | Max Tickets per User |
| `embed.field.name.panel_channel` | パネルチャンネルフィールド名 | パネル設置チャンネル | Panel Channel |
| `embed.field.name.open_ticket_count` | オープンチケット数フィールド名 | オープン中のチケット数 | Open Tickets |
| `embed.title.success` | 設定完了タイトル | 設定完了 | Settings Updated |

### UIラベル

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ui.button.create_ticket` | チケット作成ボタン | チケットを作成 | Create Ticket |
| `ui.button.close` | クローズボタン | クローズ | Close |
| `ui.button.reopen` | 再オープンボタン | 再オープン | Reopen |
| `ui.button.delete` | 削除ボタン | 削除 | Delete |
| `ui.button.delete_confirm` | 削除確認ボタン | 削除する | Delete |
| `ui.button.cancel` | キャンセルボタン | キャンセル | Cancel |
| `ui.button.teardown_confirm` | 撤去確認ボタン | 撤去する | Remove |
| `ui.button.teardown_cancel` | 撤去キャンセルボタン | キャンセル | Cancel |
| `ui.select.roles_placeholder` | ロール選択プレースホルダー | スタッフロールを選択してください | Select staff roles |
| `ui.select.teardown_placeholder` | 撤去カテゴリ選択プレースホルダー | 撤去するカテゴリを選択してください | Select a category to remove |
| `ui.select.view_placeholder` | 設定表示カテゴリ選択プレースホルダー | カテゴリを選択してください | Select a category |
| `ui.modal.setup_title` | セットアップモーダルタイトル | パネル設定 | Panel Settings |
| `ui.modal.setup_field_title` | パネルタイトルフィールドラベル | パネルタイトル | Panel Title |
| `ui.modal.setup_field_description` | パネル説明文フィールドラベル | パネル説明文 | Panel Description |
| `ui.modal.edit_panel_title` | パネル編集モーダルタイトル | パネル編集 | Edit Panel |
| `ui.modal.create_ticket_title` | チケット作成モーダルタイトル | チケットを作成 | Create Ticket |
| `ui.modal.create_ticket_subject` | 件名フィールドラベル | 件名 | Subject |
| `ui.modal.create_ticket_detail` | 詳細フィールドラベル | 詳細 | Details |

### ログ

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.setup` | パネル設置ログ | チケットパネルを設置 GuildId: {{guildId}} CategoryId: {{categoryId}} ChannelId: {{channelId}} | ticket panel set up GuildId: {{guildId}} CategoryId: {{categoryId}} ChannelId: {{channelId}} |
| `log.teardown` | パネル撤去ログ | チケットパネルを撤去 GuildId: {{guildId}} CategoryId: {{categoryId}} | ticket panel removed GuildId: {{guildId}} CategoryId: {{categoryId}} |
| `log.ticket_created` | チケット作成ログ | チケット作成 GuildId: {{guildId}} ChannelId: {{channelId}} UserId: {{userId}} TicketNumber: {{ticketNumber}} | ticket created GuildId: {{guildId}} ChannelId: {{channelId}} UserId: {{userId}} TicketNumber: {{ticketNumber}} |
| `log.ticket_closed` | クローズログ | チケットクローズ GuildId: {{guildId}} ChannelId: {{channelId}} ClosedBy: {{closedBy}} | ticket closed GuildId: {{guildId}} ChannelId: {{channelId}} ClosedBy: {{closedBy}} |
| `log.ticket_opened` | 再オープンログ | チケット再オープン GuildId: {{guildId}} ChannelId: {{channelId}} OpenedBy: {{openedBy}} | ticket reopened GuildId: {{guildId}} ChannelId: {{channelId}} OpenedBy: {{openedBy}} |
| `log.ticket_deleted` | 削除ログ | チケット削除 GuildId: {{guildId}} ChannelId: {{channelId}} DeletedBy: {{deletedBy}} | ticket deleted GuildId: {{guildId}} ChannelId: {{channelId}} DeletedBy: {{deletedBy}} |
| `log.ticket_auto_deleted` | 自動削除ログ | チケット自動削除 GuildId: {{guildId}} ChannelId: {{channelId}} | ticket auto-deleted GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.database_config_saved` | DB操作ログ | チケット設定を保存 GuildId: {{guildId}} CategoryId: {{categoryId}} | ticket config saved GuildId: {{guildId}} CategoryId: {{categoryId}} |
| `log.database_config_save_failed` | DB操作エラーログ | チケット設定保存に失敗 GuildId: {{guildId}} CategoryId: {{categoryId}} | failed to save ticket config GuildId: {{guildId}} CategoryId: {{categoryId}} |
| `log.database_ticket_saved` | DB操作ログ | チケットを保存 GuildId: {{guildId}} TicketId: {{ticketId}} | ticket saved GuildId: {{guildId}} TicketId: {{ticketId}} |
| `log.database_ticket_save_failed` | DB操作エラーログ | チケット保存に失敗 GuildId: {{guildId}} TicketId: {{ticketId}} | failed to save ticket GuildId: {{guildId}} TicketId: {{ticketId}} |
| `log.panel_deleted` | パネル削除検知ログ | パネル削除を検知 GuildId: {{guildId}} CategoryId: {{categoryId}} | panel deletion detected GuildId: {{guildId}} CategoryId: {{categoryId}} |
| `log.panel_channel_deleted` | パネルチャンネル削除検知ログ | パネル設置チャンネル削除を検知 GuildId: {{guildId}} CategoryId: {{categoryId}} | panel channel deletion detected GuildId: {{guildId}} CategoryId: {{categoryId}} |

---

## テストケース

### ユニットテスト

- [x] setup: RoleSelectMenu表示、セッション保存、モーダル入力、パネル送信+DB保存、既存設定エラー、Bot権限不足エラー伝播
- [x] teardown: セレクトメニュー表示、確認ダイアログ、正常削除、キャンセル
- [x] view: 単一/複数設定のページネーション、チャンネル名フォールバック
- [x] edit-panel: モーダル表示、Embed更新、パネル更新失敗時の挙動
- [x] set-roles / add-roles / remove-roles: RoleSelectMenuによるロール操作、最後のロール削除エラー
- [x] set-auto-delete / set-max-tickets: パラメータ検証、正常更新
- [x] チケット作成: ボタン→モーダル→チャンネル作成、上限チェック、Bot権限不足エラー伝播
- [x] チケットクローズ: 権限チェック、ステータス変更、自動削除スケジュール登録
- [x] チケット再オープン: 権限チェック、ステータス復元
- [x] チケット削除: 確認ダイアログ、チャンネル削除
- [x] 自動削除: スケジュール登録、Bot再起動時復元、ギルド/チャンネル未検出時のDB削除
- [x] channelDelete / messageDelete: パネルチャンネル/メッセージ削除時の設定同期

### インテグレーションテスト

- [x] setup → create → close → reopen → delete のライフサイクル

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildTicketConfig（DB） | チケット設定の取得・更新 |
| Ticket（DB） | チケット情報の CRUD |
| JobScheduler | 自動削除タイマーのスケジュール |
| ページネーション共通コンポーネント | view のページ切り替え |
| messageDelete イベント | パネルメッセージ個別削除の検知 |
| channelDelete イベント | パネル設置チャンネル削除の検知 |
