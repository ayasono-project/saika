// src/bot/commands/afk.ts
// AFK機能のコマンド

import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { executeAfkCommand } from "../features/afk/commands/afkCommand.execute";
import type { Command } from "../types/discord";

// AFK コマンド本体で利用するコマンド名・オプション名定数
const AFK_COMMAND = {
  NAME: "afk",
  OPTION: {
    USER: "user",
  },
} as const;

const AFK_I18N_KEYS = {
  COMMAND_DESCRIPTION: "afk.description",
  USER_OPTION_DESCRIPTION: "afk.user.description",
} as const;

/**
 * AFKコマンド（ユーザー移動）
 */
export const afkCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations(
      "afk",
      AFK_I18N_KEYS.COMMAND_DESCRIPTION,
    );
    const userDesc = getCommandLocalizations(
      "afk",
      AFK_I18N_KEYS.USER_OPTION_DESCRIPTION,
    );

    return new SlashCommandBuilder()
      .setName(AFK_COMMAND.NAME)
      .setDescription(cmdDesc.ja)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .addUserOption((option) =>
        option
          .setName(AFK_COMMAND.OPTION.USER)
          .setDescription(userDesc.ja)
          .setDescriptionLocalizations(userDesc.localizations)
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
