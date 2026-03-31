# リアクションロール機能 - 仕様書

> 管理者が設置したパネルのボタンをユーザーが押すことでロールを付与・解除できるリアクションロールシステム

最終更新: 2026年3月28日

---

## 概要

### 機能一覧

| 機能 | 概要 |
| --- | --- |
| パネル設置 | 管理者がリアクションロール用パネル（Embed + ボタン）をチャンネルに設置 |
| ロール操作 | ユーザーがボタンを押してロールを付与・解除 |
| `/reaction-role-config setup` | パネル作成（Embed設定 → モード選択 → ボタン追加 → 設置） |
| `/reaction-role-config teardown` | パネル撤去（複数選択可） |
| `/reaction-role-config view` | 設定一覧表示 |
| `/reaction-role-config edit-panel` | パネルのタイトル・説明文・カラー編集 |
| `/reaction-role-config add-button` | 既存パネルにボタン追加 |
| `/reaction-role-config remove-button` | パネルからボタン削除 |
| `/reaction-role-config edit-button` | ボタンのラベル・絵文字・スタイル・ロール変更 |

### 権限モデル

| 対象 | 権限 | 用途 |
| --- | --- | --- |
| 実行者（config系） | ManageGuild | 設定管理 |
| 実行者（ボタンクリック） | なし | ロール操作 |
| Bot | ManageRoles | ロールの付与・解除 |
| Bot | SendMessages | パネル送信・応答メッセージ |

> Bot に上記の権限が不足している場合は Bot権限不足エラー（共通フォーマット）を返します。詳細は [MESSAGE_RESPONSE_SPEC.md](MESSAGE_RESPONSE_SPEC.md) を参照。

---

## パネル設置（setup）

### コマンド定義

**コマンド**: `/reaction-role-config setup`

**実行権限**: ManageGuild

**コマンドオプション:** なし

### 動作フロー

1. ManageGuild 権限チェック
2. モーダルを表示（パネルタイトル・説明文・カラー入力、デフォルト値プリフィル）
3. モード選択 StringSelectMenu を表示（toggle / one-action / exclusive）
4. ボタン追加ループ:
   a. モーダルを表示（ボタンラベル・絵文字・スタイル入力）
   b. RoleSelectMenu を表示（割り当てロール選択、複数選択可）
   c. 「もう1つ追加」「完了」ボタンを表示
   d. 「もう1つ追加」→ 4a に戻る / 「完了」→ 5 へ
5. 実行チャンネルにパネル Embed + ボタンを設置
6. 設定を DB に保存

**ビジネスルール:**

- ボタンは1つ以上追加必須（0個では完了不可）
- ボタン上限は1パネルあたり25個（Discord上限）
- ループ中に25個に達した場合は「もう1つ追加」を disabled にする
- ロールは1ボタンにつき1つ以上選択必須
- カラーは省略時 `#00A8F3`（デフォルト）

### UI

**Embed設定モーダル:**

| フィールド | ラベル | スタイル | 必須 | デフォルト値 |
| --- | --- | --- | --- | --- |
| `reaction-role:setup-title` | パネルタイトル | Short | ✅ | ロール選択 |
| `reaction-role:setup-description` | パネル説明文 | Paragraph | ✅ | ボタンを押してロールを取得・解除できます。 |
| `reaction-role:setup-color` | カラー（例: #00A8F3） | Short | ❌ | #00A8F3 |

**モード選択 StringSelectMenu:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:setup-mode:<sessionId>` | StringSelect | パネルのモードを選択 |

**選択肢:**

| ラベル | 値 | 説明 |
| --- | --- | --- |
| トグル | `toggle` | ボタンを押すたびにロールを付与/解除 |
| ワンアクション | `one-action` | ロールを付与（取り消し不可） |
| 排他 | `exclusive` | グループ内で1つだけ選択可能 |

**ボタン設定モーダル:**

| フィールド | ラベル | スタイル | 必須 | 制約 |
| --- | --- | --- | --- | --- |
| `reaction-role:button-label` | ボタンラベル | Short | ✅ | 最大80文字 |
| `reaction-role:button-emoji` | 絵文字 | Short | ❌ | Unicode絵文字 or カスタム絵文字（`<:name:id>` / `<a:name:id>`）。無効な形式はエラー応答。Emoji_Presentation文字に付く冗余なVS16（U+FE0F）は自動除去して正規化する |
| `reaction-role:button-style` | スタイル（primary / secondary / success / danger） | Short | ❌ | 省略時 primary |

**RoleSelectMenu:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:setup-roles:<sessionId>` | RoleSelect（複数選択可） | ボタンに割り当てるロールを選択 |

