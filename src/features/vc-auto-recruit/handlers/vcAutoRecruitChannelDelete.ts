// src/features/vc-auto-recruit/handlers/vcAutoRecruitChannelDelete.ts
// VC自動募集用 channelDelete のハンドラー

import type { Channel } from "discord.js";
import { getBotVcAutoRecruitService } from "../../../bot/services/botCompositionRoot";

/**
 * channelDelete 時に追跡中の募集・投稿先設定を同期する関数
 * @param channel 削除されたチャンネル
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitChannelDelete(
  channel: Channel,
): Promise<void> {
  // channelDelete 固有の同期ロジックはサービス層で一元管理
  await getBotVcAutoRecruitService().handleChannelDelete(channel);
}
