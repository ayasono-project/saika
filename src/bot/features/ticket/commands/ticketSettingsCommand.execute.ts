// src/bot/features/ticket/commands/ticketSettingsCommand.execute.ts
// チケット設定コマンド実行処理

import { ValidationError } from "@ayasono/shared/core";
import type { ChatInputCommandInteraction } from "discord.js";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import { TICKET_SETTINGS_COMMAND } from "./ticketCommand.constants";
import { handleTicketSettingsAddRoles } from "./usecases/ticketSettingsAddRoles";
import { handleTicketSettingsEditPanel } from "./usecases/ticketSettingsEditPanel";
import { handleTicketSettingsRemoveRoles } from "./usecases/ticketSettingsRemoveRoles";
import { handleTicketSettingsSetAutoDelete } from "./usecases/ticketSettingsSetAutoDelete";
import { handleTicketSettingsSetMaxTickets } from "./usecases/ticketSettingsSetMaxTickets";
import { handleTicketSettingsSetRoles } from "./usecases/ticketSettingsSetRoles";
import { handleTicketSettingsSetup } from "./usecases/ticketSettingsSetup";
import { handleTicketSettingsTeardown } from "./usecases/ticketSettingsTeardown";
import { handleTicketSettingsView } from "./usecases/ticketSettingsView";

/**
 * ticket-settings コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeTicketSettingsCommand(
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
      case TICKET_SETTINGS_COMMAND.SUBCOMMAND.SETUP:
        await handleTicketSettingsSetup(interaction, guildId);
        break;
      case TICKET_SETTINGS_COMMAND.SUBCOMMAND.TEARDOWN:
        await handleTicketSettingsTeardown(interaction, guildId);
        break;
      case TICKET_SETTINGS_COMMAND.SUBCOMMAND.VIEW:
        await handleTicketSettingsView(interaction, guildId);
        break;
      case TICKET_SETTINGS_COMMAND.SUBCOMMAND.EDIT_PANEL:
        await handleTicketSettingsEditPanel(interaction, guildId);
        break;
      case TICKET_SETTINGS_COMMAND.SUBCOMMAND.SET_ROLES:
        await handleTicketSettingsSetRoles(interaction, guildId);
        break;
      case TICKET_SETTINGS_COMMAND.SUBCOMMAND.ADD_ROLES:
        await handleTicketSettingsAddRoles(interaction, guildId);
        break;
      case TICKET_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_ROLES:
        await handleTicketSettingsRemoveRoles(interaction, guildId);
        break;
      case TICKET_SETTINGS_COMMAND.SUBCOMMAND.SET_AUTO_DELETE:
        await handleTicketSettingsSetAutoDelete(interaction, guildId);
        break;
      case TICKET_SETTINGS_COMMAND.SUBCOMMAND.SET_MAX_TICKETS:
        await handleTicketSettingsSetMaxTickets(interaction, guildId);
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
