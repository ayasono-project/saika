// src/bot/events/voiceStateUpdate.ts
// VAC用 voiceStateUpdate イベント

import { Events, type VoiceState } from "discord.js";
import { handleInactiveKickVoiceActivity } from "../../features/inactive-kick/handlers/activityEventHandlers";
import { handleVacVoiceStateUpdate } from "../../features/vac/handlers/vacVoiceStateUpdate";
import { handleVcAutoRecruitVoiceStateUpdate } from "../../features/vc-auto-recruit/handlers/vcAutoRecruitVoiceStateUpdate";
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
    // VC自動募集を VAC より先に評価する。VAC の setChannel はライブ参照の
    // newState.channelId を破壊的に書き換えるため、VAC を先に await すると
    // CreateVC 参加時にトリガー参加イベントの newState が生成 VC を指してしまい、
    // トリガー除外をすり抜けて移動イベントと合わせ二重投稿になる。
    await handleVcAutoRecruitVoiceStateUpdate(oldState, newState);
    // VAC同期ロジック（トリガー参加→VC生成→移動 / 空室削除）を専用ハンドラへ委譲
    await handleVacVoiceStateUpdate(oldState, newState);
    // 非アクティブ自動キックのアクティビティ記録（VC 参加を活動とみなす）
    await handleInactiveKickVoiceActivity(oldState, newState);
    // VC募集で作成したVCは明示的削除（ボタン）のみ。自動削除は行わない
  },
};
