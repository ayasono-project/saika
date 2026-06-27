// src/shared/config/env.ts
// 環境変数管理（Zod バリデーション）

import "dotenv/config";
import { z } from "zod";

export const NODE_ENV_VALUES = ["development", "production", "test"] as const;

export const NODE_ENV: {
  DEVELOPMENT: "development";
  PRODUCTION: "production";
  TEST: "test";
} = {
  DEVELOPMENT: "development",
  PRODUCTION: "production",
  TEST: "test",
} as const;

export type NodeEnv = (typeof NODE_ENV_VALUES)[number];

/**
 * 検証済み環境変数の型
 */
export type Env = {
  NODE_ENV: NodeEnv;
  DISCORD_TOKEN: string;
  DISCORD_APP_ID: string;
  DISCORD_GUILD_ID?: string | undefined;
  DISCORD_ERROR_WEBHOOK_URL?: string | undefined;
  LOCALE: string;
  DATABASE_URL: string;
  LOG_LEVEL: "error" | "warn" | "info" | "http" | "verbose" | "debug" | "silly";
  USER_MANUAL_URL?: string | undefined;
  DASHBOARD_URL?: string | undefined;
  OFFICIAL_URL?: string | undefined;
  // ── 非アクティブ自動キック ──
  INACTIVE_KICK_CRON_OVERRIDE?: string | undefined;
  /** true のときキック実行をスキップ（通知のみ送信） */
  INACTIVE_KICK_DRY_RUN: boolean;
  /** true のとき per-guild の runHour / lastRunDate ガードを無視してスイープを即時実行 */
  INACTIVE_KICK_SKIP_GUARDS: boolean;
  /** 0 より大きい値のとき、DB/Guild からのメンバー取得を省略して指定数のモックデータで通知を確認する */
  INACTIVE_KICK_MOCK_MEMBERS?: number | undefined;
  // ── 未承認ユーザー自動キック ──
  UNVERIFIED_KICK_CRON_OVERRIDE?: string | undefined;
  /** true のときキック実行をスキップ（通知のみ送信） */
  UNVERIFIED_KICK_DRY_RUN: boolean;
  /** true のとき per-guild の runHour / lastRunDate ガードを無視してスイープを即時実行 */
  UNVERIFIED_KICK_SKIP_GUARDS: boolean;
  /** 0 より大きい値のとき、DB/Guild からのメンバー取得を省略して指定数のモックデータで通知を確認する */
  UNVERIFIED_KICK_MOCK_MEMBERS?: number | undefined;
  // ── バンプリマインダー ──
  /** true のときタイマーを 120 分→1 分に短縮し、手動テストコマンドを有効化する */
  BUMP_REMINDER_TEST_MODE: boolean;
  // ── web ダッシュボード API ──
  API_ENABLED: boolean;
  API_HOST: string;
  API_PORT: number;
  WEB_ORIGIN: string;
  JWT_SECRET?: string | undefined;
};

