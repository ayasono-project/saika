// src/bot/commands/reaction-role-config.ts
// リアクションロール設定コマンド定義

import {
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { REACTION_ROLE_CONFIG_COMMAND } from "../features/reaction-role/commands/reactionRoleCommand.constants";
import { executeReactionRoleConfigCommand } from "../features/reaction-role/commands/reactionRoleConfigCommand.execute";
import type { Command } from "../types/discord";

/**
 * リアクションロール設定コマンド
 * リアクションロールパネルの設置・設定管理
 */
export const reactionRoleConfigCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-config.description",
    );
    const setupDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-config.setup.description",
    );
    const teardownDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-config.teardown.description",
    );
    const viewDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-config.view.description",
    );
    const editPanelDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-config.edit-panel.description",
    );
    const addButtonDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-config.add-button.description",
    );
    const removeButtonDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-config.remove-button.description",
    );
    const editButtonDesc = getCommandLocalizations(
      "reactionRole",
      "reaction-role-config.edit-button.description",
    );

    return (
      new SlashCommandBuilder()
        .setName(REACTION_ROLE_CONFIG_COMMAND.NAME)
        .setDescription(cmdDesc.ja)
        .setDescriptionLocalizations(cmdDesc.localizations)
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        /* ── setup ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.SETUP)
            .setDescription(setupDesc.ja)
            .setDescriptionLocalizations(setupDesc.localizations),
        )
        /* ── teardown ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.TEARDOWN)
            .setDescription(teardownDesc.ja)
            .setDescriptionLocalizations(teardownDesc.localizations),
        )
        /* ── view ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.ja)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
        /* ── edit-panel ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.EDIT_PANEL)
            .setDescription(editPanelDesc.ja)
            .setDescriptionLocalizations(editPanelDesc.localizations),
        )
        /* ── add-button ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.ADD_BUTTON)
            .setDescription(addButtonDesc.ja)
            .setDescriptionLocalizations(addButtonDesc.localizations),
        )
        /* ── remove-button ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.REMOVE_BUTTON)
            .setDescription(removeButtonDesc.ja)
            .setDescriptionLocalizations(removeButtonDesc.localizations),
        )
        /* ── edit-button ── */
        .addSubcommand((sub) =>
          sub
            .setName(REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.EDIT_BUTTON)
            .setDescription(editButtonDesc.ja)
            .setDescriptionLocalizations(editButtonDesc.localizations),
        )
    );
  })(),

  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeReactionRoleConfigCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};

export default reactionRoleConfigCommand;
