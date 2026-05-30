// src/bot/events/messageReactionAdd.ts
// リアクション追加イベント - 非アクティブ自動キックのアクティビティ記録

import { Events } from "discord.js";
import { handleInactiveKickReactionActivity } from "../../features/inactive-kick/handlers/activityEventHandlers";
import type { BotEvent } from "../types/discord";

export const messageReactionAddEvent: BotEvent<
  typeof Events.MessageReactionAdd
> = {
  name: Events.MessageReactionAdd,
  // すべてのリアクション追加で評価
  once: false,

  /**
   * messageReactionAdd 発火時に非アクティブ自動キックのアクティビティを記録する
   * @param reaction 追加されたリアクション（Partial の可能性あり）
   * @param user リアクションしたユーザー（Partial の可能性あり）
   * @returns 実行完了を示す Promise
   */
  async execute(reaction, user) {
    await handleInactiveKickReactionActivity(reaction, user);
  },
};
