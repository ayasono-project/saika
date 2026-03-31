// src/bot/features/vc-recruit/handlers/vcRecruitVoiceStateUpdate.ts
// VC募集で作成したVCの空検知・自動削除ハンドラー

import { ChannelType, type VoiceState } from "discord.js";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotVcRecruitRepository } from "../../../services/botCompositionRoot";
import { notifyErrorChannel } from "../../../shared/errorChannelNotifier";

const VC_RECRUIT_LOG_KEYS = {
  EMPTY_VC_DELETED: "vcRecruit:log.empty_vc_deleted",
  VOICE_STATE_UPDATE_ERROR: "vcRecruit:log.voice_state_update_error",
} as const;

/**
 * voiceStateUpdate から VC募集で作成したVCの空き検知と自動削除を行う
 * @param oldState 変更前のボイス状態
 * @param newState 変更後のボイス状態
 */
export async function handleVcRecruitVoiceStateUpdate(
  oldState: VoiceState,
  newState: VoiceState,
): Promise<void> {
  // チャンネルを離脱したときのみ対象（入室/移動は対象外）
  const channel = oldState.channel;
  if (!channel || channel.type !== ChannelType.GuildVoice) return;

  // 同一チャンネルへの移動（リージョン変更など）は無視
  if (oldState.channelId === newState.channelId) return;

  const guildId = channel.guild.id;

  try {
    const repo = getBotVcRecruitRepository();

    // VC募集で作成したVCか確認
    const setup = await repo.findSetupByCreatedVcId(guildId, channel.id);
    if (!setup) return;

    // まだメンバーが残っているなら削除しない
    if (channel.members.size > 0) return;

    // 空になったので削除
    await channel.delete().catch(() => null);

    // DB から追跡リストを更新
    await repo.removeCreatedVoiceChannelId(guildId, channel.id);

    logger.info(
      logPrefixed(
        "system:log_prefix.vc_recruit",
        VC_RECRUIT_LOG_KEYS.EMPTY_VC_DELETED,
        {
          guildId,
          channelId: channel.id,
          channelName: channel.name,
        },
      ),
    );
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.vc_recruit",
        VC_RECRUIT_LOG_KEYS.VOICE_STATE_UPDATE_ERROR,
      ),
      error,
    );
    await notifyErrorChannel(channel.guild, error, {
      feature: "VC募集",
      action: "VC状態変更の処理失敗",
    });
  }
}
