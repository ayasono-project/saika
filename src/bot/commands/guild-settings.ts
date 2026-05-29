// src/bot/commands/guild-settings.ts
// ギルド設定コマンド（サーバー管理権限専用）

import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { executeGuildSettingsCommand } from "../../features/guild-settings/commands/guildSettingsCommand.execute";
import {
  getChoiceLocalizations,
  getCommandLocalizations,
} from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
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
      new SlashCommandBuilder()
        .setName(GUILD_SETTINGS_COMMAND.NAME)
        .setDescription(cmdDesc.ja)
        .setDescriptionLocalizations(cmdDesc.localizations)
        // Discord 側の表示/実行制御として ManageGuild を要求
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((sub) =>
          // 言語設定
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.SET_LOCALE)
            .setDescription(setLocaleDesc.ja)
            .setDescriptionLocalizations(setLocaleDesc.localizations)
            .addStringOption((opt) =>
              opt
                .setName(GUILD_SETTINGS_COMMAND.OPTION.LOCALE)
                .setDescription(localeOptDesc.ja)
                .setDescriptionLocalizations(localeOptDesc.localizations)
                .setRequired(true)
                .addChoices(localeChoiceJa, localeChoiceEn),
            ),
        )
        .addSubcommand((sub) =>
          // エラー通知チャンネル設定
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.SET_ERROR_CHANNEL)
            .setDescription(setErrorChannelDesc.ja)
            .setDescriptionLocalizations(setErrorChannelDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(GUILD_SETTINGS_COMMAND.OPTION.CHANNEL)
                .setDescription(channelOptDesc.ja)
                .setDescriptionLocalizations(channelOptDesc.localizations)
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
        )
        .addSubcommand((sub) =>
          // 設定表示
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.ja)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
        .addSubcommand((sub) =>
          // ギルド設定リセット
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.RESET)
            .setDescription(resetDesc.ja)
            .setDescriptionLocalizations(resetDesc.localizations),
        )
        .addSubcommand((sub) =>
          // 全設定リセット
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.RESET_ALL)
            .setDescription(resetAllDesc.ja)
            .setDescriptionLocalizations(resetAllDesc.localizations),
        )
        .addSubcommand((sub) =>
          // エクスポート
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.EXPORT)
            .setDescription(exportDesc.ja)
            .setDescriptionLocalizations(exportDesc.localizations),
        )
        .addSubcommand((sub) =>
          // インポート
          sub
            .setName(GUILD_SETTINGS_COMMAND.SUBCOMMAND.IMPORT)
            .setDescription(importDesc.ja)
            .setDescriptionLocalizations(importDesc.localizations)
            .addAttachmentOption((opt) =>
              opt
                .setName(GUILD_SETTINGS_COMMAND.OPTION.FILE)
                .setDescription(fileOptDesc.ja)
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
