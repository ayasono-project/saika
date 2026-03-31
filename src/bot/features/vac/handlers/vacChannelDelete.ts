// src/bot/features/vac/handlers/vacChannelDelete.ts
// VAC の channelDelete ハンドラー

import type { Channel } from "discord.js";
import { getBotVacService } from "../../../services/botCompositionRoot";

/**
 * channelDelete 時に VAC 設定と管理対象チャンネル情報を同期する関数
 */
export async function handleVacChannelDelete(channel: Channel): Promise<void> {
  // channelDelete 固有の同期ロジックはサービス層で一元管理
  await getBotVacService().handleChannelDelete(channel);
}
