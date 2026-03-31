// src/bot/features/guild-config/commands/guildConfigCommand.setErrorChannel.ts
// guild-config set-error-channel サブコマンド実行処理

import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotGuildConfigService } from "../../../services/botCompositionRoot";
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
        "guildConfig:user-response.invalid_channel_type",
      ),
    );
  }

  // DB更新
  await getBotGuildConfigService().updateErrorChannel(guildId, channel.id);

  const description = tInteraction(
    interaction.locale,
    "guildConfig:user-response.set_error_channel_success",
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
      "guildConfig:log.error_channel_set",
      { guildId, channelId: channel.id },
    ),
  );
}
