// src/bot/features/afk/commands/afkCommand.execute.ts
// afk コマンド実行処理

import { ChannelType, type ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { getAfkConfig } from "../../../../shared/features/afk/afkConfigService";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { createSuccessEmbed } from "../../../utils/messageResponse";

const AFK_I18N_KEYS = {
  ERROR_GUILD_ONLY: COMMON_I18N_KEYS.GUILD_ONLY,
  ERROR_NOT_CONFIGURED: "afk:user-response.not_configured",
  ERROR_MEMBER_NOT_FOUND: "afk:user-response.member_not_found",
  ERROR_USER_NOT_IN_VOICE: "afk:user-response.user_not_in_voice",
  ERROR_CHANNEL_NOT_FOUND: "afk:user-response.channel_not_found",
  EMBED_MOVED: "afk:user-response.moved",
  LOG_MOVED: "afk:log.moved",
} as const;

/**
 * afk コマンド実行入口
 */
export async function executeAfkCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    throw ValidationError.fromKey(AFK_I18N_KEYS.ERROR_GUILD_ONLY);
  }

  const config = await getAfkConfig(guildId);

  if (!config || !config.enabled || !config.channelId) {
    throw new ValidationError(
      tInteraction(interaction.locale, AFK_I18N_KEYS.ERROR_NOT_CONFIGURED),
    );
  }

  const targetUser = interaction.options.getUser("user") ?? interaction.user;

  const member = await interaction.guild?.members
    .fetch(targetUser.id)
    .catch(() => null);

  if (!member) {
    throw new ValidationError(
      tInteraction(interaction.locale, AFK_I18N_KEYS.ERROR_MEMBER_NOT_FOUND),
    );
  }

  if (!member.voice.channel) {
    throw new ValidationError(
      tInteraction(interaction.locale, AFK_I18N_KEYS.ERROR_USER_NOT_IN_VOICE),
    );
  }

  const afkChannel = await interaction.guild?.channels
    .fetch(config.channelId)
    .catch(() => null);

  if (!afkChannel || afkChannel.type !== ChannelType.GuildVoice) {
    throw new ValidationError(
      tInteraction(interaction.locale, AFK_I18N_KEYS.ERROR_CHANNEL_NOT_FOUND),
    );
  }

  await member.voice.setChannel(afkChannel);

  const description = tInteraction(
    interaction.locale,
    AFK_I18N_KEYS.EMBED_MOVED,
    {
      user: `<@${targetUser.id}>`,
      channel: `<#${config.channelId}>`,
    },
  );

  const embed = createSuccessEmbed(description);

  await interaction.reply({
    embeds: [embed],
  });

  logger.info(
    logPrefixed("system:log_prefix.afk", AFK_I18N_KEYS.LOG_MOVED, {
      guildId,
      userId: targetUser.id,
      channelId: config.channelId,
    }),
  );
}
