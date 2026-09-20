// src/bot/events/channelDelete.ts
// チャンネル削除同期イベント（VAC・VC自動募集・スティッキーメッセージ・チケット・リアクションロール）

import { Events } from "discord.js";
import { handleReactionRoleChannelDelete } from "../../features/reaction-role/handlers/reactionRoleChannelDeleteHandler";
import { handleStickyMessageChannelDelete } from "../../features/sticky-message/handlers/stickyMessageChannelDeleteHandler";
import { handleTicketChannelDelete } from "../../features/ticket/handlers/ticketChannelDeleteHandler";
import { handleVacChannelDelete } from "../../features/vac/handlers/vacChannelDelete";
import { handleVcAutoRecruitChannelDelete } from "../../features/vc-auto-recruit/handlers/vcAutoRecruitChannelDelete";
import type { BotEvent } from "../types/discord";

export const channelDeleteEvent: BotEvent<typeof Events.ChannelDelete> = {
  name: Events.ChannelDelete,
  // チャンネル削除のたびに同期処理を実行
  once: false,

  /**
   * channelDelete イベント発火時に VAC・VC自動募集・スティッキーメッセージ・チケット・リアクションロールの同期処理を実行する
   * @param channel 削除されたチャンネル
   * @returns 実行完了を示す Promise
   */
  async execute(channel) {
    // VAC関連の整合性調整は機能ハンドラへ委譲
    await handleVacChannelDelete(channel);
    // VC自動募集: 追跡中VCの削除→募集終了 / 投稿先削除→設定クリア
    await handleVcAutoRecruitChannelDelete(channel);
    // スティッキーメッセージのDBレコード・タイマーを破棄
    await handleStickyMessageChannelDelete(channel);
    // チケットパネル設置チャンネルの削除検知・設定クリーンアップ
    await handleTicketChannelDelete(channel);
    // リアクションロールパネル設置チャンネルの削除検知・設定クリーンアップ
    await handleReactionRoleChannelDelete(channel);
  },
};
