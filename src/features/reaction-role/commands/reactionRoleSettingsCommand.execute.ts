// src/bot/features/reaction-role/commands/reactionRoleSettingsCommand.execute.ts
// リアクションロール設定コマンド実行処理

import { ValidationError } from "@ayasono/shared/core";
import type { ChatInputCommandInteraction } from "discord.js";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { tInteraction } from "../../../shared/locale/localeManager";
import { REACTION_ROLE_SETTINGS_COMMAND } from "./reactionRoleCommand.constants";
import { handleReactionRoleSettingsAddButton } from "./usecases/reactionRoleSettingsAddButton";
import { handleReactionRoleSettingsEditButton } from "./usecases/reactionRoleSettingsEditButton";
import { handleReactionRoleSettingsEditPanel } from "./usecases/reactionRoleSettingsEditPanel";
import { handleReactionRoleSettingsRemoveButton } from "./usecases/reactionRoleSettingsRemoveButton";
import { handleReactionRoleSettingsSetup } from "./usecases/reactionRoleSettingsSetup";
import { handleReactionRoleSettingsTeardown } from "./usecases/reactionRoleSettingsTeardown";
import { handleReactionRoleSettingsView } from "./usecases/reactionRoleSettingsView";

/**
 * reaction-role-settings コマンド実行入口
 * @param interaction コマンド実行インタラクション
 */
export async function executeReactionRoleSettingsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  ensureManageGuildPermission(interaction);

  const subcommand = interaction.options.getSubcommand();
  switch (subcommand) {
    case REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.SETUP:
      await handleReactionRoleSettingsSetup(interaction, guildId);
      break;
    case REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.TEARDOWN:
      await handleReactionRoleSettingsTeardown(interaction, guildId);
      break;
    case REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.VIEW:
      await handleReactionRoleSettingsView(interaction, guildId);
      break;
    case REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.EDIT_PANEL:
      await handleReactionRoleSettingsEditPanel(interaction, guildId);
      break;
    case REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.ADD_BUTTON:
      await handleReactionRoleSettingsAddButton(interaction, guildId);
      break;
    case REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_BUTTON:
      await handleReactionRoleSettingsRemoveButton(interaction, guildId);
      break;
    case REACTION_ROLE_SETTINGS_COMMAND.SUBCOMMAND.EDIT_BUTTON:
      await handleReactionRoleSettingsEditButton(interaction, guildId);
      break;
    default:
      throw new ValidationError(
        tInteraction(interaction.locale, COMMON_I18N_KEYS.INVALID_SUBCOMMAND),
      );
  }
}
