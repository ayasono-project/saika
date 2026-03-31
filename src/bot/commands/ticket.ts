// src/bot/commands/ticket.ts
// チケットコマンド定義

import {
  type ChatInputCommandInteraction,
  SlashCommandBuilder,
} from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { TICKET_COMMAND } from "../features/ticket/commands/ticketCommand.constants";
import { executeTicketCommand } from "../features/ticket/commands/ticketCommand.execute";
import type { Command } from "../types/discord";

/**
 * チケットコマンド
 * チケットチャンネルの操作（クローズ・再オープン・削除）
 */
export const ticketCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations("ticket", "ticket.description");
    const closeDesc = getCommandLocalizations(
      "ticket",
      "ticket.close.description",
    );
    const openDesc = getCommandLocalizations(
      "ticket",
      "ticket.open.description",
    );
    const deleteDesc = getCommandLocalizations(
      "ticket",
      "ticket.delete.description",
    );

    return (
      new SlashCommandBuilder()
        .setName(TICKET_COMMAND.NAME)
        .setDescription(cmdDesc.ja)
        .setDescriptionLocalizations(cmdDesc.localizations)
        /* ── close ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_COMMAND.SUBCOMMAND.CLOSE)
            .setDescription(closeDesc.ja)
            .setDescriptionLocalizations(closeDesc.localizations),
        )
        /* ── open ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_COMMAND.SUBCOMMAND.OPEN)
            .setDescription(openDesc.ja)
            .setDescriptionLocalizations(openDesc.localizations),
        )
        /* ── delete ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_COMMAND.SUBCOMMAND.DELETE)
            .setDescription(deleteDesc.ja)
            .setDescriptionLocalizations(deleteDesc.localizations),
        )
    );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeTicketCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default ticketCommand;
