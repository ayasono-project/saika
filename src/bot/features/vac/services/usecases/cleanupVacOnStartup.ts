// src/bot/features/vac/services/usecases/cleanupVacOnStartup.ts
// VAC起動時クリーンアップユースケース

import { ChannelType } from "discord.js";
import type { VacConfigService } from "../../../../../shared/features/vac/vacConfigService";
import { logPrefixed } from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { BotClient } from "../../../../client";

/**
 * 起動時に不整合なトリガー/作成済みVACチャンネル情報を掃除する
 * @param vacRepository VAC設定リポジトリ
 * @param client Botクライアント
 * @returns 実行完了
 */
export async function cleanupVacOnStartupUseCase(
  vacRepository: VacConfigService,
  client: BotClient,
): Promise<void> {
  let removedTriggers = 0;
  let removedChannels = 0;

  for (const [, guild] of client.guilds.cache) {
    const vacConfig = await vacRepository.getVacConfigOrDefault(guild.id);

    for (const triggerChannelId of vacConfig.triggerChannelIds) {
      const triggerChannel = await guild.channels
        .fetch(triggerChannelId)
        .catch(() => null);

      if (!triggerChannel || triggerChannel.type !== ChannelType.GuildVoice) {
        await vacRepository.removeTriggerChannel(guild.id, triggerChannelId);
        logger.info(
          logPrefixed(
            "system:log_prefix.vac",
            "vac:log.startup_cleanup_stale_trigger_removed",
            {
              guildId: guild.id,
              channelId: triggerChannelId,
            },
          ),
        );
        removedTriggers++;
      }
    }

    for (const channelInfo of vacConfig.createdChannels) {
      const channel = await guild.channels
        .fetch(channelInfo.voiceChannelId)
        .catch(() => null);

      if (!channel) {
        await vacRepository.removeCreatedVacChannel(
          guild.id,
          channelInfo.voiceChannelId,
        );
        logger.info(
          logPrefixed(
            "system:log_prefix.vac",
            "vac:log.startup_cleanup_orphaned_channel_removed",
            {
              guildId: guild.id,
              channelId: channelInfo.voiceChannelId,
            },
          ),
        );
        removedChannels++;
        continue;
      }

      if (channel.isDMBased() || channel.type !== ChannelType.GuildVoice) {
        await vacRepository.removeCreatedVacChannel(
          guild.id,
          channelInfo.voiceChannelId,
        );
        logger.info(
          logPrefixed(
            "system:log_prefix.vac",
            "vac:log.startup_cleanup_orphaned_channel_removed",
            {
              guildId: guild.id,
              channelId: channelInfo.voiceChannelId,
            },
          ),
        );
        removedChannels++;
        continue;
      }

      if (channel.members.size === 0) {
        await channel.delete().catch(() => null);
        await vacRepository.removeCreatedVacChannel(
          guild.id,
          channelInfo.voiceChannelId,
        );
        logger.info(
          logPrefixed(
            "system:log_prefix.vac",
            "vac:log.startup_cleanup_empty_channel_deleted",
            {
              guildId: guild.id,
              channelId: channelInfo.voiceChannelId,
            },
          ),
        );
        removedChannels++;
      }
    }
  }

  const hasChanges = removedTriggers > 0 || removedChannels > 0;
  logger.info(
    logPrefixed(
      "system:log_prefix.vac",
      hasChanges
        ? "vac:log.startup_cleanup_done"
        : "vac:log.startup_cleanup_done_none",
      { removedTriggers, removedChannels },
    ),
  );
}
