// src/bot/features/vac/commands/vacConfigCommand.execute.ts
// VAC 設定コマンド実行処理

import { ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import { handleVacConfigCreateTrigger } from "./usecases/vacConfigCreateTrigger";
import { handleVacConfigRemoveTrigger } from "./usecases/vacConfigRemoveTrigger";
import { handleVacConfigView } from "./usecases/vacConfigView";
import { VAC_CONFIG_COMMAND } from "./vacConfigCommand.constants";

/**
 * vac-config コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeVacConfigCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    // Guild 外実行は設定変更対象外
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }

    // 実行前に管理権限を検証
    await ensureManageGuildPermission(interaction);

    // サブコマンド別に処理を委譲
    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case VAC_CONFIG_COMMAND.SUBCOMMAND.CREATE_TRIGGER:
        await handleVacConfigCreateTrigger(interaction, guildId);
        break;
      case VAC_CONFIG_COMMAND.SUBCOMMAND.REMOVE_TRIGGER:
        await handleVacConfigRemoveTrigger(interaction, guildId);
        break;
      case VAC_CONFIG_COMMAND.SUBCOMMAND.VIEW:
        await handleVacConfigView(interaction, guildId);
        break;
      default:
        throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