**追加/完了ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `reaction-role:setup-add:<sessionId>` | ➕ | もう1つ追加 | Primary | ボタン追加ループに戻る |
| `reaction-role:setup-done:<sessionId>` | ✅ | 完了 | Success | パネルを設置 |

**パネル Embed（設置後）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | {カスタムタイトル}（デフォルト: ロール選択） |
| 説明 | {カスタム説明文}（デフォルト: ボタンを押してロールを取得・解除できます。） |
| カラー | {カスタムカラー}（デフォルト: `#00A8F3`） |

**パネルボタン（設置後）:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `reaction-role:click:<panelId>:<buttonId>` | {カスタム絵文字} | {カスタムラベル} | {カスタムスタイル} | ロール操作を実行 |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | リアクションロールパネルを設置しました。 |

---

## ロール操作

### トリガー

**イベント**: パネルのボタンクリック

**発火条件:**

- ユーザーがパネルのボタンをクリック

### 動作フロー

1. パネル設定を DB から取得
2. クリックされたボタンの割り当てロールを特定
3. モードに応じた処理を実行（下記参照）
4. 結果を ephemeral メッセージで通知

**モード別挙動:**

| モード | ロールあり | ロールなし |
| --- | --- | --- |
| toggle | ロールを解除 | ロールを付与 |
| one-action | 「既に付与済み」メッセージ | ロールを付与 |
| exclusive | 「既に選択済み」メッセージ | 他ボタンのロールを解除 → ロールを付与 |

**ビジネスルール:**

- toggle: ボタンに複数ロールが割り当てられている場合、全ロールを一括で付与/解除
- one-action: ボタンの全ロールを保持済みの場合のみ「既に付与済み」。一部未付与の場合は未付与分を付与
- exclusive: 同一パネル内の他ボタンに割り当てられたロールをすべて解除してから、クリックしたボタンのロールを付与。既に同じボタンのロールをすべて保持済みの場合は「既に選択済み」
- Bot のロールより上位のロールは操作不可 → エラーメッセージ
- `{{roles}}` はロールメンションをカンマ区切りで表示（例: `@Role1, @Role2, @Role3`）

### UI

**ロール付与メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | {{roles}} を付与しました。 |

**ロール解除メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | {{roles}} を解除しました。 |

**排他切り替えメッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | {{roles}} に切り替えました。 |

**既に付与済みメッセージ（`createInfoEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | 既にロールが付与されています。 |

**既に選択済みメッセージ（`createInfoEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | 既にこのロールが選択されています。 |

**ロール操作不可メッセージ（`createErrorEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | Botの権限ではこのロールを操作できません。サーバー管理者に連絡してください。 |

---

## /reaction-role-config teardown

### コマンド定義

**コマンド**: `/reaction-role-config teardown`

**実行権限**: ManageGuild

**コマンドオプション:** なし（セレクトメニューでパネル選択）

### 動作フロー

1. ManageGuild 権限チェック
2. ギルド内のパネル一覧を取得
3. 各パネルのメッセージ存在を確認し、不在パネルは DB レコードを削除して除外（フォールバッククリーンアップ）
4. クリーンアップ後 0件 → エラー
5. 1件 → セレクトメニューをスキップし、直接確認ダイアログを表示
6. 複数件 → StringSelectMenu を表示（複数選択可: minValues=1, maxValues=パネル数）
7. パネル選択後、確認 Embed を表示（選択したパネル一覧を表示）
8. 確認後:
   - 選択したパネルメッセージを削除
   - DB から選択したパネルレコードを削除
9. クリーンアップが発生した場合は followUp で通知

**ビジネスルール:**

- パネルが1件のみの場合はセレクトメニューをスキップ
- パネルが存在しない場合はエラー

### UI

**パネル選択セレクトメニュー:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:teardown-select:<sessionId>` | StringSelect（複数選択可） | 撤去するパネルを選択 |

**セレクトメニューオプション:**

| 項目 | 内容 |
| --- | --- |
| ラベル | `{パネルタイトル}（#{チャンネル名}）` |
| 値 | パネルID |

**確認 Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | パネル撤去確認 |
| 説明 | 選択した{{count}}件のパネルを撤去します。この操作は取り消せません。 |
| フィールド: 撤去対象（{{count}}件） | 「{title1}」（#channel1）、「{title2}」（#channel2）... |

`createWarningEmbed` 使用

