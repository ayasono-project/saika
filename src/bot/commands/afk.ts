// src/bot/commands/afk.ts
// AFK機能のコマンド

import {
  ChannelType,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { executeAfkCommand } from "../../features/afk/commands/afkCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import type { Command } from "../types/discord";

// AFK コマンド本体で利用するコマンド名・オプション名定数
const AFK_COMMAND = {
  NAME: "afk",
  OPTION: {
    TARGET_MEMBER: "target-member",
    TARGET_CHANNEL: "target-channel",
  },
} as const;

const AFK_I18N_KEYS = {
  COMMAND_DESCRIPTION: "afk.description",
  TARGET_MEMBER_OPTION_DESCRIPTION: "afk.target-member.description",
  TARGET_CHANNEL_OPTION_DESCRIPTION: "afk.target-channel.description",
} as const;

/**
 * AFKコマンド（ユーザー / VC全員の移動）
 */
export const afkCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations(
      "afk",
      AFK_I18N_KEYS.COMMAND_DESCRIPTION,
    );
    const targetMemberDesc = getCommandLocalizations(
      "afk",
      AFK_I18N_KEYS.TARGET_MEMBER_OPTION_DESCRIPTION,
    );
    const targetChannelDesc = getCommandLocalizations(
      "afk",
      AFK_I18N_KEYS.TARGET_CHANNEL_OPTION_DESCRIPTION,
    );

    return new SlashCommandBuilder()
      .setName(AFK_COMMAND.NAME)
      .setDescription(cmdDesc.base)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .addUserOption((option) =>
        option
          .setName(AFK_COMMAND.OPTION.TARGET_MEMBER)
          .setDescription(targetMemberDesc.base)
          .setDescriptionLocalizations(targetMemberDesc.localizations)
          .setRequired(false),
      )
      .addChannelOption((option) =>
        option
          .setName(AFK_COMMAND.OPTION.TARGET_CHANNEL)
          .setDescription(targetChannelDesc.base)
          .setDescriptionLocalizations(targetChannelDesc.localizations)
          .addChannelTypes(ChannelType.GuildVoice)
          .setRequired(false),
      );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeAfkCommand(interaction);
    } catch (error) {
      // 統一エラーハンドリング
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default afkCommand;
