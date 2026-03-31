/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  // "Merge: <branch> → <target>" 形式の手動マージコミットをスキップ
  // PR スカッシュマージ時に生成される複合 type（例: "test/ci:" や "chore/feat/docs:"）も許容
  // GitHub PR スカッシュマージコミット（"subject (#NNN)" 形式）は develop→main 時の再チェックをスキップ
  ignores: [
    (commit) => /^Merge: .+ → .+/.test(commit),
    (commit) => /^(\w+\/)+\w+:/.test(commit),
    (commit) => /\(#\d+\)$/.test(commit.split("\n")[0]),
  ],
  rules: {
    // type の許可リスト（Conventional Commits 標準 + このプロジェクト独自）
    "type-enum": [
      2,
      "always",
      [
        "feat", // 新機能
        "fix", // バグ修正
        "docs", // ドキュメントのみの変更
        "style", // コードの意味に影響しない変更（空白、フォーマット等）
        "refactor", // バグ修正・機能追加でないコード変更
        "perf", // パフォーマンス改善
        "test", // テストの追加・修正
        "chore", // ビルドプロセス・補助ツールの変更
        "ci", // CI設定の変更
        "build", // ビルドシステムや外部依存の変更
        "revert", // コミットの revert
        "merge", // マージコミット
        "release", // develop → main リリースコミット
      ],
    ],
    // subject は小文字で始めることを強制しない（日本語対応）
    "subject-case": [0],
    // subject の最大文字数（日本語込みで長くなりがちなので緩め）
    "subject-max-length": [2, "always", 100],
    // body の最大行長（日本語対応）
    "body-max-line-length": [0],
  },
};
