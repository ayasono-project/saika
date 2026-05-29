# Git ワークフロー・コミット運用ガイド

> Git Workflow & Commit Convention Guide

最終更新: 2026年5月29日（ブランチ保護を Rulesets 実態に追従・head ブランチ自動削除を追記）

---

## 概要

このドキュメントは、saika における Git ブランチ戦略とコミットメッセージ規約を定義します。

---

## ブランチ戦略

### ブランチ構成

```
main          ← 本番環境（常にデプロイ可能な状態）
  ↑ PR only
develop       ← 開発統合ブランチ（次リリース向けの集約点）
  ↑ 直接 push 可（commit 時: lint・typecheck・commitlint、push 時: test を husky で自動実行）
feature/xxx   ← 機能開発（大規模変更や履歴を整理したい場合に使用）
fix/xxx       ← バグ修正
hotfix/xxx    ← 本番障害の緊急修正（main から直接分岐）
docs/xxx      ← ドキュメントのみの変更
refactor/xxx  ← リファクタリング
```

### 各ブランチの役割

| ブランチ     | 説明                                             | 直接push | マージ先           |
| ------------ | ------------------------------------------------ | -------- | ------------------ |
| `main`       | 本番デプロイ済みコード。 CI/CDが自動デプロイする | ❌       | -                  |
| `develop`    | 開発統合ブランチ （次リリース向けの集約点）      | ✅       | `main`             |
| `feature/*`  | 新機能の開発（大規模・履歴整理が必要な場合）     | ✅       | `develop`          |
| `fix/*`      | バグ修正                                         | ✅       | `develop`          |
| `hotfix/*`   | 本番障害の緊急修正                               | ✅       | `main` + `develop` |
| `docs/*`     | ドキュメントのみの変更                           | ✅       | `develop`          |
| `refactor/*` | リファクタリング                                 | ✅       | `develop`          |

---

## 通常の開発フロー

**`develop` には直接 push できる。`main` へは必ず PR 経由でのみ変更する。**

### パターン A: develop に直接 push（通常の小〜中規模の変更）

```bash
# developを最新化
git checkout develop
git pull origin develop

# 開発・コミット
git add src/features/bump-reminder/
git commit -m "feat(bump-reminder): メンションロール設定機能を追加"

# develop に直接 push（push 前に husky が pnpm test を自動実行してブロック）
git push origin develop
```

> commit 時に husky が lint・typecheck・commitlint を、push 時に test を自動実行する。
> いずれかが失敗すると commit / push がブロックされる（`--no-verify` で強制スキップも可）。

### パターン B: フィーチャーブランチ → PR（大規模変更・履歴を整理したい場合）

```bash
# フィーチャーブランチを作成
git checkout -b feature/vc-recruit

# 開発・コミット
git commit -m "feat(vc-recruit): ..."

# push して PR を作成
git push origin feature/vc-recruit
gh pr create --base develop --title "feat(vc-recruit): ..." --body "..."
# CI 通過後に自動でマージ（rebase 推奨）
gh pr merge <PR番号> --rebase --auto
```

### develop から main へのリリース（必ず PR 経由）

機能がまとまったタイミングで `develop → main` の PR を作成してリリースする。

```bash
# GitHub で develop → main の PR を作成
gh pr create --base main --title "release: vX.Y.Z" --body "..."
# CI 通過後に自動でマージ
gh pr merge <PR番号> --merge --auto
```

---

## ホットフィックスフロー（本番障害時）

本番環境で緊急対応が必要な場合のみ使用する。

```bash
# main から直接分岐
git checkout main
git pull origin main
git checkout -b hotfix/fix-crash-on-empty-guild

# 修正・コミット・push後、main への PR を作成
gh pr create --base main --title "fix(...): ..." --body "..."

# CI 通過後に自動マージ
gh pr merge <main向けPR番号> --merge --auto   # main は Merge commit

# develop へはバックポートとして直接 push
git checkout develop
git pull origin develop
git cherry-pick <fixのコミットSHA>
git push origin develop
```

---

## コミットメッセージ規約（Conventional Commits）

### フォーマット

```
<type>(<scope>): <subject>

[body]

[footer]
```

