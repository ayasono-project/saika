// ギルド参加イベント

import { Events } from "discord.js";
import { handleGuildCreate } from "../handlers/guildCreateHandler";
import type { BotEvent } from "../types/discord";

export const guildCreateEvent: BotEvent<typeof Events.GuildCreate> = {
  name: Events.GuildCreate,
  once: false,

  /**
   * guildCreate イベント発火時に参加後の共通処理を実行する
   * @param guild 参加したギルド
   * @returns 実行完了を示す Promise
   */
  async execute(guild) {
    await handleGuildCreate(guild);
  },
};
