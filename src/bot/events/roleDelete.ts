// src/bot/events/roleDelete.ts
// ロール削除イベント（Bumpリマインダー mentionRoleId クリア）

import { Events } from "discord.js";
import { handleBumpReminderRoleDelete } from "../features/bump-reminder/handlers/bumpReminderRoleDeleteHandler";
import type { BotEvent } from "../types/discord";

export const roleDeleteEvent: BotEvent<typeof Events.GuildRoleDelete> = {
  name: Events.GuildRoleDelete,
  once: false,

  /**
   * roleDelete イベント発火時に Bumpリマインダーの mentionRoleId をクリアする
   * @param role 削除されたロール
   */
  async execute(role) {
    await handleBumpReminderRoleDelete(role);
  },
};
