// src/bot/features/ticket/commands/ticketCommand.execute.ts
// チケットコマンド実行処理

import type { ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { TICKET_COMMAND } from "./ticketCommand.constants";
import { handleTicketClose } from "./usecases/ticketClose";
import { handleTicketDelete } from "./usecases/ticketDelete";
import { handleTicketOpen } from "./usecases/ticketOpen";

/**
 * ticket コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeTicketCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case TICKET_COMMAND.SUBCOMMAND.CLOSE:
        await handleTicketClose(interaction);
        break;
      case TICKET_COMMAND.SUBCOMMAND.OPEN:
        await handleTicketOpen(interaction);
        break;
      case TICKET_COMMAND.SUBCOMMAND.DELETE:
        await handleTicketDelete(interaction);
        break;
      default:
        throw new ValidationError(
          tInteraction(interaction.locale, COMMON_I18N_KEYS.INVALID_SUBCOMMAND),
        );
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
