// src/bot/features/vac/services/usecases/handleVacDelete.ts
// VAC自動削除ユースケース

import { ChannelType, type VoiceState } from "discord.js";
import type { VacConfigService } from "../../../../../shared/features/vac/vacConfigService";
import { logPrefixed } from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";

/**
 * 管理対象VACが空室になったときにチャンネルと管理情報を削除する
 * @param vacRepository VAC設定リポジトリ
 * @param oldState 変更前ボイス状態
 * @returns 実行完了
 */
export async function handleVacDeleteUseCase(
  vacRepository: VacConfigService,
  oldState: VoiceState,
): Promise<void> {
  const oldChannel = oldState.channel;
  if (!oldChannel || oldChannel.type !== ChannelType.GuildVoice) {
    return;
  }

  const config = await vacRepository.getVacConfigOrDefault(oldChannel.guild.id);
  const isManaged = config.createdChannels.some(
    (channel) => channel.voiceChannelId === oldChannel.id,
  );

  if (!isManaged || oldChannel.members.size > 0) {
    return;
  }

  await oldChannel.delete().catch(() => null);
  await vacRepository.removeCreatedVacChannel(
    oldChannel.guild.id,
    oldChannel.id,
  );

  logger.info(
    logPrefixed("system:log_prefix.vac", "vac:log.channel_deleted", {
      guildId: oldChannel.guild.id,
      channelId: oldChannel.id,
    }),
  );
}
