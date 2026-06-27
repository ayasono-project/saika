// src/bot/features/member-log/commands/memberLogSettingsCommand.execute.ts
// member-log-settings コマンドのルーター

import { ValidationError } from "@ayasono/shared/core";
import { type ChatInputCommandInteraction } from "discord.js";
import { handleCommandError } from "../../../bot/errors/interactionErrorHandler";
import { getBotMemberLogSettingsService } from "../../../bot/services/botCompositionRoot";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { handleMemberLogSettingsClearJoinMessage } from "./memberLogSettingsCommand.clearJoinMessage";
import { handleMemberLogSettingsClearLeaveMessage } from "./memberLogSettingsCommand.clearLeaveMessage";
import { MEMBER_LOG_SETTINGS_COMMAND } from "./memberLogSettingsCommand.constants";
import { handleMemberLogSettingsDisable } from "./memberLogSettingsCommand.disable";
import { handleMemberLogSettingsEnable } from "./memberLogSettingsCommand.enable";
import { handleMemberLogSettingsReset } from "./memberLogSettingsCommand.reset";
import { handleMemberLogSettingsSetChannel } from "./memberLogSettingsCommand.setChannel";
import { handleMemberLogSettingsSetJoinMessage } from "./memberLogSettingsCommand.setJoinMessage";
import { handleMemberLogSettingsSetLeaveMessage } from "./memberLogSettingsCommand.setLeaveMessage";
import { handleMemberLogSettingsView } from "./memberLogSettingsCommand.view";

/**
 * member-log-settings の実行入口
 * Guild/権限チェック後にサブコマンド処理へ振り分ける
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeMemberLogSettingsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    // Guild外実行は対象外
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }

    // 管理権限を統一ガードで検証
    ensureManageGuildPermission(interaction);

    // サブコマンドごとに機能別ハンドラへ委譲
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.SET_CHANNEL:
        await handleMemberLogSettingsSetChannel(interaction, guildId);
        break;

      case MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.ENABLE:
        await handleMemberLogSettingsEnable(interaction, guildId);
        break;

      case MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.DISABLE:
        await handleMemberLogSettingsDisable(interaction, guildId);
        break;

      case MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.SET_JOIN_MESSAGE: {
        const s =
          await getBotMemberLogSettingsService().getMemberLogSettingsOrDefault(
            guildId,
          );
        await handleMemberLogSettingsSetJoinMessage(
          interaction,
          s.joinMessage ?? undefined,
        );
        break;
      }

      case MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.SET_LEAVE_MESSAGE: {
        const s =
          await getBotMemberLogSettingsService().getMemberLogSettingsOrDefault(
            guildId,
          );
        await handleMemberLogSettingsSetLeaveMessage(
          interaction,
          s.leaveMessage ?? undefined,
        );
        break;
      }

      case MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.CLEAR_JOIN_MESSAGE:
        await handleMemberLogSettingsClearJoinMessage(interaction, guildId);
        break;

      case MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.CLEAR_LEAVE_MESSAGE:
        await handleMemberLogSettingsClearLeaveMessage(interaction, guildId);
        break;

      case MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.RESET:
        await handleMemberLogSettingsReset(interaction, guildId);
        break;

      case MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.VIEW:
        await handleMemberLogSettingsView(interaction, guildId);
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
