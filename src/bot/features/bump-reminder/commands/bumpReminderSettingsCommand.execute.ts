// src/bot/features/bump-reminder/commands/bumpReminderSettingsCommand.execute.ts
// bump-reminder-settings コマンドのルーター

import { ValidationError } from "@ayasono/shared/core";
import { type ChatInputCommandInteraction } from "discord.js";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { BUMP_REMINDER_SETTINGS_COMMAND } from "./bumpReminderSettingsCommand.constants";
import { handleBumpReminderSettingsDisable } from "./bumpReminderSettingsCommand.disable";
import { handleBumpReminderSettingsEnable } from "./bumpReminderSettingsCommand.enable";
import { ensureManageGuildPermission } from "./bumpReminderSettingsCommand.guard";
import { handleBumpReminderSettingsRemoveMention } from "./bumpReminderSettingsCommand.removeMention";
import { handleBumpReminderSettingsRemoveUsers } from "./bumpReminderSettingsCommand.removeUsers";
import { handleBumpReminderSettingsReset } from "./bumpReminderSettingsCommand.reset";
import { handleBumpReminderSettingsSetMention } from "./bumpReminderSettingsCommand.setMention";
import { handleBumpReminderSettingsView } from "./bumpReminderSettingsCommand.view";

/**
 * bump-reminder-settings の実行入口
 * Guild/権限チェック後にサブコマンド処理へ振り分ける
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeBumpReminderSettingsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    // Guild外実行は対象外
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }

    // 管理権限を統一ガードで検証
    await ensureManageGuildPermission(interaction);

    // サブコマンドごとに機能別ハンドラへ委譲
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.ENABLE:
        await handleBumpReminderSettingsEnable(interaction, guildId);
        break;

      case BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.DISABLE:
        await handleBumpReminderSettingsDisable(interaction, guildId);
        break;

      case BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.SET_MENTION:
        await handleBumpReminderSettingsSetMention(interaction, guildId);
        break;

      case BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_MENTION:
        await handleBumpReminderSettingsRemoveMention(interaction, guildId);
        break;

      case BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_MENTION_USERS:
        await handleBumpReminderSettingsRemoveUsers(interaction, guildId);
        break;

      case BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.RESET:
        await handleBumpReminderSettingsReset(interaction, guildId);
        break;

      case BUMP_REMINDER_SETTINGS_COMMAND.SUBCOMMAND.VIEW:
        await handleBumpReminderSettingsView(interaction, guildId);
        break;

      default:
        // 定義外サブコマンドは共通バリデーションエラー
        throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
    }
  } catch (error) {
    // 応答整形は既存の共通ハンドラへ委譲
    await handleCommandError(interaction, error);
  }
}