### type 一覧

| type       | 用途                                        | 例                                               |
| ---------- | ------------------------------------------- | ------------------------------------------------ |
| `feat`     | 新機能の追加                                | `feat(afk): 自動解除機能を追加`                  |
| `fix`      | バグ修正                                    | `fix(bump-reminder): 二重送信を修正`             |
| `docs`     | ドキュメントのみの変更                      | `docs: GIT_WORKFLOWを追加`                       |
| `style`    | フォーマット・セミコロン等 （動作に無影響） | `style: prettierによる整形`                      |
| `refactor` | 機能変更・バグ修正を伴わない コード変更     | `refactor(scheduler): 責務を分離`                |
| `perf`     | パフォーマンス改善                          | `perf(db): クエリにインデックスを追加`           |
| `test`     | テストの追加・修正                          | `test(afk): エッジケースの ユニットテストを追加` |
| `chore`    | ビルド・補助ツールの変更                    | `chore: pnpmをアップデート`                      |
| `ci`       | CI設定の変更                                | `ci: commitlintワークフローを追加`               |
| `build`    | ビルドシステム・外部依存の変更              | `build: tsconfig.jsonの targetをES2022に変更`    |
| `revert`   | 過去のコミットを revert                     | `revert: feat(afk): 自動解除機能を追加`          |

### scope（省略可）

主要な scope の例：

| scope            | 対象                               |
| ---------------- | ---------------------------------- |
| `afk`            | AFK機能                            |
| `bump-reminder`  | Bumpリマインダー                   |
| `member-log`     | 入退室ログ                         |
| `sticky-message` | スティッキーメッセージ             |
| `vac`            | VAC（VC自動作成機能）              |
| `vc-recruit`     | VC募集機能                         |
| `vc-panel`       | VCコントロールパネル共通モジュール |
| `scheduler`      | スケジューラー                     |
| `db`             | データベース・マイグレーション     |
| `web`            | Webサーバー・API                   |
| `ci`             | CI/CD設定                          |

### subject のルール

- **動詞で始める**（「〜を追加」「〜を修正」の形）
- **日本語OK**（このプロジェクトは日本語ファーストで記述）
- **100文字以内**
- 末尾にピリオドをつけない

### コミットメッセージの例

```bash
# 良い例
feat(afk): メッセージ送信時にAFK状態を自動解除する機能を追加
fix(bump-reminder): コマンド登録時に二重登録されるバグを修正
test(scheduler): scheduleJobのエッジケーステストを追加
docs: コミット運用ガイドを追加
ci: developブランチのブランチ保護ルールを追加
refactor(db): guildSettingsRepositoryの責務をusecase/persistenceに分割

# 悪い例
update                         # type がない
feat: fix bug                  # type と実際の変更内容が矛盾
FEAT: 機能追加                 # type は小文字
feat: 〜を追加しました。       # 末尾にピリオド / 敬語不要
feat(afk)(scheduler): ...      # scope は1つ
```

### 複数の変更をまとめるとき

1コミットに異なる type の変更を混在させない。分割してコミットすること。

```bash
# 悪い例（1コミットに feat + test を混在）
git commit -m "feat(afk): 追加 + テストも書いた"

# 良い例（分割する）
git commit -m "feat(afk): メッセージ送信時にAFK状態を自動解除する機能を追加"
git commit -m "test(afk): AFK自動解除のユニットテストを追加"
```

---

## ブランチ命名規則

```
<type>/<kebab-case-description>
```

| 例                                   | 用途             |
| ------------------------------------ | ---------------- |
| `feature/bump-reminder-mention-role` | 新機能           |
| `fix/afk-status-not-cleared`         | バグ修正         |
| `hotfix/crash-on-empty-guild`        | 緊急修正         |
| `refactor/db-repository-split`       | リファクタリング |
| `docs/git-workflow`                  | ドキュメント     |

- **すべて小文字のkebab-case** を使用
- 日本語・スペースは使用しない

---

## PR 運用規則

### develop への直接 push 時のチェック

