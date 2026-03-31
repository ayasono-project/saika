// src/bot/commands/ticket-config.ts
// チケット設定コマンド定義

import {
  ChannelType,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { TICKET_CONFIG_COMMAND } from "../features/ticket/commands/ticketCommand.constants";
import { executeTicketConfigCommand } from "../features/ticket/commands/ticketConfigCommand.execute";
import type { Command } from "../types/discord";

/**
 * チケット設定コマンド
 * チケットシステムのセットアップ・設定管理
 */
export const ticketConfigCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.description",
    );
    const setupDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.setup.description",
    );
    const setupCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.setup.category.description",
    );
    const teardownDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.teardown.description",
    );
    const viewDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.view.description",
    );
    const editPanelDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.edit-panel.description",
    );
    const editPanelCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.edit-panel.category.description",
    );
    const setRolesDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.set-roles.description",
    );
    const setRolesCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.set-roles.category.description",
    );
    const addRolesDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.add-roles.description",
    );
    const addRolesCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.add-roles.category.description",
    );
    const removeRolesDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.remove-roles.description",
    );
    const removeRolesCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.remove-roles.category.description",
    );
    const setAutoDeleteDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.set-auto-delete.description",
    );
    const setAutoDeleteCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.set-auto-delete.category.description",
    );
    const setAutoDeleteDaysDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.set-auto-delete.days.description",
    );
    const setMaxTicketsDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.set-max-tickets.description",
    );
    const setMaxTicketsCategoryDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.set-max-tickets.category.description",
    );
    const setMaxTicketsCountDesc = getCommandLocalizations(
      "ticket",
      "ticket-config.set-max-tickets.count.description",
    );

    return (
      new SlashCommandBuilder()
        .setName(TICKET_CONFIG_COMMAND.NAME)
        .setDescription(cmdDesc.ja)
        .setDescriptionLocalizations(cmdDesc.localizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        /* ── setup ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_CONFIG_COMMAND.SUBCOMMAND.SETUP)
            .setDescription(setupDesc.ja)
            .setDescriptionLocalizations(setupDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_CONFIG_COMMAND.OPTION.CATEGORY)
                .setDescription(setupCategoryDesc.ja)
                .setDescriptionLocalizations(setupCategoryDesc.localizations)
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            ),
        )
        /* ── teardown ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_CONFIG_COMMAND.SUBCOMMAND.TEARDOWN)
            .setDescription(teardownDesc.ja)
            .setDescriptionLocalizations(teardownDesc.localizations),
        )
        /* ── view ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_CONFIG_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.ja)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
        /* ── edit-panel ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_CONFIG_COMMAND.SUBCOMMAND.EDIT_PANEL)
            .setDescription(editPanelDesc.ja)
            .setDescriptionLocalizations(editPanelDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_CONFIG_COMMAND.OPTION.CATEGORY)
                .setDescription(editPanelCategoryDesc.ja)
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
            .setName(TICKET_CONFIG_COMMAND.SUBCOMMAND.SET_ROLES)
            .setDescription(setRolesDesc.ja)
            .setDescriptionLocalizations(setRolesDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_CONFIG_COMMAND.OPTION.CATEGORY)
                .setDescription(setRolesCategoryDesc.ja)
                .setDescriptionLocalizations(setRolesCategoryDesc.localizations)
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            ),
        )
        /* ── add-roles ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_CONFIG_COMMAND.SUBCOMMAND.ADD_ROLES)
            .setDescription(addRolesDesc.ja)
            .setDescriptionLocalizations(addRolesDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_CONFIG_COMMAND.OPTION.CATEGORY)
                .setDescription(addRolesCategoryDesc.ja)
                .setDescriptionLocalizations(addRolesCategoryDesc.localizations)
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            ),
        )
        /* ── remove-roles ── */
        .addSubcommand((sub) =>
          sub
            .setName(TICKET_CONFIG_COMMAND.SUBCOMMAND.REMOVE_ROLES)
            .setDescription(removeRolesDesc.ja)
            .setDescriptionLocalizations(removeRolesDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_CONFIG_COMMAND.OPTION.CATEGORY)
                .setDescription(removeRolesCategoryDesc.ja)
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
            .setName(TICKET_CONFIG_COMMAND.SUBCOMMAND.SET_AUTO_DELETE)
            .setDescription(setAutoDeleteDesc.ja)
            .setDescriptionLocalizations(setAutoDeleteDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_CONFIG_COMMAND.OPTION.CATEGORY)
                .setDescription(setAutoDeleteCategoryDesc.ja)
                .setDescriptionLocalizations(
                  setAutoDeleteCategoryDesc.localizations,
                )
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            )
            .addIntegerOption((opt) =>
              opt
                .setName(TICKET_CONFIG_COMMAND.OPTION.DAYS)
                .setDescription(setAutoDeleteDaysDesc.ja)
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
            .setName(TICKET_CONFIG_COMMAND.SUBCOMMAND.SET_MAX_TICKETS)
            .setDescription(setMaxTicketsDesc.ja)
            .setDescriptionLocalizations(setMaxTicketsDesc.localizations)
            .addChannelOption((opt) =>
              opt
                .setName(TICKET_CONFIG_COMMAND.OPTION.CATEGORY)
                .setDescription(setMaxTicketsCategoryDesc.ja)
                .setDescriptionLocalizations(
                  setMaxTicketsCategoryDesc.localizations,
                )
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true),
            )
            .addIntegerOption((opt) =>
              opt
                .setName(TICKET_CONFIG_COMMAND.OPTION.COUNT)
                .setDescription(setMaxTicketsCountDesc.ja)
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
      await executeTicketConfigCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default ticketConfigCommand;