**確認ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `reaction-role:teardown-confirm:<sessionId>` | 🗑️ | 撤去する | Danger | 選択したパネルを削除 |
| `reaction-role:teardown-cancel:<sessionId>` | ❌ | キャンセル | Secondary | 何もしない |

---

## /reaction-role-config view

### コマンド定義

**コマンド**: `/reaction-role-config view`

**実行権限**: ManageGuild

**コマンドオプション:** なし

### 動作フロー

1. ManageGuild 権限チェック
2. 全パネルの設定を取得
3. 各パネルのメッセージ存在を確認し、不在パネルは DB レコードを削除して除外（フォールバッククリーンアップ）
4. クリーンアップ後に設定が0件の場合は「設定がありません」と表示
5. 1件の場合はそのまま Embed 表示
6. 複数件の場合はページネーション + パネル選択で表示
7. クリーンアップが発生した場合は followUp で通知

**クリーンアップ通知メッセージ（`createInfoEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | {{count}}件のパネルが削除済みのためクリーンアップしました。 |

### UI

**設定表示 Embed（1ページ = 1パネル）:**

| 項目 | 内容 |
| --- | --- |
| タイトル | リアクションロール設定 |
| フィールド: パネルタイトル | {title} |
| フィールド: チャンネル | `#チャンネル名` |
| フィールド: モード | トグル / ワンアクション / 排他 |
| フィールド: カラー | {color} |
| フィールド: ボタン数 | {N}個 |
| フィールド: ボタン一覧 | {emoji} {label} → @Role1 @Role2 ... |

`createInfoEmbed` 使用

**ページネーション（複数パネル時）:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `reaction-role:page-first` | ⏮ | ― | Secondary | 最初のページ（1ページ目は disabled） |
| `reaction-role:page-prev` | ◀ | ― | Secondary | 前のページ（1ページ目は disabled） |
| `reaction-role:page-jump` | ― | {{page}}/{{total}}ページ | Secondary | 押下でモーダル表示、番号入力でページジャンプ |
| `reaction-role:page-next` | ▶ | ― | Secondary | 次のページ（最終ページは disabled） |
| `reaction-role:page-last` | ⏭ | ― | Secondary | 最後のページ（最終ページは disabled） |

**パネル選択セレクトメニュー:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:view-select:<sessionId>` | StringSelect | パネルを選択してページジャンプ |

---

## /reaction-role-config edit-panel

### コマンド定義

**コマンド**: `/reaction-role-config edit-panel`

**実行権限**: ManageGuild

**コマンドオプション:** なし（セレクトメニューでパネル選択）

### 動作フロー

1. ManageGuild 権限チェック
2. ギルド内のパネル一覧を StringSelectMenu で表示（1件のみならスキップ）
3. モーダルを表示（現在の設定値をプリフィル）
4. パネル Embed を更新
5. 設定を DB に保存

### UI

**パネル選択セレクトメニュー:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:edit-panel-select:<sessionId>` | StringSelect | 編集するパネルを選択 |

**モーダル:**

| フィールド | ラベル | スタイル | 必須 | プリフィル |
| --- | --- | --- | --- | --- |
| `reaction-role:edit-panel-title` | パネルタイトル | Short | ✅ | 現在の設定値 |
| `reaction-role:edit-panel-description` | パネル説明文 | Paragraph | ✅ | 現在の設定値 |
| `reaction-role:edit-panel-color` | カラー（例: #00A8F3） | Short | ❌ | 現在の設定値 |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | パネルを更新しました。 |

---

## /reaction-role-config add-button

### コマンド定義

**コマンド**: `/reaction-role-config add-button`

**実行権限**: ManageGuild

**コマンドオプション:** なし（セレクトメニューでパネル選択）

### 動作フロー

1. ManageGuild 権限チェック
2. ギルド内のパネル一覧を StringSelectMenu で表示（1件のみならスキップ）
3. ボタン上限チェック（25個未満か確認）
4. ボタン追加ループ:
   a. モーダルを表示（ボタンラベル・絵文字・スタイル入力）
   b. RoleSelectMenu を表示（割り当てロール選択、複数選択可）
   c. 「もう1つ追加」「完了」ボタンを表示
   d. 「もう1つ追加」→ 上限チェック後 4a に戻る / 「完了」→ 5 へ
5. パネルメッセージを更新（ボタン追加）
6. 設定を DB に保存

**ビジネスルール:**

- ボタンが既に25個の場合はエラー
- ループ中に25個に達した場合は「もう1つ追加」を disabled にする

### UI

