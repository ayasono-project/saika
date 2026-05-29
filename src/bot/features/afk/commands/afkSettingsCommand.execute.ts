// src/bot/features/afk/commands/afkSettingsCommand.execute.ts
// afk-settings コマンド実行処理

import { ValidationError } from "@ayasono/shared/core";
import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { createDefaultAfkSettings } from "../../../../shared/features/afk/afkSettingsDefaults";
import {
  getAfkSettings,
  saveAfkSettings,
  setAfkChannel,
} from "../../../../shared/features/afk/afkSettingsService";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import {
  createInfoEmbed,
  createSuccessEmbed,
} from "../../../utils/messageResponse";

const AFK_SETTINGS_SUBCOMMAND = {
  SET_CHANNEL: "set-channel",
  CLEAR_CHANNEL: "clear-channel",
  VIEW: "view",
} as const;

/**
 * afk-settings コマンド実行入口
 */
export async function executeAfkSettingsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  // ManageGuild 権限を検証する
  ensureManageGuildPermission(interaction);

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case AFK_SETTINGS_SUBCOMMAND.SET_CHANNEL:
      await handleSetChannel(interaction, guildId);
      break;
    case AFK_SETTINGS_SUBCOMMAND.CLEAR_CHANNEL:
      await handleClearChannel(interaction, guildId);
      break;
    case AFK_SETTINGS_SUBCOMMAND.VIEW:
      await handleViewSetting(interaction, guildId);
      break;
    default:
      throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
  }
}

/**
 * afk-settings set-channel の設定更新を行う
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
async function handleSetChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 入力チャンネルを取得し、AFK用途で許可する型か検証する
  const channel = interaction.options.getChannel("channel", true);

  if (channel.type !== ChannelType.GuildVoice) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "afk:user-response.invalid_channel_type",
      ),
    );
  }

  await setAfkChannel(guildId, channel.id);

  const description = tInteraction(
    interaction.locale,
    "afk:user-response.set_channel_success",
    {
      channel: `<#${channel.id}>`,
    },
  );

  const successTitle = tInteraction(
    interaction.locale,
    "common:embed.title.success",
  );
  const embed = createSuccessEmbed(description, { title: successTitle });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });

  logger.info(
    logPrefixed("system:log_prefix.afk", "afk:log.configured", {
      guildId,
      channelId: channel.id,
    }),
  );
}

/**
 * afk-settings clear-channel のチャンネル設定解除を行う
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
async function handleClearChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  await saveAfkSettings(guildId, createDefaultAfkSettings());

  const description = tInteraction(
    interaction.locale,
    "afk:user-response.clear_channel_success",
  );
  const successTitle = tInteraction(
    interaction.locale,
    "common:embed.title.success",
  );
  const embed = createSuccessEmbed(description, { title: successTitle });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });

  logger.info(
    logPrefixed("system:log_prefix.afk", "afk:log.channel_cleared", {
      guildId,
    }),
  );
}

/**
 * afk-settings view の現在設定表示を返す
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
async function handleViewSetting(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const config = await getAfkSettings(guildId);
  const locale = interaction.locale;

  const title = tInteraction(locale, "afk:embed.title.config_view");
  const isConfigured = config?.enabled && config?.channelId;

  const statusValue = tInteraction(
    locale,
    isConfigured ? "common:enabled" : "common:disabled",
  );
  const channelValue = config?.channelId
    ? `<#${config.channelId}>`
    : tInteraction(locale, "common:embed.field.value.not_configured");

  const embed = createInfoEmbed("", {
    title,
    fields: [
      {
        name: tInteraction(locale, "common:embed.field.name.status"),
        value: statusValue,
        inline: true,
      },
      {
        name: tInteraction(locale, "afk:embed.field.name.channel"),
        value: channelValue,
        inline: true,
      },
    ],
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
