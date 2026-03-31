// vitest.config.ts
// Vitest 設定（Jest → Vitest 移行）

import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // テスト実行環境
    environment: "node",

    // グローバル API を有効化（describe / it / expect / vi が import なしで使える）
    globals: true,

    // テストファイルの検索対象
    include: ["src/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.ts"],

    // 各テスト実行前のセットアップファイル
    setupFiles: ["./tests/setup.ts"],

    // タイムアウト（ms）
    testTimeout: 10000,

    // モック自動リセット設定
    clearMocks: true,
    restoreMocks: true,

    // カバレッジ設定
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.d.ts",
        "src/**/*.test.ts",
        "src/**/*.spec.ts",
        "src/**/main.ts",
        "src/**/server.ts",
        // Type-only files (no runtime executable code)
        "src/bot/handlers/interactionCreate/ui/types.ts",
        // Re-export barrel with no executable statements (v8 cannot track)
        "src/shared/errors/errorHandler.ts",
        // Repositories: DB 委譲のみ、独自ロジックなし → 計測対象外
        "src/bot/features/**/repositories/*.ts",
        "src/shared/database/repositories/*.ts",
        // Repository usecases: 単一 prisma 呼び出しのみ（分岐・変換なし）→ 計測対象外
        "src/bot/features/bump-reminder/repositories/usecases/deleteBumpReminder.ts",
        "src/bot/features/bump-reminder/repositories/usecases/findBumpReminderById.ts",
        // クリーンアップサービス: Discord API 委譲のみ → 計測対象外
        "src/bot/features/ticket/services/ticketCleanupService.ts",
        // DI composition root: 配線のみ、ロジックなし → 計測対象外
        "src/bot/services/botCompositionRoot.ts",
        // UI handler array barrels: 配列エクスポートのみ → 計測対象外
        "src/bot/handlers/index.ts",
        "src/bot/handlers/interactionCreate/ui/buttons.ts",
        "src/bot/handlers/interactionCreate/ui/modals.ts",
        "src/bot/handlers/interactionCreate/ui/selectMenus.ts",
      ],
      reportsDirectory: "coverage",
      reporter: ["text", "lcov", "html"],
      thresholds: {
        branches: 92,
        functions: 87,
        lines: 95,
        statements: 95,
      },
    },
  },

  // パスエイリアス（@/ → src/）
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
