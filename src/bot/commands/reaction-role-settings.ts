// src/bot/commands/reaction-role-settings.ts
// リアクションロール設定コマンド定義

import {
  type ChatInputCommandInteraction,
  InteractionContextType,
  PermissionFlagsBits,
} from "discord.js";
import { REACTION_ROLE_SETTINGS_COMMAND } from "../../features/reaction-role/commands/reactionRoleCommand.constants";
import { executeReactionRoleSettingsCommand } from "../../features/reaction-role/commands/reactionRoleSettingsCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { createSlashCommand } from "../shared/createSlashCommand";
import type { Command } from "../types/discord";

/**
 * リアクションロール設定コマンド
 * リアクションロールパネルの設置・設定管理
 */
export const reactionRoleSettingsCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-settings.description",
    );
    const setupDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-settings.setup.description",
    );
    const teardownDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-settings.teardown.description",
    );
    const viewDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-settings.view.description",
    );
    const editPanelDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-settings.edit-panel.description",
    );
    const addButtonDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-settings.add-button.description",
    );
    const removeButtonDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-settings.remove-button.description",
    );
    const editButtonDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-settings.edit-button.description",
    );

    return (
      createSlashCommand()
        .setName(REACTION_ROLE_SETTINGS_COMMAND.NAME)
        .setDescription(cmdDesc.base)
        .setDescriptionLocalizations(cmdDesc.localizations)
        .setContexts(InteractionContextType.Guild)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        /* ── setup ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.SETUP)
            .setDescription(setupDesc.base)
            .setDescriptionLocalizations(setupDesc.localizations),
        )
        /* ── teardown ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.TEARDOWN)
            .setDescription(teardownDesc.base)
            .setDescriptionLocalizations(teardownDesc.localizations),
        )
        /* ── view ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.base)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
        /* ── edit-panel ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.EDIT_PANEL)
            .setDescription(editPanelDesc.base)
            .setDescriptionLocalizations(editPanelDesc.localizations),
        )
        /* ── add-button ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.ADD_BUTTON)
            .setDescription(addButtonDesc.base)
            .setDescriptionLocalizations(addButtonDesc.localizations),
        )
        /* ── remove-button ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_BUTTON)
            .setDescription(removeButtonDesc.base)
            .setDescriptionLocalizations(removeButtonDesc.localizations),
        )
        /* ── edit-button ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.EDIT_BUTTON)
            .setDescription(editButtonDesc.base)
            .setDescriptionLocalizations(editButtonDesc.localizations),
        )
    );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeReactionRoleSettingsCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default reactionRoleSettingsCommand;
