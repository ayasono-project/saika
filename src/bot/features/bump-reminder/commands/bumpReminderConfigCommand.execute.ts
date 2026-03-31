// src/bot/features/bump-reminder/commands/bumpReminderConfigCommand.execute.ts
// bump-reminder-config コマンドのルーター

import { type ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { BUMP_REMINDER_CONFIG_COMMAND } from "./bumpReminderConfigCommand.constants";
import { handleBumpReminderConfigDisable } from "./bumpReminderConfigCommand.disable";
import { handleBumpReminderConfigEnable } from "./bumpReminderConfigCommand.enable";
import { ensureManageGuildPermission } from "./bumpReminderConfigCommand.guard";
import { handleBumpReminderConfigRemoveMention } from "./bumpReminderConfigCommand.removeMention";
import { handleBumpReminderConfigRemoveUsers } from "./bumpReminderConfigCommand.removeUsers";
import { handleBumpReminderConfigReset } from "./bumpReminderConfigCommand.reset";
import { handleBumpReminderConfigSetMention } from "./bumpReminderConfigCommand.setMention";
import { handleBumpReminderConfigView } from "./bumpReminderConfigCommand.view";

/**
 * bump-reminder-config の実行入口
 * Guild/権限チェック後にサブコマンド処理へ振り分ける
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeBumpReminderConfigCommand(
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
      case BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.ENABLE:
        await handleBumpReminderConfigEnable(interaction, guildId);
        break;

      case BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.DISABLE:
        await handleBumpReminderConfigDisable(interaction, guildId);
        break;

      case BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.SET_MENTION:
        await handleBumpReminderConfigSetMention(interaction, guildId);
        break;

      case BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.REMOVE_MENTION:
        await handleBumpReminderConfigRemoveMention(interaction, guildId);
        break;

      case BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.REMOVE_MENTION_USERS:
        await handleBumpReminderConfigRemoveUsers(interaction, guildId);
        break;

      case BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.RESET:
        await handleBumpReminderConfigReset(interaction, guildId);
        break;

      case BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.VIEW:
        await handleBumpReminderConfigView(interaction, guildId);
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
