// src/bot/events/messageDelete.ts
// メッセージ削除イベント（VC募集パネル自己修復）

import { Events } from "discord.js";
import { handleReactionRoleMessageDelete } from "../features/reaction-role/handlers/reactionRoleMessageDeleteHandler";
import { handleTicketMessageDelete } from "../features/ticket/handlers/ticketMessageDeleteHandler";
import { handleVcRecruitMessageDelete } from "../features/vc-recruit/handlers/vcRecruitMessageDeleteHandler";
import type { BotEvent } from "../types/discord";

export const messageDeleteEvent: BotEvent<typeof Events.MessageDelete> = {
  name: Events.MessageDelete,
  once: false,

  /**
   * messageDelete イベント発火時にVC募集パネル・チケットパネル・リアクションロールパネルの同期処理を実行する
   * @param message 削除されたメッセージ
   * @returns 実行完了を示す Promise
   */
  async execute(message) {
    // VC募集パネルメッセージの再送信・DB更新
    await handleVcRecruitMessageDelete(message);
    // チケットパネルメッセージの削除検知・設定クリーンアップ
    await handleTicketMessageDelete(message);
    // リアクションロールパネルメッセージの削除検知・設定クリーンアップ
    await handleReactionRoleMessageDelete(message);
  },
};
