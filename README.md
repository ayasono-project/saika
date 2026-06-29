# 彩加 =Saika=

> 出来ないこと以外は何でも出来る！コミュニティに彩りを加えるサーバー管理 Bot「彩加 =Saika=」

**開発開始**: 2026年2月 | **最終更新**: 2026年6月29日 | **AI利用**: コードおよびドキュメントの作成に生成AIを使用しています。

## 概要

「彩加 =Saika=」は、Discord サーバーの管理に必要な機能を充実した形で搭載した多機能 Bot です。
シンプルな操作性と豊富な機能で、あなたのコミュニティに彩りを加え、豊かで快適にします。

### コンセプト

- 🎨 **サーバーに彩りを加える** — さまざまな機能で豊かで快適なコミュニティに
- ⚙️ **充実した機能** — サーバー管理に必要なツールを一通り搭載
- 👆 **使いやすさ重視** — 直感的な操作と分かりやすい設定

## WEB ダッシュボード

ブラウザから各機能を設定できる管理画面を公開しています。Discord アカウントでログインし、サーバーごとに設定を変更できます。

**🌐 <https://saika-dash.sonozaki.net>**

## 主要機能

> **凡例**: ✅ 実装済み | 🚧 一部実装

| 機能                     | 概要                                                     | 状態 | マニュアル                                                      |
| ------------------------ | -------------------------------------------------------- | :--: | --------------------------------------------------------------- |
| 基本コマンド             | `/ping` `/help`                                          |  ✅  | [manual](docs/guides/USER_MANUAL.md#基本コマンド)               |
| ギルド設定               | 言語・通知チャンネル設定と設定エクスポート・インポート   |  ✅  | [manual](docs/guides/USER_MANUAL.md#ギルド設定機能)             |
| VC操作コマンド           | `/vc rename` `/vc limit` でBot管理VCの名前・人数制限変更 |  ✅  | [manual](docs/guides/USER_MANUAL.md#vc操作コマンド)             |
| AFK                      | VC非アクティブメンバーを指定AFKチャンネルへ手動移動       |  ✅  | [manual](docs/guides/USER_MANUAL.md#afk機能)                    |
| VC自動作成               | トリガーVC参加で専用VC自動作成・操作パネル・自動削除     |  ✅  | [manual](docs/guides/USER_MANUAL.md#vc自動作成機能)             |
| VC募集                   | 専用チャンネルでパネルUIによるVC募集投稿・管理           |  ✅  | [manual](docs/guides/USER_MANUAL.md#vc募集機能)                 |
| VC自動募集               | VC参加(0→1)時に指定チャンネルへ募集メッセージを自動投稿   |  ✅  | [manual](docs/guides/USER_MANUAL.md#vc自動募集機能)             |
| メッセージ固定           | 指定メッセージを新着投稿時に再送しチャンネル最下部に維持 |  ✅  | [manual](docs/guides/USER_MANUAL.md#メッセージ固定機能)         |
| メンバーログ             | 参加・脱退の通知パネルと参加経路・滞在期間の記録         |  ✅  | [manual](docs/guides/USER_MANUAL.md#メンバーログ機能)           |
| メッセージ削除           | フィルタ条件指定・プレビュー付きメッセージ一括削除       |  ✅  | [manual](docs/guides/USER_MANUAL.md#メッセージ削除機能)         |
| Bumpリマインダー         | Bump検知と2時間後の自動通知・メンション設定・通知登録UI   |  ✅  | [manual](docs/guides/USER_MANUAL.md#bumpリマインダー機能)       |
| チケット                 | チケットチャンネルでサポート対応                         |  ✅  | [manual](docs/guides/USER_MANUAL.md#チケット機能)               |
| リアクションロール       | ボタンクリックでロール付与・解除                         |  ✅  | [manual](docs/guides/USER_MANUAL.md#リアクションロール機能)     |
| 非アクティブ自動キック   | 一定期間活動のないメンバーを事前通知のうえ自動キック     |  ✅  | [manual](docs/guides/USER_MANUAL.md#非アクティブ自動キック機能) |
| 未承認ユーザー自動キック | 認証ロール未取得のメンバーを事前警告のうえ自動キック     |  ✅  | [manual](docs/guides/USER_MANUAL.md#未承認ユーザー自動キック機能) |

---

**🧭 実装方針:** 実装時は [アーキテクチャガイド](docs/guides/ARCHITECTURE.md)・[実装ガイド](docs/guides/IMPLEMENTATION_GUIDELINES.md)・[テストガイド](docs/guides/TESTING_GUIDELINES.md) を参照してください。

**📋 実装状況:** 開発タスクと進捗は [TODO.md](TODO.md) を参照してください。

## 技術スタック

### コア技術

- **Runtime**: Node.js 24以上
- **Language**: TypeScript 6.x - 厳格な型チェックで品質向上
- **Framework**: Discord.js 14.x - Discord Bot開発フレームワーク
- **Package Manager**: pnpm - 高速で効率的なパッケージ管理
- **共通基盤**: `@ayasono/shared/core` - logger / エラークラス（`BaseError` 階層）/ Discord Webhook 通知を提供する ayasono 共通パッケージ（git タグ + コミット済み dist で取り込み）

### データベース

- **Prisma** - タイプセーフなORMとスキーマ管理
- **PostgreSQL** - リレーショナルデータベース（Prisma の `@prisma/adapter-pg` ドライバアダプタ経由で接続）

### ロガー・ユーティリティ

- **Winston** - ログ管理（ローテーション、レベル制御）。`@ayasono/shared/core` の `createLogger` を env で wiring して初期化
- **i18next** - 多言語対応システム
- **node-cron** - タイマー・スケジューリング処理

### 開発ツール

- **Vitest** - テストフレームワーク（ユニット・インテグレーション・E2E）
- **Biome** - コード品質とフォーマット
- **tsx** - TypeScript高速実行
- **tsc-watch** - ファイル監視ビルド

## クイックスタート

### 必要環境

- Node.js 24以上
- pnpm 10以上

### セットアップ

```bash
# 依存関係インストール
pnpm install

# 環境変数設定
cp .env.example .env
# .envを編集してDiscordトークンなどを設定

# 開発モード起動
pnpm dev
```

> `@ayasono/shared` に依存します。リリース版は `package.json` の git タグ参照（`github:ayasono-project/shared#vX.Y.Z`）で取得し、shared 側が dist をコミットしているためインストール時ビルドは発生しません。**未公開の shared 変更をローカル検証する場合**は shared リポジトリを兄弟ディレクトリ `../shared` にクローン＆ビルドし、`pnpm-workspace.yaml` の `overrides`（`link:../shared`）を有効にします（手順は infra リポの `docs/LOCAL_DEV.md`）。

### スクリプト

```bash
# 開発
pnpm dev              # Bot開発サーバー起動

# ビルド
pnpm build            # TypeScriptビルド
pnpm tsc-watch        # ビルド監視モード
pnpm typecheck        # 型チェックのみ

# テスト
pnpm test             # テスト実行
pnpm test:watch       # テスト監視モード
pnpm test:coverage    # カバレッジレポート

# データベース
pnpm db:migrate       # Prisma マイグレーション実行
pnpm db:generate      # Prisma Client生成
pnpm db:studio        # Prisma Studio起動
pnpm db:push          # スキーマをDBに反映（開発用）

# コード品質
pnpm lint             # Biomeチェック
pnpm lint:fix         # Biome自動修正
```

## ドキュメント

### ガイド

- [TODO](TODO.md) - タスク管理・残件リスト
- [アーキテクチャガイド](docs/guides/ARCHITECTURE.md) - 全体設計方針・依存方向・責務境界
- [Discord Bot セットアップ](docs/guides/DISCORD_BOT_SETUP.md) - Discord Developer Portal でのアプリ作成・サーバー招待手順
- [デプロイガイド](docs/guides/DEPLOYMENT.md) - GitHub Actions による自動デプロイフロー詳細
- [Git ワークフロー](docs/guides/GIT_WORKFLOW.md) - ブランチ戦略・コミット規約・PR運用ルール
- [テストガイド](docs/guides/TESTING_GUIDELINES.md) - テスト方針・コメント規約・安定化ガイドライン
- [実装ガイド](docs/guides/IMPLEMENTATION_GUIDELINES.md) - 実装細則・分割手順・直接import運用
- [国際化ガイド](docs/guides/I18N_GUIDE.md) - 多言語対応ガイド
- [開発 Tips](docs/guides/DEV_TIPS.md) - 開発中のトラブルシューティング・よくあるハマりどころ
- [ユーザーマニュアル](docs/guides/USER_MANUAL.md) - サーバーメンバー・管理者向け操作ガイド


## ライセンス

AGPL-3.0 License - 詳細は [LICENSE](LICENSE) を参照
