# テストガイドライン

> Testing Guidelines - テスト設計とベストプラクティス

最終更新: 2026年3月16日

---

## 概要

このドキュメントは、saika におけるテスト設計方針・命名規則・実行方法を定義します。
Vitest を前提に、回帰を素早く検知できるテスト運用を目的とします。

---

## テスト方針

### 基本方針

- **ロジックがある層だけをテストする** — 条件分岐・変換・副作用の制御を含む層のみテストを書く
- 定数の等値確認・ファイルの存在確認・配列の順序確認など、動作保証に寄与しないテストは作成しない
- カバレッジ目標: **Stmts/Lines 95%以上・Functions 87%以上・Branches 94%以上**
- テストピラミッド: ユニット 70% / 統合 25% / E2E 5%（次フェーズ）
- カバレッジプロバイダは `istanbul` を使用する

### レイヤ別テスト方針

| レイヤー | テスト | 理由 |
| --- | --- | --- |
| `shared/features/*/xxxConfigService.ts` | **必須** | ドメインロジック（条件分岐・上限チェック・正規化）|
| `bot/features/*/handlers/*.ts` | **必須** | 早期リターン・エラー委譲・副作用制御 |
| `bot/features/*/commands/*.ts` | **必須** | サブコマンドルーティング・権限ガード |
| `bot/commands/*.ts` / `bot/events/*.ts` | **必須** | コマンド名・イベント名・execute委譲先の検証 |
| `bot/utils/commandLoader.ts` / `eventLoader.ts` | 必須 | ENOENT例外・重複検出の制御フロー |
| `shared/database/repositories/*.ts` | **要判断** | JSON パース・null変換等の独自ロジックがあれば必須、純粋委譲なら不要 |
| `bot/features/*/repositories/*.ts` | 不要 | Prisma への純粋委譲のみ |
| `bot/services/botCompositionRoot.ts` | 不要 | サービスアクセサの配線のみ |

**カバレッジ除外対象**: 除外リストは `vitest.config.ts` の `coverage.exclude` が唯一の情報源。
除外基準: 型定義のみ / Prisma への純粋委譲 / DI配線のみ / UIハンドラーバレル / collector パターン等のユニットテスト困難な UI フロー制御。

### 配置・命名ルール

- テスト配置は `tests/unit/` / `tests/integration/` とし、`src/` のディレクトリ構成に対称化する
- ファイル名は `src/` 側のベース名に一致させる（kebab-case を含む）
- 単体テスト: `*.test.ts`、統合テスト: `*.integration.test.ts`
- `src` 参照は `@/` エイリアスを使う
- `vi.mock()` は対象実装が実際に import しているパスと一致させる（`index.ts` パスは使わない）

```text
tests/
├── setup.ts
├── tsconfig.json
├── helpers/
│   └── testHelpers.ts
├── unit/                    # src 対称
│   ├── bot/
│   │   ├── commands/
│   │   ├── events/
│   │   ├── features/
│   │   ├── handlers/
│   │   └── utils/
│   ├── shared/
│   └── web/
├── integration/             # src 対称
└── e2e/                     # 次フェーズ
```

#### テスト命名

```typescript
describe("ClassName/FunctionName", () => {
  describe("methodName", () => {
    it("条件の説明 → 期待される動作", () => {
      // test
    });
  });
});
```

### コメント規約

| 場所 | 必須/推奨 | 内容 |
| --- | --- | --- |
| ファイル先頭 | 必須 | `// tests/path/to/file.test.ts` |
| `describe` 直前 | 必須 | 検証グループの目的（1行） |
| `beforeEach` / `afterEach` 直前 | 必須 | セットアップ・後処理の理由（1行） |
| `it` 文字列 | **必須** | 日本語で検証内容・条件・前提を直接記載 |
| 動的インポート関数 | 必須 | モジュールキャッシュリセットの理由（1行） |

