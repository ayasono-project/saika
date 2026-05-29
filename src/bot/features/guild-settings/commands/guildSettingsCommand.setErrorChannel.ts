// src/bot/features/guild-settings/commands/guildSettingsCommand.setErrorChannel.ts
// guild-settings set-error-channel サブコマンド実行処理

import { ValidationError } from "@ayasono/shared/core";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotGuildSettingsService } from "../../../services/botCompositionRoot";
import { createSuccessEmbed } from "../../../utils/messageResponse";

/**
 * エラー通知チャンネルを設定する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定対象のギルドID
 */
export async function handleSetErrorChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const channel = interaction.options.getChannel("channel", true);

  // テキストチャンネルのみ許可
  if (channel.type !== ChannelType.GuildText) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "guildSettings:user-response.invalid_channel_type",
      ),
    );
  }

  // DB更新
  await getBotGuildSettingsService().updateErrorChannel(guildId, channel.id);

  const description = tInteraction(
    interaction.locale,
    "guildSettings:user-response.set_error_channel_success",
    { channel: `<#${channel.id}>` },
  );
  const embed = createSuccessEmbed(description);

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });

  logger.info(
    logPrefixed(
      "system:log_prefix.guild_config",
      "guildSettings:log.error_channel_set",
      { guildId, channelId: channel.id },
    ),
  );
}
