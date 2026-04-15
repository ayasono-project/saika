# saika - TODO

> タスク管理・進捗状況・残件リスト

最終更新: 2026年4月15日

---

## 機能別ステータス

| 機能                          | ドキュメント | 実装 | テスト | 備考                                                       |
| ----------------------------- | ------------ | ---- | ------ | ---------------------------------------------------------- |
| コア（エラー/DB/ロガー/設定） | ✅           | ✅   | ✅     |                                                            |
| 多言語対応                    | ✅           | ✅   | ✅     | i18next + コマンドローカライズ（ja/en）                    |
| メッセージレスポンス          | ✅           | ✅   | ✅     | Embed ユーティリティ + タイトル命名規約                    |
| ログフォーマット              | ✅           | ✅   | ✅     | `logPrefixed()` / `logCommand()` によるプレフィックス統一  |
| 基本コマンド                  | ✅           | ✅   | ✅     | `/ping` `/help`                                            |
| ギルド設定                    | ✅           | ✅   | ✅     | view/set/reset/export/import + エラーチャンネル通知        |
| VC操作コマンド                | ✅           | ✅   | ✅     | `/vc rename` `/vc limit`                                   |
| AFK                           | ✅           | ✅   | ✅     | VCへの手動移動                                             |
| VAC（VC自動作成）             | ✅           | ✅   | ✅     | トリガー参加時に専用VC作成・自動削除                       |
| VC募集                        | ✅           | ✅   | ✅     | パネル・モーダル・ロール複数選択                           |
| メッセージ固定                | ✅           | ✅   | ✅     | set/remove/update/view                                     |
| メンバーログ                  | ✅           | ✅   | ✅     | 参加・退出通知・招待追跡・カスタムメッセージ               |
| メッセージ削除                | ✅           | ✅   | ✅     | 2段階確認フロー・複数チャンネル横断                        |
| Bumpリマインダー              | ✅           | ✅   | ✅     | Bump検知・自動リマインダー・パネルUI                       |
| チケット                      | ✅           | ✅   | ✅     | パネルUI・チケット作成/クローズ/再オープン/削除・自動削除  |
| リアクションロール            | ✅           | ✅   | ✅     | パネルUI・ロール付与/解除・パネル自動クリーンアップ        |

**凡例**: ✅ 完了 | 🚧 進行中 | ⬜ 未着手

---

## 残タスク サマリー

| セクション | タスク | 残件 |
| --- | --- | ---: |
| 1. Fastify API実装 | web ダッシュボードからのアクセス用 REST API | 未確定 |
| 2. Bot一般公開準備 | コマンド追加・認証申請 | 3 |
| 3. Coolify移行(saika側) | デプロイ手段の刷新 | 1（Secrets削除のみ） |
| **合計** | | **4+α** |

> インフラ側(VPS / Cloudflare / Coolify 本体)の作業は [`../infra/TODO.md`](../infra/TODO.md) で管理。

---

### 1. Fastify API実装（残: 未確定）

ayasono-webダッシュボードは saika の DB を直接参照せず、saika が公開する **Fastify REST API** を経由して設定の閲覧・編集を行う。saika 側にはこれまで Bot プロセスとヘルスチェック API しか存在しないため、新たに Web 用 API レイヤを追加する。

**背景**: ayasono-web は Coolify 上で saika とは別アプリとして動く。各 Bot(saika / hibiki / amane)は自身の libSQL DB を単一プロセスから読み書きし、外部からのアクセスは API 経由のみとする。これにより SQLite の同時書き込み制約に当たらず、PostgreSQL 移行も不要になる。詳細なリポジトリ構成・データアクセス方針は ayasono プロジェクト全体アーキテクチャの決定事項に従う。

- [ ] `src/api/` ディレクトリと Fastify サーバー初期化を追加（Bot プロセスとは別エントリポイント or 同一プロセス内に併設するかを決定）
- [ ] 認証ミドルウェア（Discord OAuth セッション検証 + ManageGuild 権限チェック）
- [ ] 機能別エンドポイント実装（ギルド設定・AFK・Bump・VAC・メンバーログ・VC募集・チケット・リアクションロール・メッセージ固定）
- [ ] エラーレスポンスの統一（既存の `AppError` 系列との整合）
- [ ] OpenAPI スキーマの整備（必要なら）
- [ ] Coolify 上で saika が API ポートを公開するよう docker-compose / Dockerfile を調整
- [ ] [docs/guides/ARCHITECTURE.md](docs/guides/ARCHITECTURE.md) を更新し、`src/api/` レイヤと API 公開方針を反映

> 詳細タスクは ayasono-web の進捗・API 仕様確定後に詰める。

### 2. Bot一般公開準備（残: 3件）

- [x] ライセンスを MIT → AGPL-3.0 に変更
- [ ] `/about` コマンドで公式URL・バージョンを表示
- [ ] helpコマンドにダッシュボードURLリンクを追加
- [ ] Discord Bot認証の申請（75サーバー到達後）

### 3. Coolify移行（saika側・残: 1件）

Portainer + GitHub Actions API デプロイ → Coolify による Git push 自動デプロイへの基盤刷新に伴う、saika リポジトリ内の整理作業。

> インフラ側(Cloudflare / VPS / Coolify 本体・Portainer 撤去)の作業は [`../infra/TODO.md`](../infra/TODO.md) を参照。

#### Phase A: Coolify 用ファイル整備

- [x] `docker-compose.coolify.yml` を新規作成（既存ボリュームを引き継いでロールバックを成立させる構成）
- [x] Coolify 上で saika アプリを作成し、環境変数を設定 → テストデプロイで `saika-bot` が正常起動することを確認
- [x] GitHub Webhook による自動デプロイ設定・動作確認
- [x] Coolify の Discord 通知設定
- [x] `.github/workflows/deploy.yml` の自動トリガーを停止（`workflow_dispatch` のみに変更）
- [x] `docs/guides/DEPLOYMENT.md` を Coolify ベースに書き換え

#### Phase B: 旧構成の完全撤去 — 完了

- [x] 旧ファイルを一括削除（`docker-compose.portainer.yml`、`.github/workflows/deploy.yml`、`.github/workflows/notify.yml`）
- [x] ドキュメントから Portainer 関連記述を削除
- [ ] GitHub Secrets の `PORTAINER_*` 系を削除

---

## 機能改善タスク

- [ ] VC募集: 入室中VCの自動検出（ハイブリッド方式）— 入室中なら現在のVCを自動選択、未入室なら従来のセレクトメニュー表示
- [ ] VC募集: 募集者をVCに移動する機能の削除 — 未入室時に動作しないため実用性が低い
- [ ] guild config view: チケット・リアクションロールの概要ページ追加 — 設定済みカテゴリ一覧・件数（チケット）、パネル件数・embedタイトル・設定チャンネル（リアクションロール）を表示。詳細は各機能の view コマンドへ誘導

---

## 機能拡張アイデア

- 自動翻訳機能（DeepL API等）
- 投票システム（Discord標準投票との差別化: グラフ化・レポート集計）
- メトリクス収集 / アラート設定（運用規模拡大時）
