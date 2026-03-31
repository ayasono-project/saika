// src/bot/events/voiceStateUpdate.ts
// VAC用 voiceStateUpdate イベント

import { Events, type VoiceState } from "discord.js";
import { handleVacVoiceStateUpdate } from "../features/vac/handlers/vacVoiceStateUpdate";
import type { BotEvent } from "../types/discord";

export const voiceStateUpdateEvent: BotEvent<typeof Events.VoiceStateUpdate> = {
  name: Events.VoiceStateUpdate,
  // ボイス状態変化ごとに監視
  once: false,

  /**
   * voiceStateUpdate イベント発火時に VAC の同期処理を実行する
   * @param oldState 変更前のボイス状態
   * @param newState 変更後のボイス状態
   * @returns 実行完了を示す Promise
   */
  async execute(oldState: VoiceState, newState: VoiceState) {
    // VAC同期ロジックは専用ハンドラへ委譲
    await handleVacVoiceStateUpdate(oldState, newState);
    // VC募集で作成したVCは明示的削除（ボタン）のみ。自動削除は行わない
  },
};
