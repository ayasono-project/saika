// src/bot/features/ticket/commands/ticketConfigCommand.execute.ts
// チケット設定コマンド実行処理

import type { ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import { TICKET_CONFIG_COMMAND } from "./ticketCommand.constants";
import { handleTicketConfigAddRoles } from "./usecases/ticketConfigAddRoles";
import { handleTicketConfigEditPanel } from "./usecases/ticketConfigEditPanel";
import { handleTicketConfigRemoveRoles } from "./usecases/ticketConfigRemoveRoles";
import { handleTicketConfigSetAutoDelete } from "./usecases/ticketConfigSetAutoDelete";
import { handleTicketConfigSetMaxTickets } from "./usecases/ticketConfigSetMaxTickets";
import { handleTicketConfigSetRoles } from "./usecases/ticketConfigSetRoles";
import { handleTicketConfigSetup } from "./usecases/ticketConfigSetup";
import { handleTicketConfigTeardown } from "./usecases/ticketConfigTeardown";
import { handleTicketConfigView } from "./usecases/ticketConfigView";

/**
 * ticket-config コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeTicketConfigCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }

    ensureManageGuildPermission(interaction);

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case TICKET_CONFIG_COMMAND.SUBCOMMAND.SETUP:
        await handleTicketConfigSetup(interaction, guildId);
        break;
      case TICKET_CONFIG_COMMAND.SUBCOMMAND.TEARDOWN:
        await handleTicketConfigTeardown(interaction, guildId);
        break;
      case TICKET_CONFIG_COMMAND.SUBCOMMAND.VIEW:
        await handleTicketConfigView(interaction, guildId);
        break;
      case TICKET_CONFIG_COMMAND.SUBCOMMAND.EDIT_PANEL:
        await handleTicketConfigEditPanel(interaction, guildId);
        break;
      case TICKET_CONFIG_COMMAND.SUBCOMMAND.SET_ROLES:
        await handleTicketConfigSetRoles(interaction, guildId);
        break;
      case TICKET_CONFIG_COMMAND.SUBCOMMAND.ADD_ROLES:
        await handleTicketConfigAddRoles(interaction, guildId);
        break;
      case TICKET_CONFIG_COMMAND.SUBCOMMAND.REMOVE_ROLES:
        await handleTicketConfigRemoveRoles(interaction, guildId);
        break;
      case TICKET_CONFIG_COMMAND.SUBCOMMAND.SET_AUTO_DELETE:
        await handleTicketConfigSetAutoDelete(interaction, guildId);
        break;
      case TICKET_CONFIG_COMMAND.SUBCOMMAND.SET_MAX_TICKETS:
        await handleTicketConfigSetMaxTickets(interaction, guildId);
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
