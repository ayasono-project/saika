// src/bot/events/guildDelete.ts
// ギルド退出イベント（全設定クリーンアップ）

import { Events } from "discord.js";
import { handleGuildDelete } from "../handlers/guildDeleteHandler";
import type { BotEvent } from "../types/discord";

export const guildDeleteEvent: BotEvent<typeof Events.GuildDelete> = {
  name: Events.GuildDelete,
  once: false,

  /**
   * guildDelete イベント発火時にギルドの全設定データを削除する
   * @param guild 退出したギルド
   * @returns 実行完了を示す Promise
   */
  async execute(guild) {
    await handleGuildDelete(guild);
  },
};
