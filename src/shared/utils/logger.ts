// src/shared/utils/logger.ts
// ロガー設定（Winston）

import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import { env, NODE_ENV } from "../config/env";
import { DiscordWebhookTransport } from "./discordWebhookTransport";

// ── ログローテーション設定 ──
/** 1ファイルあたりの最大サイズ */
const LOG_MAX_SIZE = "10m";
/** 全ログの保持期間 */
const LOG_RETENTION = "14d";
/** エラーログの保持期間（障害調査向けに長め） */
const ERROR_LOG_RETENTION = "30d";

// 実行環境を判定し、コンソール出力の粒度を切り替える
const isDevelopment = env.NODE_ENV === NODE_ENV.DEVELOPMENT;

// ファイル出力向けフォーマット（可読文字列 + メタ情報）
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
    // 追加メタ情報がある場合のみ末尾に付与
    const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : "";
    // Error の stack がある場合は改行して追記
    const stackStr = stack ? `\n${stack}` : "";
    return `${timestamp} [${level.toUpperCase()}]: ${message}${metaStr}${stackStr}`;
  }),
);

// コンソール向けフォーマット（開発時の可読性重視）
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    // stack がある場合のみ改行して表示
    const stackStr = stack ? `\n${stack}` : "";
    return `${timestamp} [${level}]: ${message}${stackStr}`;
  }),
);

// 実行環境に応じて追加するトランスポート群
const transports: winston.transport[] = [];

// 開発環境では詳細レベルでコンソール出力
if (isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: consoleFormat,
      level: env.LOG_LEVEL || "debug",
    }),
  );
}

// 全ログファイル（日次ローテーション）
transports.push(
  new DailyRotateFile({
    // アプリ全体の監査用ログ（info以上）
    filename: "logs/app-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxSize: LOG_MAX_SIZE,
    maxFiles: LOG_RETENTION,
    format: logFormat,
    level: "info",
  }),
);

// エラーログファイル（日次ローテーション）
transports.push(
  new DailyRotateFile({
    // 障害調査向けに保持期間を長めに確保
    filename: "logs/error-%DATE%.log",
    datePattern: "YYYY-MM-DD",
    maxSize: LOG_MAX_SIZE,
    maxFiles: ERROR_LOG_RETENTION,
    format: logFormat,
    level: "error",
  }),
);

// 本番環境でもコンソール出力（docker logs用）
if (!isDevelopment) {
  transports.push(
    new winston.transports.Console({
      format: logFormat,
      level: "info",
    }),
  );
}

// Discord Webhook URL が設定されている場合のみエラー通知トランスポートを追加
if (env.DISCORD_ERROR_WEBHOOK_URL) {
  transports.push(new DiscordWebhookTransport(env.DISCORD_ERROR_WEBHOOK_URL));
}

// アプリ全体で共有するロガーインスタンス
export const logger: winston.Logger = winston.createLogger({
  // ログレベルは環境変数優先、未設定時は info
  level: env.LOG_LEVEL || "info",
  transports,
  exitOnError: false,
});

export default logger;
