// src/bot/commands/about.ts
// Aboutコマンド - Bot の情報（バージョン・公式リンク）を表示

import {
  ChatInputCommandInteraction,
  InteractionContextType,
} from "discord.js";
import { executeAboutCommand } from "../../features/about/commands/aboutCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { createSlashCommand } from "../shared/createSlashCommand";
import type { Command } from "../types/discord";

// About コマンドで使用するコマンド名定数
const ABOUT_COMMAND = {
  NAME: "about",
} as const;

// About コマンドの表示文言キーを管理する定数
const ABOUT_I18N_KEYS = {
  COMMAND_DESCRIPTION: "about.description",
} as const;

/**
 * Aboutコマンド
 * Bot のバージョンと公式リンクを表示する
 */
export const aboutCommand: Command = {
  data: (() => {
    const desc = getCommandLocalizations(
      "about",
      ABOUT_I18N_KEYS.COMMAND_DESCRIPTION,
    );
    return createSlashCommand()
      .setName(ABOUT_COMMAND.NAME)
      .setDescription(desc.base)
      .setDescriptionLocalizations(desc.localizations)
      .setContexts(InteractionContextType.Guild, InteractionContextType.BotDM);
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeAboutCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
