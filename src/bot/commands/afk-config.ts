// src/bot/commands/afk-config.ts
// AFK機能の設定コマンド（サーバー管理権限専用）

import {
  ChannelType,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { executeAfkConfigCommand } from "../features/afk/commands/afkConfigCommand.execute";
import type { Command } from "../types/discord";

// AFK 設定コマンドのサブコマンド/オプション名を一元管理する定数
const AFK_CONFIG_COMMAND = {
  NAME: "afk-config",
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
export const afkConfigCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations("afk", "afk-config.description");
    const setChannelDesc = getCommandLocalizations(
      "afk",
      "afk-config.set-channel.description",
    );
    const channelDesc = getCommandLocalizations(
      "afk",
      "afk-config.set-channel.channel.description",
    );
    const clearChannelDesc = getCommandLocalizations(
      "afk",
      "afk-config.clear-channel.description",
    );
    const viewDesc = getCommandLocalizations(
      "afk",
      "afk-config.view.description",
    );

    return (
      new SlashCommandBuilder()
        .setName(AFK_CONFIG_COMMAND.NAME)
        .setDescription(cmdDesc.ja)
        .setDescriptionLocalizations(cmdDesc.localizations)
        // Discord 側の表示/実行制御として ManageGuild を要求
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((subcommand) =>
          // AFK チャンネル設定
          subcommand
            .setName(AFK_CONFIG_COMMAND.SUBCOMMAND.SET_CHANNEL)
            .setDescription(setChannelDesc.ja)
            .setDescriptionLocalizations(setChannelDesc.localizations)
            .addChannelOption((option) =>
              option
                .setName(AFK_CONFIG_COMMAND.OPTION.CHANNEL)
                .setDescription(channelDesc.ja)
                .setDescriptionLocalizations(channelDesc.localizations)
                .addChannelTypes(ChannelType.GuildVoice)
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          // AFK チャンネル設定解除
          subcommand
            .setName(AFK_CONFIG_COMMAND.SUBCOMMAND.CLEAR_CHANNEL)
            .setDescription(clearChannelDesc.ja)
            .setDescriptionLocalizations(clearChannelDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 現在設定の表示
          subcommand
            .setName(AFK_CONFIG_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.ja)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
    );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeAfkConfigCommand(interaction);
    } catch (error) {
      // 統一エラーハンドリング
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default afkConfigCommand;
