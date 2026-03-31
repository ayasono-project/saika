// src/bot/features/vac/handlers/vacVoiceStateUpdate.ts
// VAC 用 voiceStateUpdate のハンドラー

import type { VoiceState } from "discord.js";
import { getBotVacService } from "../../../services/botCompositionRoot";

/**
 * voiceStateUpdate を受け、VAC 作成/削除ユースケースを実行する関数
 */
export async function handleVacVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  // ユースケース本体はサービス層に集約（ここはイベント境界の薄いラッパー）
  await getBotVacService().handleVoiceStateUpdate(oldState, newState);
}
