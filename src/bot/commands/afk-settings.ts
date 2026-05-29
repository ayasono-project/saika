// src/bot/commands/afk-settings.ts
// AFK機能の設定コマンド（サーバー管理権限専用）

import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { executeAfkSettingsCommand } from "../../features/afk/commands/afkSettingsCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import type { Command } from "../types/discord";

// AFK 設定コマンドのサブコマンド/オプション名を一元管理する定数
const AFK_SETTINGS_COMMAND = {
  NAME: "afk-settings",
  SUBCOMMAND: {
    SET_CHANNEL: "set-channel",
    CLEAR_CHANNEL: "clear-channel",
    VIEW: "view",
  },
  OPTION: {
    CHANNEL: "channel",
  },
} as const;

/**
 * AFK設定コマンド（サーバー管理権限専用）
 */
export const afkSettingsCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations("afk", "afk-settings.description");
    const setChannelDesc = getCommandLocalizations(
      "afk",
      "afk-settings.set-channel.description",
    );
    const channelDesc = getCommandLocalizations(
      "afk",
      "afk-settings.set-channel.channel.description",
    );
    const clearChannelDesc = getCommandLocalizations(
      "afk",
      "afk-settings.clear-channel.description",
    );
    const viewDesc = getCommandLocalizations(
      "afk",
      "afk-settings.view.description",
    );

    return (
      new SlashCommandBuilder()
        .setName(AFK_SETTINGS_COMMAND.NAME)
        .setDescription(cmdDesc.ja)
        .setDescriptionLocalizations(cmdDesc.localizations)
        // Discord 側の表示/実行制御として ManageGuild を要求
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((subcommand) =>
          // AFK チャンネル設定
          subcommand
            .setName(AFK_SETTINGS_COMMAND.SUBCOMMAND.SET_CHANNEL)
            .setDescription(setChannelDesc.ja)
            .setDescriptionLocalizations(setChannelDesc.localizations)
            .addChannelOption((option) =>
              option
                .setName(AFK_SETTINGS_COMMAND.OPTION.CHANNEL)
                .setDescription(channelDesc.ja)
                .setDescriptionLocalizations(channelDesc.localizations)
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          // AFK チャンネル設定解除
          subcommand
            .setName(AFK_SETTINGS_COMMAND.SUBCOMMAND.CLEAR_CHANNEL)
            .setDescription(clearChannelDesc.ja)
            .setDescriptionLocalizations(clearChannelDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 現在設定の表示
          subcommand
            .setName(AFK_SETTINGS_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.ja)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
    );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeAfkSettingsCommand(interaction);
    } catch (error) {
      // 統一エラーハンドリング
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default afkSettingsCommand;
