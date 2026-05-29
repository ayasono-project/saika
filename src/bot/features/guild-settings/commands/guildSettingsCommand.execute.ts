// src/bot/features/guild-settings/commands/guildSettingsCommand.execute.ts
// guild-settings コマンドのサブコマンドルーティング

import { ValidationError } from "@ayasono/shared/core";
import { type ChatInputCommandInteraction } from "discord.js";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import { handleExport } from "./guildSettingsCommand.export";
import { handleImport } from "./guildSettingsCommand.import";
import { handleReset } from "./guildSettingsCommand.reset";
import { handleResetAll } from "./guildSettingsCommand.resetAll";
import { handleSetErrorChannel } from "./guildSettingsCommand.setErrorChannel";
import { handleSetLocale } from "./guildSettingsCommand.setLocale";
import { handleView } from "./guildSettingsCommand.view";

const SUBCOMMAND = {
  SET_LOCALE: "set-locale",
  SET_ERROR_CHANNEL: "set-error-channel",
  VIEW: "view",
  RESET: "reset",
  RESET_ALL: "reset-all",
  EXPORT: "export",
  IMPORT: "import",
} as const;

/**
 * guild-settings コマンド実行入口
 * @param interaction コマンド実行インタラクション
 */
export async function executeGuildSettingsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const guildId = interaction.guildId;
  if (!guildId) {
    throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
  }

  // 実行時にも管理権限を確認
  ensureManageGuildPermission(interaction);

  const subcommand = interaction.options.getSubcommand();

  switch (subcommand) {
    case SUBCOMMAND.SET_LOCALE:
      await handleSetLocale(interaction, guildId);
      break;
    case SUBCOMMAND.SET_ERROR_CHANNEL:
      await handleSetErrorChannel(interaction, guildId);
      break;
    case SUBCOMMAND.VIEW:
      await handleView(interaction, guildId);
      break;
    case SUBCOMMAND.RESET:
      await handleReset(interaction, guildId);
      break;
    case SUBCOMMAND.RESET_ALL:
      await handleResetAll(interaction, guildId);
      break;
    case SUBCOMMAND.EXPORT:
      await handleExport(interaction, guildId);
      break;
    case SUBCOMMAND.IMPORT:
      await handleImport(interaction, guildId);
      break;
    default:
      throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
  }
}