**パネル選択セレクトメニュー:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:add-button-select:<sessionId>` | StringSelect | 対象パネルを選択 |

**ボタン設定モーダル:**

| フィールド | ラベル | スタイル | 必須 | 制約 |
| --- | --- | --- | --- | --- |
| `reaction-role:button-label` | ボタンラベル | Short | ✅ | 最大80文字 |
| `reaction-role:button-emoji` | 絵文字 | Short | ❌ | Unicode絵文字 or カスタム絵文字（`<:name:id>` / `<a:name:id>`）。無効な形式はエラー応答。Emoji_Presentation文字に付く冗余なVS16（U+FE0F）は自動除去して正規化する |
| `reaction-role:button-style` | スタイル（primary / secondary / success / danger） | Short | ❌ | 省略時 primary |

**RoleSelectMenu:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:add-button-roles:<sessionId>` | RoleSelect（複数選択可） | ボタンに割り当てるロールを選択 |

**追加/完了ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `reaction-role:add-button-more:<sessionId>` | ➕ | もう1つ追加 | Primary | ボタン追加ループに戻る（上限時 disabled） |
| `reaction-role:add-button-done:<sessionId>` | ✅ | 完了 | Success | パネルを更新 |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | ボタンを{{count}}個追加しました。 |

---

## /reaction-role-config remove-button

### コマンド定義

**コマンド**: `/reaction-role-config remove-button`

**実行権限**: ManageGuild

**コマンドオプション:** なし（セレクトメニューでパネル・ボタン選択）

### 動作フロー

1. ManageGuild 権限チェック
2. ギルド内のパネル一覧を StringSelectMenu で表示（1件のみならスキップ）
3. パネル内のボタン一覧を StringSelectMenu で表示（複数選択可）
4. 確認 Embed を表示（選択したボタン一覧を表示）
5. 確認後:
   - パネルメッセージを更新（ボタン削除）
   - 設定を DB に保存

**ビジネスルール:**

- 全ボタンを選択して削除しようとした場合はエラー（ボタン0個は不可）

### UI

**パネル選択セレクトメニュー:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:remove-button-panel:<sessionId>` | StringSelect | 対象パネルを選択 |

**ボタン選択セレクトメニュー:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:remove-button-select:<sessionId>` | StringSelect（複数選択可） | 削除するボタンを選択 |

**確認 Embed:**

| 項目 | 内容 |
| --- | --- |
| タイトル | ボタン削除確認 |
| 説明 | 選択した{{count}}個のボタンを削除します。この操作は取り消せません。 |
| フィールド: 削除対象 | 「{{label1}}」、「{{label2}}」... |

`createWarningEmbed` 使用

**確認ボタン:**

| コンポーネント | emoji | ラベル | スタイル | 動作 |
| --- | --- | --- | --- | --- |
| `reaction-role:remove-button-confirm:<sessionId>` | 🗑️ | 削除する | Danger | ボタンを削除 |
| `reaction-role:remove-button-cancel:<sessionId>` | ❌ | キャンセル | Secondary | 何もしない |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | ボタンを{{count}}個削除しました。 |

---

## /reaction-role-config edit-button

### コマンド定義

**コマンド**: `/reaction-role-config edit-button`

**実行権限**: ManageGuild

**コマンドオプション:** なし（セレクトメニューでパネル・ボタン選択）

### 動作フロー

1. ManageGuild 権限チェック
2. ギルド内のパネル一覧を StringSelectMenu で表示（1件のみならスキップ）
3. パネル内のボタン一覧を StringSelectMenu で表示
4. モーダルを表示（現在の設定値をプリフィル: ラベル・絵文字・スタイル）
5. RoleSelectMenu を表示（現在のロールが選択された状態で表示、複数選択可）
6. パネルメッセージを更新
7. 設定を DB に保存

**ビジネスルール:**

- ロールは1つ以上選択必須

### UI

**パネル選択セレクトメニュー:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:edit-button-panel:<sessionId>` | StringSelect | 対象パネルを選択 |

**ボタン選択セレクトメニュー:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:edit-button-select:<sessionId>` | StringSelect | 編集するボタンを選択 |

**ボタン設定モーダル:**

| フィールド | ラベル | スタイル | 必須 | プリフィル |
| --- | --- | --- | --- | --- |
| `reaction-role:button-label` | ボタンラベル | Short | ✅ | 現在の設定値 |
| `reaction-role:button-emoji` | 絵文字 | Short | ❌ | 現在の設定値。Unicode絵文字 or カスタム絵文字（`<:name:id>` / `<a:name:id>`）。無効な形式はエラー応答。Emoji_Presentation文字に付く冗余なVS16（U+FE0F）は自動除去して正規化する |
| `reaction-role:button-style` | スタイル（primary / secondary / success / danger） | Short | ❌ | 現在の設定値 |

