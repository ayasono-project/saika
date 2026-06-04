// src/features/vc-auto-recruit/handlers/vcAutoRecruitStartupCleanup.ts
// VC自動募集用の起動時クリーンアップハンドラー

import type { BotClient } from "../../../bot/client";
import { getBotVcAutoRecruitService } from "../../../bot/services/botCompositionRoot";

/**
 * Bot 起動時に、空・不在の VC の募集を募集終了へ差し替えて追跡から除去する関数
 * @param client Bot クライアント
 * @returns 実行完了を示す Promise
 */
export async function cleanupVcAutoRecruitOnStartup(
  client: BotClient,
): Promise<void> {
  // 起動シーケンスから呼ばれる入口で、整合性解消ロジックはサービス層へ委譲
  await getBotVcAutoRecruitService().cleanupOnStartup(client);
}
