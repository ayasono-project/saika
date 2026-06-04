// src/features/vc-auto-recruit/handlers/vcAutoRecruitVoiceStateUpdate.ts
// VC自動募集用 voiceStateUpdate のハンドラー

import type { VoiceState } from "discord.js";
import { getBotVcAutoRecruitService } from "../../../bot/services/botCompositionRoot";

/**
 * voiceStateUpdate を受け、募集投稿（参加）と募集終了（空室）を実行する関数
 * @param oldState 変更前のボイス状態
 * @param newState 変更後のボイス状態
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  // ユースケース本体はサービス層に集約（ここはイベント境界の薄いラッパー）
  await getBotVcAutoRecruitService().handleVoiceStateUpdate(oldState, newState);
}