**RoleSelectMenu:**

| コンポーネント | スタイル | 動作 |
| --- | --- | --- |
| `reaction-role:edit-button-roles:<sessionId>` | RoleSelect（複数選択可） | ボタンに割り当てるロールを変更 |

**成功メッセージ（`createSuccessEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | ボタンを更新しました。 |

---

## データモデル

### GuildReactionRolePanel

| フィールド | 型 | 説明 |
| --- | --- | --- |
| `id` | String | 主キー（cuid） |
| `guildId` | String | ギルドID |
| `channelId` | String | パネル設置チャンネルID |
| `messageId` | String | パネルメッセージID |
| `mode` | String | `toggle` / `one-action` / `exclusive` |
| `title` | String | パネルタイトル（デフォルト: ロール選択） |
| `description` | String | パネル説明文（デフォルト: ボタンを押してロールを取得・解除できます。） |
| `color` | String | Embedカラー（デフォルト: `#00A8F3`） |
| `buttons` | String | ボタン設定（JSON配列） |
| `buttonCounter` | Int | ボタンID採番カウンター（デフォルト: 0） |
| `createdAt` | DateTime | 作成日時 |
| `updatedAt` | DateTime | 更新日時 |

**buttons JSON構造:**

```json
[
  {
    "buttonId": 1,
    "label": "Red",
    "emoji": "🔴",
    "style": "Primary",
    "roleIds": ["123456789", "987654321"]
  }
]
```

---

## パネル自動クリーンアップ

### 概要

パネルメッセージやパネル設置チャンネルが手動で削除された場合に、DBレコードを自動クリーンアップする。

### イベント監視

**messageDelete:**

- 削除されたメッセージの ID がいずれかのパネルの `messageId` と一致する場合、該当パネルの DB レコードを削除する

**channelDelete:**

- 削除されたチャンネルの ID がいずれかのパネルの `channelId` と一致する場合、該当パネルの DB レコードをすべて削除する

### 操作時フォールバック

Bot がオフラインの間に削除が行われた場合、イベントを受信できない。そのため、以下のサブコマンドではパネルメッセージの存在確認を行い、不在の場合は DB レコードを削除してエラーを返す:

- `view`（パネル一覧取得時にメッセージ存在を確認し、不在パネルを除外 + DB 削除）
- `edit-panel`（モーダル送信後のメッセージ更新時）
- `add-button`（完了時のメッセージ更新時）
- `remove-button`（確認後のメッセージ更新時）
- `edit-button`（ロール選択後のメッセージ更新時）

**パネルメッセージ不在エラー（`createErrorEmbed` 使用 / ephemeral）:**

| 項目 | 内容 |
| --- | --- |
| 説明 | パネルメッセージが見つかりませんでした。パネルが削除された可能性があります。 |

（既存キー `user-response.panel_message_not_found` を使用）

### ローカライズ（追加分）

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.panel_message_deleted` | パネルメッセージ削除検知ログ | パネルメッセージ削除検知 GuildId: {{guildId}} PanelId: {{panelId}} | panel message deleted GuildId: {{guildId}} PanelId: {{panelId}} |
| `log.panel_channel_deleted` | パネルチャンネル削除検知ログ | パネルチャンネル削除検知 GuildId: {{guildId}} ChannelId: {{channelId}} | panel channel deleted GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.panel_cleanup_failed` | クリーンアップ失敗ログ | パネルクリーンアップに失敗 GuildId: {{guildId}} | panel cleanup failed GuildId: {{guildId}} |

---

## 制約・制限事項

- 1パネルあたりのボタン上限: 25個（Discord上限: 5個/行 × 5行）
- 1ボタンあたり1つ以上のロール割り当て必須
- パネルのモード変更は不可（パネル作り直しで対応）
- Bot のロールより上位のロールは操作不可
- ボタン0個のパネルは作成不可・最後の1ボタンは削除不可
- パネル Embed のフィールド値上限（1024文字）を超えるボタン一覧は先頭N件 + 「他 X件」で省略

---

