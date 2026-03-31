# 基本コマンド - 仕様書

> 疎通確認・ヘルプ表示などユーティリティ系のシンプルなコマンド群

最終更新: 2026年3月21日

---

## 概要

### 機能一覧

| 機能    | 概要                                         |
| ------- | -------------------------------------------- |
| `/ping` | Bot の応答速度（APIレイテンシー・WS Ping）を確認 |
| `/help` | コマンド一覧とユーザーマニュアルリンクを表示 |

### 権限モデル

| 対象   | 権限 | 用途                     |
| ------ | ---- | ------------------------ |
| 実行者 | なし | 全メンバーが実行可能     |
| Bot    | なし | 追加権限不要（応答のみ） |

---

## /ping

### コマンド定義

**コマンド**: `/ping`

**実行権限**: なし

**コマンドオプション**: なし

### 動作フロー

1. 計測中メッセージを即時返信
2. 返信タイムスタンプから API レイテンシーを算出
3. WebSocket Ping を取得
4. Embed 形式で返信を更新

### UI

**Embed:**

| 項目     | 内容                                         |
| -------- | -------------------------------------------- |
| タイトル | なし                                         |
| 説明     | `📡 API レイテンシー: {{apiLatency}}ms`（改行）`💓 WebSocket Ping: {{wsLatency}}ms` |

---

## /help

### コマンド定義

**コマンド**: `/help`

**実行権限**: なし

**コマンドオプション**: なし

### 動作フロー

1. コマンド一覧を3カテゴリに分けて Embed を構築
2. ユーザーマニュアルリンクが設定されていれば末尾に掲載
3. ephemeral（実行者のみに表示）で返信

**ビジネスルール:**

- ユーザーマニュアルリンクは環境変数 `USER_MANUAL_URL` で管理し、未設定時はリンク行を省略する
- コマンド一覧はヘルプ専用の定義テーブルで管理し、表示順・カテゴリ分けを制御する

### UI

**Embed:**

| 項目   | 内容                                                                         |
| ------ | ---------------------------------------------------------------------------- |
| タイトル | `📖 彩加 =Saika= コマンド一覧`                                                  |
| 説明   | `📚 詳しい使い方: {{url}}`（`USER_MANUAL_URL` 設定時のみ表示） |
| カラー | `#77B255`（ライムグリーン）                                                  |

**Embed フィールド:**

各カテゴリを Embed のフィールドとして表示する。

| フィールド名         | 内容                                              |
| -------------------- | ------------------------------------------------- |
| `🔧 基本`           | `/ping` — Bot の応答速度を確認                    |
|                      | `/help` — このヘルプを表示                        |
| `⚙️ 設定（管理者）` | `/guild-config` — ギルド全体の設定                |
|                      | `/afk-config` — AFK の設定                        |
|                      | `/vac-config` — VC自動作成の設定                  |
|                      | `/vc-recruit-config` — VC募集の設定               |
|                      | `/sticky-message` — メッセージ固定の設定          |
|                      | `/member-log-config` — メンバーログの設定         |
|                      | `/message-delete-config` — メッセージ削除の設定   |
|                      | `/bump-reminder-config` — Bumpリマインダーの設定  |
| `🛠️ 操作`          | `/afk` — AFK チャンネルへ移動                     |
|                      | `/vc` — VC名・人数制限を変更                      |
|                      | `/message-delete` — メッセージを一括削除          |

---

## 制約・制限事項

- `/ping` のクールダウン: 5秒

---

## ローカライズ

### /ping

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/ping.ts`

#### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `ping.description` | コマンド説明 | ボットの応答速度を確認 | Check bot response speed |

#### ユーザーレスポンス

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `user-response.measuring` | 計測中メッセージ | 🏓 計測中... | 🏓 Measuring... |
| `user-response.result` | ping結果 | 📡 API レイテンシー: **{{apiLatency}}ms**（改行）💓 WebSocket Ping: **{{wsLatency}}ms** | 📡 API Latency: **{{apiLatency}}ms**（改行）💓 WebSocket Ping: **{{wsLatency}}ms** |

### /help

**翻訳ファイル:** `src/shared/locale/locales/{ja,en}/features/help.ts`

#### コマンド定義

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `help.description` | コマンド説明 | コマンド一覧を表示 | Show command list |

#### Embed

| キー | 用途 | ja | en |
| --- | --- | --- | --- |
| `embed.title.help` | ヘルプタイトル | 📖 彩加 =Saika= コマンド一覧 | 📖 彩加 =Saika= Commands |
| `embed.description.help` | マニュアルリンク | 📚 詳しい使い方: {{url}} | 📚 Learn more: {{url}} |
| `embed.field.name.basic` | 基本カテゴリ名 | 🔧 基本 | 🔧 Basic |
| `embed.field.name.config` | 設定カテゴリ名 | ⚙️ 設定（管理者） | ⚙️ Settings (Admin) |
| `embed.field.name.action` | 操作カテゴリ名 | 🛠️ 操作 | 🛠️ Actions |
| `embed.field.value.basic` | 基本コマンド一覧 | `/ping` — Bot の応答速度を確認（改行）`/help` — このヘルプを表示 | `/ping` — Check bot response speed（改行）`/help` — Show this help |
| `embed.field.value.config` | 設定コマンド一覧 | `/guild-config` — ギルド全体の設定（改行）... | `/guild-config` — Guild settings（改行）... |
| `embed.field.value.action` | 操作コマンド一覧 | `/afk` — AFK チャンネルへ移動（改行）... | `/afk` — Move to AFK channel（改行）... |

---

## テストケース

### ユニットテスト

- [x] `/ping`: レイテンシ表示Embed、executeへの委譲
- [x] `/help`: コマンド一覧Embed表示、executeへの委譲

---

## 依存関係

| 依存先               | 内容                                                         |
| -------------------- | ------------------------------------------------------------ |
| `USER_MANUAL_URL`    | `/help` のユーザーマニュアルリンク表示に使用（環境変数、未設定時は省略） |