- [ ] コミット前に `pnpm test` を実行し、全テストが通ることを確認している
- [ ] コミットを分割する場合は、各コミット単体でも全テストが通る状態を維持している
- [ ] コミットメッセージが Conventional Commits 形式になっている（husky が自動検証）
- [ ] `pnpm test` が通っている（husky が push 前に自動実行）

### PR 作成時のチェック（feature/\* → develop、または develop → main）

- [ ] ブランチ名が命名規則に従っている
- [ ] コミットメッセージが Conventional Commits 形式になっている
- [ ] `pnpm test` がローカルで通っている
- [ ] `pnpm typecheck` がローカルで通っている

### ローカル自動チェック（husky）

| タイミング    | フック       | 実行内容                                   |
| ------------- | ------------ | ------------------------------------------ |
| **commit 時** | `pre-commit` | typecheck・lint（lint-staged で自動修正）  |
| **commit 時** | `commit-msg` | コミットメッセージ形式の検証（commitlint） |
| **push 前**   | `pre-push`   | テスト実行（`pnpm test`）                  |

### CI の自動実行（GitHub Actions）

| トリガー                         | ワークフロー     | 実行内容                     |
| -------------------------------- | ---------------- | ---------------------------- |
| **main / develop 向け PR**       | `ci.yml`         | lint・型チェック・テスト実行 |
| **main / develop 向け PR**       | `commitlint.yml` | コミットメッセージ形式の検証 |
| **main への push（PRマージ後）** | —                | Coolify が Webhook で自動デプロイ |

### マージ戦略（PR 経由の場合）

| マージ先  | 方式                                     | CLI オプション          | 理由                           |
| --------- | ---------------------------------------- | ----------------------- | ------------------------------ |
| `develop` | **Rebase merge** または **Squash merge** | `--rebase` / `--squash` | コミット構成に応じて使い分ける |
| `main`    | **Merge commit**                         | `--merge`               | リリース履歴を明確に残す       |

**Rebase merge を使う**（推奨）— コミットが意味のある粒度に分割されている場合

**Squash merge を使う** — WIP コミットが混在している場合

> **auto-merge**: `gh pr merge <番号> --rebase --auto` で CI 通過後に自動マージ。

---

## ブランチ保護の設定（Rulesets）

[Settings > Rules > Rulesets](https://github.com/ayasono-project/saika/rules) で管理（**Rulesets** ベース。旧 Branch Protection Rules ではない）。

### `main` ブランチ（ruleset: `protect-main`）

直接 push は禁止。PR 経由でのみ変更可能で、CI が通らないとマージできない。

| ルール                                       | 状態 |
| -------------------------------------------- | ---- |
| Require a pull request before merging        | ✅（レビュー承認は不要） |
| Require status checks to pass: `Test`        | ✅   |
| Block force pushes (non-fast-forward)        | ✅   |
| Restrict deletions（ブランチ削除禁止）       | ✅   |

### `develop` ブランチ（ruleset: `protect-develop`）

直接 push は可（PR は必須ではない）。ただし **force push と削除は禁止**されている。

| ルール                                       | 状態 |
| -------------------------------------------- | ---- |
| Require a pull request before merging        | ❌（直接 push 可） |
| Require status checks to pass                | ❌   |
| Block force pushes (non-fast-forward)        | ✅   |
| Restrict deletions（ブランチ削除禁止）       | ✅   |

> commit・push 時は husky フックが自動実行される（pre-commit: typecheck・lint、commit-msg: commitlint、pre-push: test）。`--no-verify` オプションで強制スキップも可能だが、基本不要。

### マージ後の head ブランチ自動削除

リポジトリ設定「Automatically delete head branches」（`delete_branch_on_merge`）と auto-merge（`--auto`）を**有効**にしている。PR をマージすると head ブランチ（`feature/*` / `fix/*` 等）は**自動削除**される。`develop` / `main` は Restrict deletions ルールで保護されているため、`develop → main` のリリース PR をマージしても `develop` は削除されない。

---

## 参考

- [Conventional Commits](https://www.conventionalcommits.org/ja/v1.0.0/)
- [commitlint 設定](../../commitlint.config.js)
- [CI/CD ワークフロー](../../.github/workflows/)
