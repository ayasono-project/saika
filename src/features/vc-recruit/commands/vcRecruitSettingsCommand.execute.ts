// src/bot/features/vc-recruit/commands/vcRecruitSettingsCommand.execute.ts
// VC募集設定コマンド実行処理

import { ValidationError } from "@ayasono/shared/core";
import { ChatInputCommandInteraction } from "discord.js";
import { handleCommandError } from "../../../bot/errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { handleVcRecruitSettingsAddRole } from "./usecases/vcRecruitSettingsAddRole";
import { handleVcRecruitSettingsRemoveRole } from "./usecases/vcRecruitSettingsRemoveRole";
import { handleVcRecruitSettingsSetup } from "./usecases/vcRecruitSettingsSetup";
import { handleVcRecruitSettingsTeardown } from "./usecases/vcRecruitSettingsTeardown";
import { handleVcRecruitSettingsView } from "./usecases/vcRecruitSettingsView";
import { VC_RECRUIT_SETTINGS_COMMAND } from "./vcRecruitSettingsCommand.constants";

/**
 * vc-recruit-settings コマンド実行入口
 * @param interaction コマンド実行インタラクション
 */
export async function executeVcRecruitSettingsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }

    await ensureManageGuildPermission(interaction);

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SETUP:
        await handleVcRecruitSettingsSetup(interaction, guildId);
        break;
      case VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.TEARDOWN:
        await handleVcRecruitSettingsTeardown(interaction, guildId);
        break;
      case VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.ADD_ROLE:
        await handleVcRecruitSettingsAddRole(interaction);
        break;
      case VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_ROLE:
        await handleVcRecruitSettingsRemoveRole(interaction, guildId);
        break;
      case VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.VIEW:
        await handleVcRecruitSettingsView(interaction, guildId);
        break;
      default:
        throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
