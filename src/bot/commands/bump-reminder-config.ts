// src/bot/commands/bump-reminder-config.ts
// Bumpリマインダー機能の設定コマンド定義

import { PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { BUMP_REMINDER_CONFIG_COMMAND } from "../features/bump-reminder/commands/bumpReminderConfigCommand.constants";
import { executeBumpReminderConfigCommand } from "../features/bump-reminder/commands/bumpReminderConfigCommand.execute";
import type { Command } from "../types/discord";

/**
 * Bumpリマインダー設定コマンド（サーバー管理権限専用）
 * 機能の有効化/無効化・メンション対象の設定・確認を提供する
 */
export const bumpReminderConfigCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations(
      "bumpReminder",
      "bump-reminder-config.description",
    );
    const enableDesc = getCommandLocalizations(
      "bumpReminder",
      "bump-reminder-config.enable.description",
    );
    const disableDesc = getCommandLocalizations(
      "bumpReminder",
      "bump-reminder-config.disable.description",
    );
    const setMentionDesc = getCommandLocalizations(
      "bumpReminder",
      "bump-reminder-config.set-mention.description",
    );
    const roleDesc = getCommandLocalizations(
      "bumpReminder",
      "bump-reminder-config.set-mention.role.description",
    );
    const removeMentionDesc = getCommandLocalizations(
      "bumpReminder",
      "bump-reminder-config.remove-mention.description",
    );
    const removeUsersDesc = getCommandLocalizations(
      "bumpReminder",
      "bump-reminder-config.remove-mention-users.description",
    );
    const resetDesc = getCommandLocalizations(
      "bumpReminder",
      "bump-reminder-config.reset.description",
    );
    const viewDesc = getCommandLocalizations(
      "bumpReminder",
      "bump-reminder-config.view.description",
    );

    // コマンド定義は commands 層に残し、業務処理は features 側へ委譲する
    return (
      new SlashCommandBuilder()
        .setName(BUMP_REMINDER_CONFIG_COMMAND.NAME)
        .setDescription(cmdDesc.ja)
        .setDescriptionLocalizations(cmdDesc.localizations)
        // Discord 側の表示/実行制御として ManageGuild を要求
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((subcommand) =>
          // 機能有効化
          subcommand
            .setName(BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.ENABLE)
            .setDescription(enableDesc.ja)
            .setDescriptionLocalizations(enableDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 機能無効化
          subcommand
            .setName(BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.DISABLE)
            .setDescription(disableDesc.ja)
            .setDescriptionLocalizations(disableDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // メンションロール設定
          subcommand
            .setName(BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.SET_MENTION)
            .setDescription(setMentionDesc.ja)
            .setDescriptionLocalizations(setMentionDesc.localizations)
            .addRoleOption((option) =>
              option
                .setName(BUMP_REMINDER_CONFIG_COMMAND.OPTION.ROLE)
                .setDescription(roleDesc.ja)
                .setDescriptionLocalizations(roleDesc.localizations)
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          // メンションロール削除
          subcommand
            .setName(BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.REMOVE_MENTION)
            .setDescription(removeMentionDesc.ja)
            .setDescriptionLocalizations(removeMentionDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 通知ユーザー削除
          subcommand
            .setName(
              BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.REMOVE_MENTION_USERS,
            )
            .setDescription(removeUsersDesc.ja)
            .setDescriptionLocalizations(removeUsersDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 設定リセット
          subcommand
            .setName(BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.RESET)
            .setDescription(resetDesc.ja)
            .setDescriptionLocalizations(resetDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 現在設定表示
          subcommand
            .setName(BUMP_REMINDER_CONFIG_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.ja)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
    );
  })(),

  /**
   * bump-reminder-config コマンド実行を features 側へ委譲する
   * @param interaction コマンド実行インタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction) {
    try {
      await executeBumpReminderConfigCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  cooldown: 3,
};
