// src/bot/events/guildMemberAdd.ts
// メンバー参加イベント（メンバーログ）

import { Events } from "discord.js";
import { handleGuildMemberAdd } from "../features/member-log/handlers/guildMemberAddHandler";
import type { BotEvent } from "../types/discord";

export const guildMemberAddEvent: BotEvent<typeof Events.GuildMemberAdd> = {
  name: Events.GuildMemberAdd,
  // メンバー参加のたびに通知処理を実行
  once: false,

  /**
   * guildMemberAdd イベント発火時にメンバーログ通知を送信する
   * @param member 参加したギルドメンバー
   * @returns 実行完了を示す Promise
   */
  async execute(member) {
    // 参加通知はメンバーログ機能ハンドラへ委譲
    await handleGuildMemberAdd(member);
  },
};
