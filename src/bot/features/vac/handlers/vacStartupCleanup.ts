// src/bot/features/vac/handlers/vacStartupCleanup.ts
// VAC の起動時クリーンアップハンドラー

import type { BotClient } from "../../../client";
import { getBotVacService } from "../../../services/botCompositionRoot";

/**
 * Bot 起動時に VAC 設定と実チャンネル状態の不整合を解消する関数
 */
export async function cleanupVacOnStartup(client: BotClient): Promise<void> {
  // 起動シーケンスから呼ばれる入口で、実際の整合性解消ロジックはサービス層へ委譲
  await getBotVacService().cleanupOnStartup(client);
}
