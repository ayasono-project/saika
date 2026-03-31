// src/bot/services/botEventRegistration.ts
// Botイベント登録の責務を集約

import { logPrefixed, tDefault } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import type { BotClient } from "../client";
import { type BotEvent, registerBotEvent } from "../types/discord";

/**
 * Bot が扱うイベント一覧をクライアントへ登録する関数
 */
export function registerBotEvents(
  client: BotClient,
  // biome-ignore lint/suspicious/noExplicitAny: イベントの型パラメータは動的
  events: readonly BotEvent<any>[],
): void {
  logger.info(
    logPrefixed("system:log_prefix.bot", "system:bot.events.registering", {
      count: events.length,
    }),
  );

  // 受け取ったイベント定義を順に Client へ登録
  for (const event of events) {
    registerBotEvent(client, event);
    logger.info(
      tDefault("system:ready.event_registered", { name: event.name }),
    );
  }

  // 一括登録完了ログ
  logger.info(
    logPrefixed("system:log_prefix.bot", "system:bot.events.registered"),
  );
}
