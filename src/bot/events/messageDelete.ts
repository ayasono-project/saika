// メッセージ削除イベント（チケット・リアクションロールパネルの同期）

import { Events } from "discord.js";
import { handleReactionRoleMessageDelete } from "../../features/reaction-role/handlers/reactionRoleMessageDeleteHandler";
import { handleTicketMessageDelete } from "../../features/ticket/handlers/ticketMessageDeleteHandler";
import type { BotEvent } from "../types/discord";

export const messageDeleteEvent: BotEvent<typeof Events.MessageDelete> = {
  name: Events.MessageDelete,
  once: false,

  /**
   * messageDelete イベント発火時にチケットパネル・リアクションロールパネルの同期処理を実行する
   * @param message 削除されたメッセージ
   * @returns 実行完了を示す Promise
   */
  async execute(message) {
    // チケットパネルメッセージの削除検知・設定クリーンアップ
    await handleTicketMessageDelete(message);
    // リアクションロールパネルメッセージの削除検知・設定クリーンアップ
    await handleReactionRoleMessageDelete(message);
  },
};
