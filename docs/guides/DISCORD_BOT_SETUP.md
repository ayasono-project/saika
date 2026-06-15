# Discord Bot セットアップガイド

> Discord Developer Portal でアプリを作成し、サーバーへ招待するまでの手順

最終更新: 2026年6月16日

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

3. **BOT PERMISSIONS** で以下の個別権限を選択（**Administrator は付与しない**）:

| 権限 | Developer Portal 表記 | 主な用途 |
| -- | -- | -- |
| チャンネルを見る | View Channels | 共通（コマンド応答） |
| メッセージを送信 | Send Messages | 共通（コマンド応答） |
| 埋め込みリンク | Embed Links | 共通（embed 送信） |
| メッセージ履歴を読む | Read Message History | 共通 |
| メッセージの管理 | Manage Messages | message-delete / sticky / vc-recruit |
| チャンネルの管理 | Manage Channels | ticket / vac / vc-recruit / vc-auto-recruit / vc-command |
| ロールの管理 | Manage Roles | ticket / reaction-role / kick 系マーカーロール |
| メンバーを移動 | Move Members | vac / vc-command / afk |
| メンバーをキック | Kick Members | unverified-kick / inactive-kick |
| 公開スレッドの作成 | Create Public Threads | vc-recruit（自動スレッド） |
| スレッドでメッセージを送信 | Send Messages in Threads | vc-recruit（募集スレッドの overwrite 付与） |
| サーバー管理 | Manage Server | member-log（招待元トラッキング） |

> **最小権限の方針**: 彩加は Administrator を要求しない。上記は各機能が実際に呼び出す Discord API に必要な個別権限のみ。チャンネル単位の上書き（overwrite）で Bot の権限を制限すると一部機能が動かなくなる点に注意。
>
> なお `@everyone`／`@here` や「メンション不可ロール」への**通知を実際に飛ばす**には `MentionEveryone` が別途必要だが、最小権限維持のため既定では含めていない（メッセージ投稿自体は成功し、当該メンションが通知を飛ばさないだけ。VC自動募集等で @everyone 通知を使いたい場合は手動で付与する）。

### 4-2. 招待 URL の生成とサーバー追加

1. ページ下部に生成された URL をコピー
2. ブラウザでアクセスして招待先サーバーを選択
3. **認証** → **はい** で完了

> Bot を追加するには「サーバーを管理する」権限が必要。

---

## 5. 一般公開設定

Bot を自分のサーバーだけでなく、誰でも招待できるようにするための設定。

### 5-1. 公開 Bot の有効化

1. 左メニュー → **Bot**
2. **Authorization Flow** セクション → **公開 Bot** を **ON**

> これを有効にすると、OAuth2 招待 URL を知っている人なら誰でも Bot をサーバーに追加できるようになる。

### 5-2. コマンド登録モードの確認

Bot は環境変数 `DISCORD_GUILD_ID` の有無でコマンドの登録先を切り替える。

| `DISCORD_GUILD_ID` | 登録先 | 反映速度 | 用途 |
| -- | -- | -- | -- |
| 設定あり | 指定ギルドのみ | 即時 | 開発・テスト |
| 未設定 | グローバル（全サーバー） | 最大1時間 | 本番・一般公開 |

一般公開時は **`DISCORD_GUILD_ID` を設定しない**（Portainer の環境変数から削除する）。

### 5-3. Bot 認証（Verification）

Bot が **75 サーバー以上**に参加すると、Discord による認証申請が必要になる。

**申請に必要なもの:**

- Bot の説明文（General Information に記載）
- プライバシーポリシー URL
- 利用規約 URL
- Privileged Gateway Intents の使用理由

| Intent | 使用理由 |
| -- | -- |
| Server Members Intent | メンバーの参加・退出イベント取得（メンバーログ機能） |
| Message Content Intent | メッセージ本文の読み取り（Bump 検知） |

> 認証が完了するまで、100 サーバー以上への参加がブロックされる。
> 認証申請は [Discord Developer Portal](https://discord.com/developers/applications) → アプリ選択 → **App Verification** から行う。

---

## 6. 動作確認

Bot がサーバーに参加したら、以下を確認する。

1. Bot がサーバーのメンバー一覧にオンラインで表示されている
2. スラッシュコマンドが候補に表示される（`/bump-reminder-settings` など）

スラッシュコマンドが表示されない場合は、Bot の再起動か、コマンド登録まで数分待つ。

> グローバルコマンド登録（`DISCORD_GUILD_ID` 未設定）の場合、反映まで最大1時間かかる。

---

## 関連ドキュメント

- [DEPLOYMENT.md](DEPLOYMENT.md) — GitHub Actions による自動デプロイフロー