## ローカライズ

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/reactionRole.ts`

キー命名規則は [IMPLEMENTATION_GUIDELINES.md](../guides/IMPLEMENTATION_GUIDELINES.md) の「翻訳キー命名規則」を参照。

### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `reaction-role-config.description` | コマンド説明 | リアクションロール機能の設定（サーバー管理権限が必要） | Configure reaction role feature (requires Manage Server) |
| `reaction-role-config.setup.description` | サブコマンド説明 | リアクションロールパネルを設置 | Set up reaction role panel |
| `reaction-role-config.teardown.description` | サブコマンド説明 | リアクションロールパネルを撤去 | Remove reaction role panel |
| `reaction-role-config.view.description` | サブコマンド説明 | 現在の設定を表示 | Show current settings |
| `reaction-role-config.edit-panel.description` | サブコマンド説明 | パネルのタイトル・説明文・カラーを編集 | Edit panel title, description, and color |
| `reaction-role-config.add-button.description` | サブコマンド説明 | パネルにボタンを追加 | Add a button to panel |
| `reaction-role-config.remove-button.description` | サブコマンド説明 | パネルからボタンを削除 | Remove a button from panel |
| `reaction-role-config.edit-button.description` | サブコマンド説明 | ボタンを編集 | Edit a button |

### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.setup_success` | パネル設置成功 | リアクションロールパネルを設置しました。 | Reaction role panel has been set up. |
| `user-response.teardown_success` | パネル撤去成功 | {{count}}件のリアクションロールパネルを撤去しました。 | {{count}} reaction role panel(s) removed. |
| `user-response.teardown_cancelled` | 撤去キャンセル | キャンセルしました。 | Cancelled. |
| `user-response.edit_panel_success` | パネル編集成功 | パネルを更新しました。 | Panel has been updated. |
| `user-response.add_button_success` | ボタン追加成功 | ボタンを{{count}}個追加しました。 | {{count}} button(s) added. |
| `user-response.remove_button_success` | ボタン削除成功 | ボタンを{{count}}個削除しました。 | {{count}} button(s) removed. |
| `user-response.remove_button_cancelled` | ボタン削除キャンセル | キャンセルしました。 | Cancelled. |
| `user-response.edit_button_success` | ボタン編集成功 | ボタンを更新しました。 | Button has been updated. |
| `user-response.role_added` | ロール付与 | {{roles}} を付与しました。 | {{roles}} has been granted. |
| `user-response.role_removed` | ロール解除 | {{roles}} を解除しました。 | {{roles}} has been removed. |
| `user-response.role_switched` | 排他切り替え | {{roles}} に切り替えました。 | Switched to {{roles}}. |
| `user-response.role_already_granted` | 既に付与済み | 既にロールが付与されています。 | You already have this role. |
| `user-response.role_already_selected` | 既に選択済み | 既にこのロールが選択されています。 | This role is already selected. |
| `user-response.role_too_high` | ロール操作不可 | Botの権限ではこのロールを操作できません。サーバー管理者に連絡してください。 | The bot cannot manage this role. Please contact a server administrator. |
| `user-response.no_panels` | パネルなしエラー | リアクションロール設定がありません。 | No reaction role configurations found. |
| `user-response.button_limit_reached` | ボタン上限エラー | ボタンの上限（25個）に達しています。 | Button limit (25) has been reached. |
| `user-response.cannot_remove_all_buttons` | 最後のボタン削除エラー | ボタンを0個にすることはできません。 | Cannot remove all buttons. |
| `user-response.invalid_color` | カラー形式エラー | カラーの形式が正しくありません。#RRGGBB形式で入力してください。 | Invalid color format. Please use #RRGGBB format. |
| `user-response.invalid_emoji` | 絵文字形式エラー | 絵文字の形式が正しくありません。Unicode絵文字またはDiscordカスタム絵文字（<:name:id>）を入力してください。 | Invalid emoji format. Please use a Unicode emoji or Discord custom emoji (<:name:id>). |
| `user-response.invalid_style` | スタイル形式エラー | スタイルの形式が正しくありません。primary / secondary / success / danger のいずれかを入力してください。 | Invalid style. Please use primary, secondary, success, or danger. |
| `user-response.and_more` | 一覧省略 | 他 {{count}}件 | and {{count}} more |
| `user-response.panels_cleaned_up` | パネルクリーンアップ通知 | {{count}}件のパネルが削除済みのためクリーンアップしました。 | {{count}} panel(s) cleaned up because the message was deleted. |
| `user-response.session_expired` | セッション期限切れ | セッションの有効期限が切れました。もう一度コマンドを実行してください。 | Session has expired. Please run the command again. |
| `user-response.panel_message_not_found` | パネルメッセージ不在 | パネルメッセージが見つかりませんでした。パネルが削除された可能性があります。 | Panel message not found. The panel may have been deleted. |

### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.panel_default` | パネルデフォルトタイトル | ロール選択 | Role Selection |
| `embed.description.panel_default` | パネルデフォルト説明文 | ボタンを押してロールを取得・解除できます。 | Press a button to get or remove a role. |
| `embed.title.teardown_confirm` | 撤去確認タイトル | パネル撤去確認 | Panel Removal |
| `embed.description.teardown_confirm` | 撤去確認説明 | 選択した{{count}}件のパネルを撤去します。この操作は取り消せません。 | {{count}} panel(s) will be removed. This action cannot be undone. |
| `embed.field.name.teardown_targets` | 撤去対象フィールド名 | 撤去対象（{{count}}件） | Targets ({{count}}) |
| `embed.title.remove_button_confirm` | ボタン削除確認タイトル | ボタン削除確認 | Button Removal |
| `embed.description.remove_button_confirm` | ボタン削除確認説明 | 選択した{{count}}個のボタンを削除します。この操作は取り消せません。 | {{count}} button(s) will be removed. This action cannot be undone. |
| `embed.field.name.remove_targets` | 削除対象フィールド名 | 削除対象 | Targets |
| `embed.title.config_view` | 設定表示タイトル | リアクションロール設定 | Reaction Role Settings |
| `embed.field.name.panel_title` | パネルタイトルフィールド名 | パネルタイトル | Panel Title |
| `embed.field.name.channel` | チャンネルフィールド名 | チャンネル | Channel |
| `embed.field.name.mode` | モードフィールド名 | モード | Mode |
| `embed.field.name.color` | カラーフィールド名 | カラー | Color |
| `embed.field.name.button_count` | ボタン数フィールド名 | ボタン数 | Buttons |
| `embed.field.name.button_list` | ボタン一覧フィールド名 | ボタン一覧 | Button List |
| `embed.field.value.mode_toggle` | トグルモード表示 | トグル | Toggle |
| `embed.field.value.mode_one_action` | ワンアクションモード表示 | ワンアクション | One Action |
| `embed.field.value.mode_exclusive` | 排他モード表示 | 排他 | Exclusive |

