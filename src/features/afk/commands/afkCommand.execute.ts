// src/features/afk/commands/afkCommand.execute.ts
// afk コマンド実行処理（個別移動 + VC全員の一括移動）

import { ValidationError } from "@ayasono/shared/core";
import { ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import {
  formatActionLog,
  resolveAuditReason,
} from "../../../bot/shared/vcActionLog";
import {
  fetchMemberInVoice,
  fetchNonEmptyVoiceChannel,
  resolveVcActionTarget,
} from "../../../bot/shared/vcActionTarget";
import { presentBulkConfirm } from "../../../bot/shared/vcBulkAction";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { getAfkSettings } from "../afkSettingsService";

// afk コマンドのオプション名
const AFK_OPTION = {
  TARGET_MEMBER: "target-member",
  TARGET_CHANNEL: "target-channel",
} as const;

const AFK_I18N_KEYS = {
  ERROR_GUILD_ONLY: COMMON_I18N_KEYS.GUILD_ONLY,
  ERROR_NOT_CONFIGURED: "afk:user-response.not_configured",
  ERROR_CHANNEL_NOT_FOUND: "afk:user-response.channel_not_found",
  ERROR_TARGET_IS_AFK: "afk:user-response.target_is_afk",
  LOG_MOVED: "afk:log.moved",
} as const;

/**
 * afk コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeAfkCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    throw ValidationError.fromKey(AFK_I18N_KEYS.ERROR_GUILD_ONLY);
  }

  const config = await getAfkSettings(guildId);
  if (!config || !config.enabled || !config.channelId) {
    throw new ValidationError(
      tInteraction(interaction.locale, AFK_I18N_KEYS.ERROR_NOT_CONFIGURED),
    );
  }

  // AFKチャンネルが存在しボイスチャンネルであることを確認する
  const afkChannel = await interaction.guild?.channels
    .fetch(config.channelId)
    .catch(() => null);
  if (!afkChannel || afkChannel.type !== ChannelType.GuildVoice) {
    throw new ValidationError(
      tInteraction(interaction.locale, AFK_I18N_KEYS.ERROR_CHANNEL_NOT_FOUND),
    );
  }

  const target = resolveVcActionTarget(
    interaction,
    AFK_OPTION.TARGET_MEMBER,
    AFK_OPTION.TARGET_CHANNEL,
  );

  // target=channel: 確認ダイアログ経由で対象VC全員をAFKチャンネルへ一括移動
  if (target.kind === "channel") {
    // 対象VCがAFKチャンネル自身なら no-op エラー
    if (target.channelId === afkChannel.id) {
      throw new ValidationError(
        tInteraction(interaction.locale, AFK_I18N_KEYS.ERROR_TARGET_IS_AFK),
      );
    }
    const channel = await fetchNonEmptyVoiceChannel(
      interaction,
      target.channelId,
    );
    await presentBulkConfirm(
      interaction,
      {
        action: "afk",
        guildId,
        invokerId: interaction.user.id,
        locale: interaction.locale,
        sourceChannelId: channel.id,
        destinationChannelId: afkChannel.id,
      },
      [...channel.members.keys()],
    );
    return;
  }

  // target=member または省略（自分）: 個別移動
  const targetUserId =
    target.kind === "member" ? target.userId : interaction.user.id;
  const member = await fetchMemberInVoice(interaction, targetUserId);

  await member.voice.setChannel(
    afkChannel,
    resolveAuditReason("afk", interaction.locale),
  );

  const embed = formatActionLog({
    action: "afk",
    locale: interaction.locale,
    invokerId: interaction.user.id,
    targetUserId,
    destinationChannelId: afkChannel.id,
  });
  await interaction.reply({ embeds: [embed] });

  logger.info(
    logPrefixed("system:log_prefix.afk", AFK_I18N_KEYS.LOG_MOVED, {
      guildId,
      userId: targetUserId,
      channelId: afkChannel.id,
    }),
  );
}
