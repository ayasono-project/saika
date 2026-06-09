// src/bot/commands/help.ts
// Helpコマンド - コマンド一覧を表示

import {
  ChatInputCommandInteraction,
  InteractionContextType,
} from "discord.js";
import { executeHelpCommand } from "../../features/help/commands/helpCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { createSlashCommand } from "../shared/createSlashCommand";
import type { Command } from "../types/discord";

// Help コマンドで使用するコマンド名定数
const HELP_COMMAND = {
  NAME: "help",
} as const;

// Help コマンドの表示文言キーを管理する定数
const HELP_I18N_KEYS = {
  COMMAND_DESCRIPTION: "help.description",
} as const;

/**
 * Helpコマンド
 * コマンド一覧とユーザーマニュアルリンクを表示する
 */
export const helpCommand: Command = {
  data: (() => {
    const desc = getCommandLocalizations(
      "help",
      HELP_I18N_KEYS.COMMAND_DESCRIPTION,
    );
    return createSlashCommand()
      .setName(HELP_COMMAND.NAME)
      .setDescription(desc.base)
      .setDescriptionLocalizations(desc.localizations)
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM);
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeHelpCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