### UIラベル

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ui.button.setup_add` | ボタン追加ボタン | もう1つ追加 | Add Another |
| `ui.button.setup_done` | 設置完了ボタン | 完了 | Done |
| `ui.button.teardown_confirm` | 撤去確認ボタン | 撤去する | Remove |
| `ui.button.teardown_cancel` | 撤去キャンセルボタン | キャンセル | Cancel |
| `ui.select.teardown_placeholder` | 撤去パネル選択プレースホルダー | 撤去するパネルを選択してください | Select panels to remove |
| `ui.button.remove_button_confirm` | ボタン削除確認ボタン | 削除する | Delete |
| `ui.button.remove_button_cancel` | ボタン削除キャンセルボタン | キャンセル | Cancel |
| `ui.select.panel_placeholder` | パネル選択プレースホルダー | パネルを選択してください | Select a panel |
| `ui.select.button_placeholder` | ボタン選択プレースホルダー | ボタンを選択してください | Select a button |
| `ui.select.mode_placeholder` | モード選択プレースホルダー | モードを選択してください | Select a mode |
| `ui.select.mode_toggle` | トグルモードラベル | トグル | Toggle |
| `ui.select.mode_toggle_description` | トグルモード説明 | ボタンを押すたびにロールを付与/解除 | Toggle role on/off with each press |
| `ui.select.mode_one_action` | ワンアクションモードラベル | ワンアクション | One Action |
| `ui.select.mode_one_action_description` | ワンアクションモード説明 | ロールを付与（取り消し不可） | Grant role (cannot be revoked) |
| `ui.select.mode_exclusive` | 排他モードラベル | 排他 | Exclusive |
| `ui.select.mode_exclusive_description` | 排他モード説明 | グループ内で1つだけ選択可能 | Only one selection allowed in group |
| `ui.select.roles_placeholder` | ロール選択プレースホルダー | ロールを選択してください | Select roles |
| `ui.modal.setup_title` | セットアップモーダルタイトル | パネル設定 | Panel Settings |
| `ui.modal.setup_field_title` | パネルタイトルフィールドラベル | パネルタイトル | Panel Title |
| `ui.modal.setup_field_description` | パネル説明文フィールドラベル | パネル説明文 | Panel Description |
| `ui.modal.setup_field_color` | カラーフィールドラベル | カラー（例: #00A8F3） | Color (e.g., #00A8F3) |
| `ui.modal.button_settings_title` | ボタン設定モーダルタイトル | ボタン設定 | Button Settings |
| `ui.modal.button_field_label` | ボタンラベルフィールドラベル | ボタンラベル | Button Label |
| `ui.modal.button_field_emoji` | 絵文字フィールドラベル | 絵文字 | Emoji |
| `ui.modal.button_field_style` | スタイルフィールドラベル | スタイル（primary / secondary / success / danger） | Style (primary / secondary / success / danger) |
| `ui.modal.edit_panel_title` | パネル編集モーダルタイトル | パネル編集 | Edit Panel |

### ログ

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `log.setup` | パネル設置ログ | リアクションロールパネルを設置 GuildId: {{guildId}} ChannelId: {{channelId}} | reaction role panel set up GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.teardown` | パネル撤去ログ | リアクションロールパネルを撤去 GuildId: {{guildId}} PanelIds: {{panelIds}} | reaction role panel(s) removed GuildId: {{guildId}} PanelIds: {{panelIds}} |
| `log.role_granted` | ロール付与ログ | ロール付与 GuildId: {{guildId}} UserId: {{userId}} RoleIds: {{roleIds}} | role granted GuildId: {{guildId}} UserId: {{userId}} RoleIds: {{roleIds}} |
| `log.role_removed` | ロール解除ログ | ロール解除 GuildId: {{guildId}} UserId: {{userId}} RoleIds: {{roleIds}} | role removed GuildId: {{guildId}} UserId: {{userId}} RoleIds: {{roleIds}} |
| `log.button_added` | ボタン追加ログ | ボタン追加 GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}} | button added GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}} |
| `log.button_removed` | ボタン削除ログ | ボタン削除 GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}} | button removed GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}} |
| `log.button_edited` | ボタン編集ログ | ボタン編集 GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}} | button edited GuildId: {{guildId}} PanelId: {{panelId}} ButtonId: {{buttonId}} |
| `log.database_panel_saved` | DB操作ログ | パネル設定を保存 GuildId: {{guildId}} PanelId: {{panelId}} | panel config saved GuildId: {{guildId}} PanelId: {{panelId}} |
| `log.database_panel_save_failed` | DB操作エラーログ | パネル設定保存に失敗 GuildId: {{guildId}} PanelId: {{panelId}} | failed to save panel config GuildId: {{guildId}} PanelId: {{panelId}} |
| `log.setup_started` | セットアップ開始ログ | リアクションロールセットアップ開始 GuildId: {{guildId}} | reaction role setup started GuildId: {{guildId}} |
| `log.database_panel_find_failed` | DB取得エラーログ | パネル設定取得に失敗 GuildId: {{guildId}} PanelId: {{panelId}} | failed to find panel config GuildId: {{guildId}} PanelId: {{panelId}} |
| `log.database_panel_delete_failed` | DB削除エラーログ | パネル設定削除に失敗 GuildId: {{guildId}} PanelId: {{panelId}} | failed to delete panel config GuildId: {{guildId}} PanelId: {{panelId}} |
| `log.panel_message_deleted` | パネルメッセージ削除検知ログ | パネルメッセージ削除検知 GuildId: {{guildId}} PanelId: {{panelId}} | panel message deleted GuildId: {{guildId}} PanelId: {{panelId}} |
| `log.panel_channel_deleted` | パネルチャンネル削除検知ログ | パネルチャンネル削除検知 GuildId: {{guildId}} ChannelId: {{channelId}} | panel channel deleted GuildId: {{guildId}} ChannelId: {{channelId}} |
| `log.panel_cleanup_failed` | クリーンアップ失敗ログ | パネルクリーンアップに失敗 GuildId: {{guildId}} | panel cleanup failed GuildId: {{guildId}} |

---

## テストケース

### ユニットテスト

- [ ] setup: モーダル入力、モード選択、ボタン追加ループ、パネル送信+DB保存、Bot権限不足エラー伝播
- [ ] teardown: パネル選択（複数選択可）、確認ダイアログ、正常削除（単数・複数）
- [ ] view: ページネーション、パネル選択
- [ ] edit-panel: モーダルでタイトル・説明文・カラー編集
- [ ] add-button / remove-button / edit-button: ボタン操作
- [ ] ロール操作: ボタンクリック → toggle / one-action / exclusive モード

### インテグレーションテスト

- [ ] setup → ボタンクリック → ロール付与/解除のライフサイクル

---

## 依存関係

| 依存先 | 内容 |
| --- | --- |
| GuildReactionRolePanel（DB） | パネル設定の取得・更新 |
| ページネーション共通コンポーネント | view のページ切り替え |
