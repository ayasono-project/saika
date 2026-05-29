// src/bot/features/vac/commands/vacSettingsCommand.execute.ts
// VAC 設定コマンド実行処理

import { ValidationError } from "@ayasono/shared/core";
import { ChatInputCommandInteraction } from "discord.js";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import { handleVacSettingsCreateTrigger } from "./usecases/vacSettingsCreateTrigger";
import { handleVacSettingsRemoveTrigger } from "./usecases/vacSettingsRemoveTrigger";
import { handleVacSettingsView } from "./usecases/vacSettingsView";
import { VAC_SETTINGS_COMMAND } from "./vacSettingsCommand.constants";

/**
 * vac-settings コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeVacSettingsCommand(
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
      case VAC_SETTINGS_COMMAND.SUBCOMMAND.CREATE_TRIGGER:
        await handleVacSettingsCreateTrigger(interaction, guildId);
        break;
      case VAC_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_TRIGGER:
        await handleVacSettingsRemoveTrigger(interaction, guildId);
        break;
      case VAC_SETTINGS_COMMAND.SUBCOMMAND.VIEW:
        await handleVacSettingsView(interaction, guildId);
        break;
      default:
        throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
