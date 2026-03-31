// src/bot/features/guild-config/commands/guildConfigCommand.execute.ts
// guild-config コマンドのサブコマンドルーティング

import { type ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import { handleExport } from "./guildConfigCommand.export";
import { handleImport } from "./guildConfigCommand.import";
import { handleReset } from "./guildConfigCommand.reset";
import { handleResetAll } from "./guildConfigCommand.resetAll";
import { handleSetErrorChannel } from "./guildConfigCommand.setErrorChannel";
import { handleSetLocale } from "./guildConfigCommand.setLocale";
import { handleView } from "./guildConfigCommand.view";

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
 * guild-config コマンド実行入口
 * @param interaction コマンド実行インタラクション
 */
export async function executeGuildConfigCommand(
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
