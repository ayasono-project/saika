// src/bot/commands/guild-settings.ts
// ギルド設定コマンド（サーバー管理権限専用）

import {
  ChannelType,
  ChatInputCommandInteraction,
  InteractionContextType,
  PermissionFlagsBits,
} from "discord.js";
import { executeGuildSettingsCommand } from "../../features/guild-settings/commands/guildSettingsCommand.execute";
import {
  getChoiceLocalizations,
  getCommandLocalizations,
} from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { createSlashCommand } from "../shared/createSlashCommand";
import type { Command } from "../types/discord";

// guild-settings コマンドのサブコマンド/オプション名を一元管理する定数
const GUILD_SETTINGS_COMMAND = {
  NAME: "guild-settings",
  SUBCOMMAND: {
    SET_LOCALE: "set-locale",
    SET_ERROR_CHANNEL: "set-error-channel",
    VIEW: "view",
    RESET: "reset",
    RESET_ALL: "reset-all",
    EXPORT: "export",
    IMPORT: "import",
  },
  OPTION: {
    LOCALE: "locale",
    CHANNEL: "channel",
    FILE: "file",
  },
} as const;

/**
 * ギルド設定コマンド（サーバー管理権限専用）
 */
export const guildSettingsCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.description",
    );
    const setLocaleDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.set-locale.description",
    );
    const localeOptDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.set-locale.locale.description",
    );
    const setErrorChannelDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.set-error-channel.description",
    );
    const channelOptDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.set-error-channel.channel.description",
    );
    const viewDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.view.description",
    );
    const resetDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.reset.description",
    );
    const resetAllDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.reset-all.description",
    );
    const exportDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.export.description",
    );
    const importDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.import.description",
    );
    const fileOptDesc = getCommandLocalizations(
      "guildSettings",
      "guild-settings.import.file.description",
    );

    // チョイス名のローカライゼーション
    const localeChoiceJa = getChoiceLocalizations(
      "guildSettings",
      "choice.locale.ja",
      "ja",
    );
    const localeChoiceEn = getChoiceLocalizations(
      "guildSettings",
      "choice.locale.en",
      "en",
    );

    return (
      createSlashCommand()
        .setName(GUILD_SETTINGS_COMMAND.NAME)
        .setDescription(cmdDesc.base)
        .setDescriptionLocalizations(cmdDesc.localizations)
        .setContexts(InteractionContextType.Guild)
        // Discord 側の表示/実行制御として ManageGuild を要求
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
          // 言語設定
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.SET_LOCALE)
            .setDescription(setLocaleDesc.base)
            .setDescriptionLocalizations(setLocaleDesc.localizations)
            .addStringOption((opt) =>
              opt
                .setName(GUILD_SETTINGS_COMMAND.OPTION.LOCALE)
                .setDescription(localeOptDesc.base)
                .setDescriptionLocalizations(localeOptDesc.localizations)
                .setRequired(true)
                .addChoices(localeChoiceJa, localeChoiceEn),
            ),
        )
        .addSubcommand((sub) =>
          // エラー通知チャンネル設定
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.SET_ERROR_CHANNEL)
            .setDescription(setErrorChannelDesc.base)
            .setDescriptionLocalizations(setErrorChannelDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(GUILD_SETTINGS_COMMAND.OPTION.CHANNEL)
                .setDescription(channelOptDesc.base)
                .setDescriptionLocalizations(channelOptDesc.localizations)
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          // 設定表示
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.base)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
        .addSubcommand((sub) =>
          // ギルド設定リセット
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.RESET)
            .setDescription(resetDesc.base)
            .setDescriptionLocalizations(resetDesc.localizations),
        )
        .addSubcommand((sub) =>
          // 全設定リセット
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.RESET_ALL)
            .setDescription(resetAllDesc.base)
            .setDescriptionLocalizations(resetAllDesc.localizations),
        )
        .addSubcommand((sub) =>
          // エクスポート
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.EXPORT)
            .setDescription(exportDesc.base)
            .setDescriptionLocalizations(exportDesc.localizations),
        )
        .addSubcommand((sub) =>
          // インポート
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.IMPORT)
            .setDescription(importDesc.base)
            .setDescriptionLocalizations(importDesc.localizations)
            .addAttachmentOption((opt) =>
              opt
                .setName(GUILD_SETTINGS_COMMAND.OPTION.FILE)
                .setDescription(fileOptDesc.base)
                .setDescriptionLocalizations(fileOptDesc.localizations)
                .setRequired(true),
            ),
        )
    );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeGuildSettingsCommand(interaction);
    } catch (error) {
      // 統一エラーハンドリング
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default guildSettingsCommand;