// 環境変数スキーマ定義（起動時バリデーション用）
export const envSchema: z.ZodType<Env> = z.object({
  NODE_ENV: z.enum(NODE_ENV_VALUES).default(NODE_ENV.DEVELOPMENT),

  // Discord
  DISCORD_TOKEN: z.string().min(50, "DISCORD_TOKEN is not configured"),
  DISCORD_APP_ID: z.string().min(10, "DISCORD_APP_ID is not configured"),
  DISCORD_GUILD_ID: z.string().optional(), // 開発用：設定するとギルドコマンドとして即座に登録
  DISCORD_ERROR_WEBHOOK_URL: z.string().optional(), // エラー通知用 Discord Webhook URL（任意）

  // ロケール
  LOCALE: z.string().default("ja"),

  // データベース
  DATABASE_URL: z.string().default("file:./storage/db.sqlite"),

  // ログレベル
  // Winston 標準レベル: error(0) warn(1) info(2) http(3) verbose(4) debug(5) silly(6)
  LOG_LEVEL: z
    .enum(["error", "warn", "info", "http", "verbose", "debug", "silly"])
    .default("info"),

  // ユーザーマニュアルURL（/help コマンドで表示、未設定時は省略）
  USER_MANUAL_URL: z.string().url().optional(),

  // web ダッシュボードURL（/help で案内、未設定時は省略）。本番でダッシュボードが
  // 稼働してから設定する想定（死んだリンクを出さないため env 出し分け）
  DASHBOARD_URL: z.string().url().optional(),

  // ayasono プロジェクト公式サイト（LP）URL（/about で案内、未設定時は省略）。
  // 専用 LP 公開後に設定する想定（死んだリンクを出さないため env 出し分け）
  OFFICIAL_URL: z.string().url().optional(),

  // ── 非アクティブ自動キック ──
  // cron 上書き（dev/検証用・未設定時は既定の毎時 0 分）
  INACTIVE_KICK_CRON_OVERRIDE: z.string().optional(),
  // キック実行スキップ（通知のみ）
  INACTIVE_KICK_DRY_RUN: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  // per-guild の runHour / lastRunDate ガードを無視して即時実行
  INACTIVE_KICK_SKIP_GUARDS: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  // 指定数のモックメンバーで通知 embed を確認する（0 または未設定で無効）
  INACTIVE_KICK_MOCK_MEMBERS: z.coerce.number().int().nonnegative().optional(),

  // ── 未承認ユーザー自動キック ──
  // cron 上書き（dev/検証用・未設定時は既定の毎時 0 分）
  UNVERIFIED_KICK_CRON_OVERRIDE: z.string().optional(),
  // キック実行スキップ（通知のみ）
  UNVERIFIED_KICK_DRY_RUN: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  // per-guild の runHour / lastRunDate ガードを無視して即時実行
  UNVERIFIED_KICK_SKIP_GUARDS: z
    .string()
    .optional()
    .transform((val) => val === "true"),
  // 指定数のモックメンバーで通知 embed を確認する（0 または未設定で無効）
  UNVERIFIED_KICK_MOCK_MEMBERS: z.coerce
    .number()
    .int()
    .nonnegative()
    .optional(),

  // ── バンプリマインダー ──
  // タイマー短縮（120 分→1 分）+ 手動テストコマンド有効化
  BUMP_REMINDER_TEST_MODE: z
    .string()
    .optional()
    .transform((val) => val === "true"),

  // ── web ダッシュボード API（Bot と同一プロセス内で起動する Fastify API） ──
  // API サーバーを起動するか（テスト・Bot 単体運用で無効化可能・未設定時は有効）
  API_ENABLED: z
    .string()
    .optional()
    .transform((val) => val !== "false"),
  // API のリッスンホスト（コンテナ内では 0.0.0.0）
  API_HOST: z.string().default("0.0.0.0"),
  // API のリッスンポート
  API_PORT: z.coerce.number().int().positive().default(8080),
  // CORS 許可オリジン（web ダッシュボードの配信元・カンマ区切りで複数可）
  WEB_ORIGIN: z.string().default("http://localhost:5173"),
  // セッション JWT の検証鍵（HMAC-SHA256・web BFF と共有・本番必須・dev は固定鍵にフォールバック）
  JWT_SECRET: z.string().optional(),
});

// 実行環境変数を検証して利用可能な設定へ変換する
const parseEnv = () => {
  try {
    // 1) 依存関係を含む追加検証 2) 実環境変数をパース
    const result = envSchema.parse(process.env);

    return result;
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Note: tDefaultは使用できない（env.tsはi18n初期化前に実行される）
      console.error("❌ Environment variable validation failed:");
      error.issues.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      console.error("\nPlease check your .env file.");
    }
    // 起動継続すると不正設定状態で動作するため即時終了
    process.exit(1);
  }
};

export const env: Env = parseEnv();
