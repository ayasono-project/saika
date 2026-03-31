# Discord Bot セットアップガイド

> Discord Developer Portal でアプリを作成し、サーバーへ招待するまでの手順

最終更新: 2026年3月25日

---

## 概要

このドキュメントでは、saika を動かすために必要な Discord Bot アプリの作成から、サーバーへの追加までを説明します。

---

## 1. アプリの作成

1. [Discord Developer Portal](https://discord.com/developers/applications) にログインする
2. **New Application** をクリック
3. **Name** に任意の名前を入力して **Create**

---

## 2. Bot の設定

### 2-1. Bot の追加

1. 左メニュー → **Bot**
2. **Add Bot** → **Yes, do it!**

### 2-2. トークンの取得

1. **Bot** ページ → **Reset Token** → **Yes, do it!**
2. 表示されたトークンをコピーして `.env` の `DISCORD_TOKEN` に登録

> ⚠️ トークンはこの画面を閉じると再表示されない。必ずコピーしてから閉じること。
> トークンは絶対に公開リポジトリにコミットしないこと。

### 2-3. Privileged Gateway Intents の有効化

**Bot** ページ下部の **Privileged Gateway Intents** で以下 **2つ** を有効にする。

| Intent | 用途 |
| -- | -- |
| **Server Members Intent** | メンバーの参加・退出イベント取得（メンバーログ機能） |
| **Message Content Intent** | メッセージ本文の読み取り（Bump 検知） |

> これらを有効にしないと、Bump 検知・メンバーログ機能が動作しない。

---

## 3. アプリケーション ID の取得

1. 左メニュー → **General Information**
2. **Application ID** をコピーして `.env` の `DISCORD_APP_ID` に登録

---

## 4. サーバーへの招待

### 4-1. OAuth2 URL Generator の設定

1. 左メニュー → **OAuth2** → **URL Generator**
2. **SCOPES** で以下を選択:

| Scope | 用途 |
| -- | -- |
| `bot` | Bot としてサーバーに参加 |
| `applications.commands` | スラッシュコマンドを登録 |

3. **BOT PERMISSIONS** で **Administrator（管理者）** を選択:

| 権限 | Developer Portal 表記 |
| -- | -- |
| 管理者 | Administrator |

> **管理者権限を推奨する理由**: Bot はチャンネル作成・メッセージ送信・メンバー移動・ロール管理など多数の権限を必要とします。管理者権限を付与することで、個別の権限設定なしにすべての機能が安定して動作します。

### 4-2. 招待 URL の生成とサーバー追加

1. ページ下部に生成された URL をコピー
2. ブラウザでアクセスして招待先サーバーを選択
3. **認証** → **はい** で完了

> Bot を追加するには「サーバーを管理する」権限が必要。

---

## 5. 動作確認

Bot がサーバーに参加したら、以下を確認する。

1. Bot がサーバーのメンバー一覧にオンラインで表示されている
2. スラッシュコマンドが候補に表示される（`/bump-reminder-config` など）

スラッシュコマンドが表示されない場合は、Bot の再起動か、コマンド登録まで数分待つ。

---

## 関連ドキュメント

- [DEPLOYMENT.md](DEPLOYMENT.md) — GitHub Actions による自動デプロイフロー
