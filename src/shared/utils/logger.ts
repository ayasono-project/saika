// src/shared/utils/logger.ts
// ロガー設定（@ayasono/shared/core の createLogger を saika 設定で wiring する）

import { createLogger, DiscordWebhookTransport } from "@ayasono/shared/core";
import i18next from "i18next";
import type winston from "winston";
import { name as PROJECT_NAME } from "../../../package.json";
import { env, NODE_ENV } from "../config/env";

// 実行環境を判定し、コンソール出力の粒度を切り替える
const isDevelopment = env.NODE_ENV === NODE_ENV.DEVELOPMENT;

// Discord Webhook URL が設定されている場合のみエラー通知トランスポートを追加。
// title は送信時に i18next で解決する（localeManager との循環 import を避けるため i18next を直接利用）。
const extraTransports = env.DISCORD_ERROR_WEBHOOK_URL
  ? [
      new DiscordWebhookTransport(env.DISCORD_ERROR_WEBHOOK_URL, {
        getTitle: () =>
          String(
            i18next.t("system:discord.error_notification_title", {
              appName: PROJECT_NAME,
            }),
          ),
      }),
    ]
  : [];

// アプリ全体で共有するロガーインスタンス
export const logger: winston.Logger = createLogger({
  isDevelopment,
  logLevel: env.LOG_LEVEL,
  extraTransports,
});

export default logger;
