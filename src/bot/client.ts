// src/bot/client.ts
// Discord Client初期化

import { Client, Collection, GatewayIntentBits } from "discord.js";
import { logPrefixed } from "../shared/locale/localeManager";
import { logger } from "../shared/utils/logger";
import { CooldownManager } from "./services/cooldownManager";
import type { Command } from "./types/discord";

/**
 * Bot 全体で共有する Discord クライアント実装
 * コマンドレジストリとクールダウン管理を保持する
 */
export class BotClient extends Client {
  public commands: Collection<string, Command>;
  public cooldownManager: CooldownManager;

  constructor() {
    // Bot が必要とする Intent を有効化して親 Client を初期化
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
      ],
    });

    // 実行時レジストリ（コマンド）とクールダウン管理を初期化
    this.commands = new Collection();
    this.cooldownManager = new CooldownManager();
  }

  /**
   * クライアントを安全にシャットダウン
   */
  async shutdown(): Promise<void> {
    // 先にクールダウン用タイマーを停止
    logger.info(
      logPrefixed("system:log_prefix.bot", "system:bot.client.shutting_down"),
    );
    this.cooldownManager.destroy();
    // Discord Client を破棄して Gateway 接続を閉じる
    await this.destroy();
    logger.info(
      logPrefixed(
        "system:log_prefix.bot",
        "system:bot.client.shutdown_complete",
      ),
    );
  }
}

/**
 * BotClient を生成し、初期化ログを出力して返すファクトリ関数
 */
export const createBotClient = (): BotClient => {
  // 生成直後に初期化ログを出力
  const client = new BotClient();

  logger.info(
    logPrefixed("system:log_prefix.bot", "system:bot.client.initialized"),
  );

  return client;
};
