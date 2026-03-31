// src/bot/features/vc-recruit/commands/vcRecruitConfigCommand.execute.ts
// VC募集設定コマンド実行処理

import { ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import { handleVcRecruitConfigAddRole } from "./usecases/vcRecruitConfigAddRole";
import { handleVcRecruitConfigRemoveRole } from "./usecases/vcRecruitConfigRemoveRole";
import { handleVcRecruitConfigSetup } from "./usecases/vcRecruitConfigSetup";
import { handleVcRecruitConfigTeardown } from "./usecases/vcRecruitConfigTeardown";
import { handleVcRecruitConfigView } from "./usecases/vcRecruitConfigView";
import { VC_RECRUIT_CONFIG_COMMAND } from "./vcRecruitConfigCommand.constants";

/**
 * vc-recruit-config コマンド実行入口
 * @param interaction コマンド実行インタラクション
 */
export async function executeVcRecruitConfigCommand(
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
      case VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.SETUP:
        await handleVcRecruitConfigSetup(interaction, guildId);
        break;
      case VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.TEARDOWN:
        await handleVcRecruitConfigTeardown(interaction, guildId);
        break;
      case VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.ADD_ROLE:
        await handleVcRecruitConfigAddRole(interaction);
        break;
      case VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.REMOVE_ROLE:
        await handleVcRecruitConfigRemoveRole(interaction, guildId);
        break;
      case VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.VIEW:
        await handleVcRecruitConfigView(interaction, guildId);
        break;
      default:
        throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
