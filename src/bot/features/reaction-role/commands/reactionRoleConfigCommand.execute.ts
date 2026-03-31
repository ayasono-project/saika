// src/bot/features/reaction-role/commands/reactionRoleConfigCommand.execute.ts
// リアクションロール設定コマンド実行処理

import type { ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import { REACTION_ROLE_CONFIG_COMMAND } from "./reactionRoleCommand.constants";
import { handleReactionRoleConfigAddButton } from "./usecases/reactionRoleConfigAddButton";
import { handleReactionRoleConfigEditButton } from "./usecases/reactionRoleConfigEditButton";
import { handleReactionRoleConfigEditPanel } from "./usecases/reactionRoleConfigEditPanel";
import { handleReactionRoleConfigRemoveButton } from "./usecases/reactionRoleConfigRemoveButton";
import { handleReactionRoleConfigSetup } from "./usecases/reactionRoleConfigSetup";
import { handleReactionRoleConfigTeardown } from "./usecases/reactionRoleConfigTeardown";
import { handleReactionRoleConfigView } from "./usecases/reactionRoleConfigView";

/**
 * reaction-role-config コマンド実行入口
 * @param interaction コマンド実行インタラクション
 */
export async function executeReactionRoleConfigCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  ensureManageGuildPermission(interaction);

  const subcommand = interaction.options.getSubcommand();
  switch (subcommand) {
    case REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.SETUP:
      await handleReactionRoleConfigSetup(interaction, guildId);
      break;
    case REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.TEARDOWN:
      await handleReactionRoleConfigTeardown(interaction, guildId);
      break;
    case REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.VIEW:
      await handleReactionRoleConfigView(interaction, guildId);
      break;
    case REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.EDIT_PANEL:
      await handleReactionRoleConfigEditPanel(interaction, guildId);
      break;
    case REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.ADD_BUTTON:
      await handleReactionRoleConfigAddButton(interaction, guildId);
      break;
    case REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.REMOVE_BUTTON:
      await handleReactionRoleConfigRemoveButton(interaction, guildId);
      break;
    case REACTION_ROLE_CONFIG_COMMAND.SUBCOMMAND.EDIT_BUTTON:
      await handleReactionRoleConfigEditButton(interaction, guildId);
      break;
    default:
      throw new ValidationError(
        tInteraction(interaction.locale, COMMON_I18N_KEYS.INVALID_SUBCOMMAND),
      );
  }
}