```typescript
// fooHandler の正常フロー・早期リターン・エラー委譲を検証
describe("bot/features/foo/fooHandler", () => {

  // 各ケースでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("panelMessageId が null の場合は finally での削除処理をスキップする", () => { ... });
});
```

### テスト設計パターン

#### AAA パターン

```typescript
test("should do something", () => {
  // Arrange
  const input = "test";

  // Act
  const result = functionUnderTest(input);

  // Assert
  expect(result).toBe("expected");
});
```

#### モック戦略

- 外部依存（Discord API / DB / 外部サービス）はモック化
- 時刻依存は fake timers を優先
- ログ出力はモックし、テスト出力を安定化

#### tDefault のモック

`tDefault("system:xxx")` を呼び出す実装をテストする場合、キーをそのまま返すモックを使う：

```typescript
vi.mock("@/shared/locale/localeManager", () => ({
  tDefault: vi.fn((key: string, options?: Record<string, unknown>) =>
    options?.signal ? `${key}:${options.signal}` : key,
  ),
  tGuild: tGuildMock,
}));

// アサーション: キーがそのまま返るので文字列で期待値を指定
expect(loggerMock.error).toHaveBeenCalledWith(
  "system:bump-reminder.panel_handle_failed",
  expect.any(Error),
);
```

#### 条件式の分岐網羅

複数条件が連なるハンドラーでは、各条件の true/false を組み合わせてテストする。

```typescript
// NG: デフォルトのモックのみ → 一部の分岐が未カバー
calcDurationMock.mockReturnValue({ years: 5, months: 3, days: 7 });

// OK: 各条件の false パスもカバー
it("years=0, months=0 の場合でも送信される", async () => {
  calcDurationMock.mockReturnValueOnce({ years: 0, months: 0, days: 5 });
});
```

### テストヘルパー

`tests/helpers/testHelpers.ts` の主要ヘルパー:

| ヘルパー | 用途 |
| --- | --- |
| `createMockUser()` / `createMockGuild()` / `createMockMember()` | Discord オブジェクトのモック |
| `createMockTextChannel()` / `createMockInteraction()` | チャンネル・インタラクションのモック |
| `generateSnowflake()` | ユニークな Snowflake ID 生成 |
| `createTestGuildConfig()` | テスト用ギルド設定 |
| `expectError()` | エラーアサーション |
| `wait()` | 非同期待機 |

### 実行方法

```bash
pnpm test              # すべてのテスト
pnpm test:watch        # ウォッチ実行
pnpm test:coverage     # カバレッジ付き実行
```

### E2E テスト方針（次フェーズ）

- Discord API は E2E でもモックを使う
- DB はテスト専用ストレージ（隔離済み）を使い、ケースごとに初期化する
- テストファイルは `tests/e2e/` に配置し、シナリオは各機能の仕様書（`docs/specs/`）に記載する

---

## チェックリスト

### テスト作成

- [ ] ロジックがある層（サービス・ハンドラー・コマンド）にテストを作成している
- [ ] テストファイルの配置が `src/` と対称になっている
- [ ] `vi.mock()` のパスが実装の import パスと一致している

### テスト品質

- [ ] ハンドラーの早期リターン分岐をすべて網羅している
- [ ] 条件式の true/false の組み合わせを網羅している
- [ ] `it` 文字列に日本語で検証の観点・条件・前提を記載している

### コメント

- [ ] ファイル先頭に `// tests/path/to/file.test.ts` がある
- [ ] `describe` 直前に検証グループの目的コメントがある
- [ ] `beforeEach` / `afterEach` 直前に理由コメントがある

### 検証

- [ ] `pnpm test` で全テストが通る
- [ ] `pnpm test:coverage` で Stmts/Lines 95%以上・Funcs 87%以上・Branches 94%以上を確認した

---

## 関連ドキュメント

- [IMPLEMENTATION_GUIDELINES.md](IMPLEMENTATION_GUIDELINES.md): 実装ガイドライン
