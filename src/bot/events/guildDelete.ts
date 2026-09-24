// ギルド退出イベント（ジョブ停止＋データ削除予約）

import { Events } from "discord.js";
import { handleGuildDelete } from "../handlers/guildDeleteHandler";
import type { BotEvent } from "../types/discord";

export const guildDeleteEvent: BotEvent<typeof Events.GuildDelete> = {
  name: Events.GuildDelete,
  once: false,

  /**
   * guildDelete イベント発火時にジョブを停止し、データ削除を予約する
   * @param guild 退出したギルド
   * @returns 実行完了を示す Promise
   */
  async execute(guild) {
    await handleGuildDelete(guild);
  },
};
