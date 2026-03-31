// src/bot/commands/ping.ts
// Pingコマンド - ボットの応答速度を確認

import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { executePingCommand } from "../features/ping/commands/pingCommand.execute";
import type { Command } from "../types/discord";

// Ping コマンドで使用するコマンド名定数
const PING_COMMAND = {
  NAME: "ping",
} as const;

// Ping コマンドの表示文言キーを管理する定数
const PING_I18N_KEYS = {
  COMMAND_DESCRIPTION: "ping.description",
} as const;

/**
 * Pingコマンド
 * ボットのレイテンシー（応答速度）を確認する
 */
export const pingCommand: Command = {
  data: (() => {
    const desc = getCommandLocalizations(
      "ping",
      PING_I18N_KEYS.COMMAND_DESCRIPTION,
    );
    return new SlashCommandBuilder()
      .setName(PING_COMMAND.NAME)
      .setDescription(desc.ja)
      .setDescriptionLocalizations(desc.localizations);
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executePingCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 5,
};
