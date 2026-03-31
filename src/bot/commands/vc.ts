// src/bot/commands/vc.ts
// VC操作コマンド定義

import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { VC_COMMAND } from "../features/vc-command/commands/vcCommand.constants";
import { executeVcCommand } from "../features/vc-command/commands/vcCommand.execute";
import type { Command } from "../types/discord";

/**
 * VC操作コマンド
 * Bot管理下VCのリネーム・人数制限変更を提供する
 */
export const vcCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations("vc", "vc.description");
    const renameDesc = getCommandLocalizations("vc", "vc.rename.description");
    const renameNameDesc = getCommandLocalizations(
      "vc",
      "vc.rename.name.description",
    );
    const limitDesc = getCommandLocalizations("vc", "vc.limit.description");
    const limitValueDesc = getCommandLocalizations(
      "vc",
      "vc.limit.limit.description",
    );

    return new SlashCommandBuilder()
      .setName(VC_COMMAND.NAME)
      .setDescription(cmdDesc.ja)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_COMMAND.SUBCOMMAND.RENAME)
          .setDescription(renameDesc.ja)
          .setDescriptionLocalizations(renameDesc.localizations)
          .addStringOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.NAME)
              .setDescription(renameNameDesc.ja)
              .setDescriptionLocalizations(renameNameDesc.localizations)
              .setRequired(true)
              .setMaxLength(100),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_COMMAND.SUBCOMMAND.LIMIT)
          .setDescription(limitDesc.ja)
          .setDescriptionLocalizations(limitDesc.localizations)
          .addIntegerOption((option) =>
            option
              .setName(VC_COMMAND.OPTION.LIMIT)
              .setDescription(limitValueDesc.ja)
              .setDescriptionLocalizations(limitValueDesc.localizations)
              .setRequired(true)
              .setMinValue(VC_COMMAND.LIMIT_MIN)
              .setMaxValue(VC_COMMAND.LIMIT_MAX),
          ),
      );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeVcCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default vcCommand;
