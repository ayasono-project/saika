# 彩加 =Saika=

> サーバーに彩りを加え、豊かで快適なコミュニティを実現する多機能&使いやすさ重視のDiscordサーバー管理Bot

**開発開始**: 2026年2月 | **最終更新**: 2026年4月15日 | **AI利用**: コードおよびドキュメントの作成に生成AIを使用しています。

## 概要

「彩加 =Saika=」は、Discord サーバーの管理に必要な機能を充実した形で搭載した多機能 Bot です。
シンプルな操作性と豊富な機能で、あなたのコミュニティに彩りを加え、豊かで快適にします。

### コンセプト

- 🎨 **サーバーに彩りを加える** — さまざまな機能で豊かで快適なコミュニティに
- ⚙️ **充実した機能** — サーバー管理に必要なツールを一通り搭載
- 👆 **使いやすさ重視** — 直感的な操作と分かりやすい設定

## 主要機能

> **凡例**: ✅ 実装済み | 🚧 一部実装 | 📋 仕様書のみ

| 機能             | 概要                                                     | 状態 | 仕様書                                    | マニュアル                                                |
| ---------------- | -------------------------------------------------------- | :--: | ----------------------------------------- | --------------------------------------------------------- |
| 基本コマンド     | `/ping` `/help`                                          |  ✅  | [spec](docs/specs/BASIC_COMMANDS_SPEC.md) | [manual](docs/guides/USER_MANUAL.md#基本コマンド)         |
| ギルド設定       | 言語・通知チャンネル設定と設定エクスポート・インポート   |  ✅  | [spec](docs/specs/GUILD_CONFIG_SPEC.md)   | [manual](docs/guides/USER_MANUAL.md#ギルド設定機能)       |
| VC操作コマンド   | `/vc rename` `/vc limit` でBot管理VCの名前・人数制限変更 |  ✅  | [spec](docs/specs/VC_COMMAND_SPEC.md)     | [manual](docs/guides/USER_MANUAL.md#vc操作コマンド)       |
| AFK              | VC非アクティブメンバーを指定AFKチャンネルへ手動移動       |  ✅  | [spec](docs/specs/AFK_SPEC.md)            | [manual](docs/guides/USER_MANUAL.md#afk機能)              |
| VC自動作成       | トリガーVC参加で専用VC自動作成・操作パネル・自動削除     |  ✅  | [spec](docs/specs/VAC_SPEC.md)            | [manual](docs/guides/USER_MANUAL.md#vc自動作成機能)       |
| VC募集           | 専用チャンネルでパネルUIによるVC募集投稿・管理           |  ✅  | [spec](docs/specs/VC_RECRUIT_SPEC.md)     | [manual](docs/guides/USER_MANUAL.md#vc募集機能)           |
| メッセージ固定   | 指定メッセージを新着投稿時に再送しチャンネル最下部に維持 |  ✅  | [spec](docs/specs/STICKY_MESSAGE_SPEC.md) | [manual](docs/guides/USER_MANUAL.md#メッセージ固定機能)   |
| メンバーログ     | 参加・脱退の通知パネルと参加経路・滞在期間の記録         |  ✅  | [spec](docs/specs/MEMBER_LOG_SPEC.md)     | [manual](docs/guides/USER_MANUAL.md#メンバーログ機能)     |
| メッセージ削除   | フィルタ条件指定・プレビュー付きメッセージ一括削除       |  ✅  | [spec](docs/specs/MESSAGE_DELETE_SPEC.md) | [manual](docs/guides/USER_MANUAL.md#メッセージ削除機能)   |
| Bumpリマインダー | Bump検知と2時間後の自動通知・メンション設定・通知登録UI   |  ✅  | [spec](docs/specs/BUMP_REMINDER_SPEC.md)  | [manual](docs/guides/USER_MANUAL.md#bumpリマインダー機能) |
| チケット         | チケットチャンネルでサポート対応                         |  ✅  | [spec](docs/specs/TICKET_SPEC.md)         | [manual](docs/guides/USER_MANUAL.md#チケット機能)         |
| リアクションロール | ボタンクリックでロール付与・解除                       |  ✅  | [spec](docs/specs/REACTION_ROLE_SPEC.md)  | [manual](docs/guides/USER_MANUAL.md#リアクションロール機能) |

---

**🧭 実装方針:** 実装時は [アーキテクチャガイド](docs/guides/ARCHITECTURE.md)・[実装ガイド](docs/guides/IMPLEMENTATION_GUIDELINES.md)・[テストガイド](docs/guides/TESTING_GUIDELINES.md) を参照してください。

**📋 実装状況:** 開発タスクと進捗は [TODO.md](TODO.md) を参照してください。

## 技術スタック

### コア技術

- **Runtime**: Node.js 24以上
- **Language**: TypeScript 6.x - 厳格な型チェックで品質向上
- **Framework**: Discord.js 14.x - Discord Bot開発フレームワーク
- **Package Manager**: pnpm - 高速で効率的なパッケージ管理
- **共通基盤**: `@ayasono/shared/core` - logger / エラークラス（`BaseError` 階層）/ Discord Webhook 通知を提供する ayasono 共通パッケージ（git タグ参照で取り込み）

### データベース

- **Prisma** - タイプセーフなORMとスキーマ管理
- **libSQL** - SQLite互換のデータベース（ローカル/リモート対応）

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

> `@ayasono/shared` に依存します。リリース版は `package.json` の git タグ参照（`#vX.Y.Z`）で自動取得されますが、**未公開の shared 変更をローカル検証する場合**は shared リポジトリを兄弟ディレクトリ `../shared` にクローン＆ビルドし、`pnpm-workspace.yaml` の `overrides`（`link:../shared`）を有効にします（手順は infra リポの `docs/LOCAL_DEV.md`）。

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

### 機能仕様書

各機能の詳細設計と実装仕様を記載したドキュメントです。

- [基本コマンド](docs/specs/BASIC_COMMANDS_SPEC.md) - ping / help
- [ギルド設定機能](docs/specs/GUILD_CONFIG_SPEC.md) - ロケール設定・機能設定一覧表示・設定リセット
- [VC操作コマンド](docs/specs/VC_COMMAND_SPEC.md) - Bot管理VCの名前変更・人数制限変更
- [AFK機能](docs/specs/AFK_SPEC.md) - VCの非アクティブユーザーを手動でAFKチャンネルに移動
- [VC自動作成機能](docs/specs/VAC_SPEC.md) - トリガーチャンネル参加時に専用VCを作成・管理
- [VC募集機能](docs/specs/VC_RECRUIT_SPEC.md) - 専用チャンネルでVC参加者を募る投稿を作成
- [メッセージ固定機能](docs/specs/STICKY_MESSAGE_SPEC.md) - 指定メッセージをチャンネル最下部に固定表示
- [メンバーログ機能](docs/specs/MEMBER_LOG_SPEC.md) - メンバーの参加・脱退を指定チャンネルに記録
- [メッセージ削除](docs/specs/MESSAGE_DELETE_SPEC.md) - モデレーター向けメッセージ一括削除コマンド
- [Bumpリマインダー機能](docs/specs/BUMP_REMINDER_SPEC.md) - Disboard/ディス速Bump後、次回Bump時刻に自動通知
- [チケット](docs/specs/TICKET_SPEC.md) - チケットチャンネルでサポート対応
- [リアクションロール](docs/specs/REACTION_ROLE_SPEC.md) - ボタンクリックでロール付与・解除
- [メッセージレスポンス](docs/specs/MESSAGE_RESPONSE_SPEC.md) - Embed形式の統一メッセージシステム

## ライセンス

AGPL-3.0 License - 詳細は [LICENSE](LICENSE) を参照
