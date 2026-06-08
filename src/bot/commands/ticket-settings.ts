// src/bot/commands/ticket-settings.ts
// チケット設定コマンド定義

import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { TICKET_SETTINGS_COMMAND } from "../../features/ticket/commands/ticketCommand.constants";
import { executeTicketSettingsCommand } from "../../features/ticket/commands/ticketSettingsCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import type { Command } from "../types/discord";

/**
 * チケット設定コマンド
 * チケットシステムのセットアップ・設定管理
 */
export const ticketSettingsCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.description",
    );
    const setupDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.setup.description",
    );
    const setupCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.setup.category.description",
    );
    const teardownDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.teardown.description",
    );
    const viewDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.view.description",
    );
    const editPanelDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.edit-panel.description",
    );
    const editPanelCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.edit-panel.category.description",
    );
    const setRolesDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.set-roles.description",
    );
    const setRolesCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.set-roles.category.description",
    );
    const addRolesDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.add-roles.description",
    );
    const addRolesCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.add-roles.category.description",
    );
    const removeRolesDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.remove-roles.description",
    );
    const removeRolesCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.remove-roles.category.description",
    );
    const setAutoDeleteDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.set-auto-delete.description",
    );
    const setAutoDeleteCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.set-auto-delete.category.description",
    );
    const setAutoDeleteDaysDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.set-auto-delete.days.description",
    );
    const setMaxTicketsDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.set-max-tickets.description",
    );
    const setMaxTicketsCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.set-max-tickets.category.description",
    );
    const setMaxTicketsCountDesc = getCommandLocalizations(
      "ticket",
      "ticket-settings.set-max-tickets.count.description",
    );

    return (
      new SlashCommandBuilder()
        .setName(TICKET_SETTINGS_COMMAND.NAME)
        .setDescription(cmdDesc.base)
        .setDescriptionLocalizations(cmdDesc.localizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        /* ── setup ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_SETTINGS_COMMAND.SUBCOMMAND.SETUP)
            .setDescription(setupDesc.base)
            .setDescriptionLocalizations(setupDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_SETTINGS_COMMAND.OPTION.CATEGORY)
                .setDescription(setupCategoryDesc.base)
                .setDescriptionLocalizations(setupCategoryDesc.localizations)
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            ),
        )
        /* ── teardown ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_SETTINGS_COMMAND.SUBCOMMAND.TEARDOWN)
            .setDescription(teardownDesc.base)
            .setDescriptionLocalizations(teardownDesc.localizations),
        )
        /* ── view ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_SETTINGS_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.base)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
        /* ── edit-panel ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_SETTINGS_COMMAND.SUBCOMMAND.EDIT_PANEL)
            .setDescription(editPanelDesc.base)
            .setDescriptionLocalizations(editPanelDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_SETTINGS_COMMAND.OPTION.CATEGORY)
                .setDescription(editPanelCategoryDesc.base)
                .setDescriptionLocalizations(
                  editPanelCategoryDesc.localizations,
                )
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            ),
        )
        /* ── set-roles ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_SETTINGS_COMMAND.SUBCOMMAND.SET_ROLES)
            .setDescription(setRolesDesc.base)
            .setDescriptionLocalizations(setRolesDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_SETTINGS_COMMAND.OPTION.CATEGORY)
                .setDescription(setRolesCategoryDesc.base)
                .setDescriptionLocalizations(setRolesCategoryDesc.localizations)
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            ),
        )
        /* ── add-roles ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_SETTINGS_COMMAND.SUBCOMMAND.ADD_ROLES)
            .setDescription(addRolesDesc.base)
            .setDescriptionLocalizations(addRolesDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_SETTINGS_COMMAND.OPTION.CATEGORY)
                .setDescription(addRolesCategoryDesc.base)
                .setDescriptionLocalizations(addRolesCategoryDesc.localizations)
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            ),
        )
        /* ── remove-roles ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_ROLES)
            .setDescription(removeRolesDesc.base)
            .setDescriptionLocalizations(removeRolesDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_SETTINGS_COMMAND.OPTION.CATEGORY)
                .setDescription(removeRolesCategoryDesc.base)
                .setDescriptionLocalizations(
                  removeRolesCategoryDesc.localizations,
                )
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            ),
        )
        /* ── set-auto-delete ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_SETTINGS_COMMAND.SUBCOMMAND.SET_AUTO_DELETE)
            .setDescription(setAutoDeleteDesc.base)
            .setDescriptionLocalizations(setAutoDeleteDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_SETTINGS_COMMAND.OPTION.CATEGORY)
                .setDescription(setAutoDeleteCategoryDesc.base)
                .setDescriptionLocalizations(
                  setAutoDeleteCategoryDesc.localizations,
                )
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            )
            .addIntegerOption((opt) =>
              opt
                .setName(TICKET_SETTINGS_COMMAND.OPTION.DAYS)
                .setDescription(setAutoDeleteDaysDesc.base)
                .setDescriptionLocalizations(
                  setAutoDeleteDaysDesc.localizations,
                )
                .setMinValue(1)
                .setRequired(true),
            ),
        )
        /* ── set-max-tickets ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_SETTINGS_COMMAND.SUBCOMMAND.SET_MAX_TICKETS)
            .setDescription(setMaxTicketsDesc.base)
            .setDescriptionLocalizations(setMaxTicketsDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_SETTINGS_COMMAND.OPTION.CATEGORY)
                .setDescription(setMaxTicketsCategoryDesc.base)
                .setDescriptionLocalizations(
                  setMaxTicketsCategoryDesc.localizations,
                )
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            )
            .addIntegerOption((opt) =>
              opt
                .setName(TICKET_SETTINGS_COMMAND.OPTION.COUNT)
                .setDescription(setMaxTicketsCountDesc.base)
                .setDescriptionLocalizations(
                  setMaxTicketsCountDesc.localizations,
                )
                .setMinValue(1)
                .setRequired(true),
            ),
        )
    );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeTicketSettingsCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default ticketSettingsCommand;
