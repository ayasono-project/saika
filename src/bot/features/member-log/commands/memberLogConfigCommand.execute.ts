// src/bot/features/member-log/commands/memberLogConfigCommand.execute.ts
// member-log-config コマンドのルーター

import { type ChatInputCommandInteraction } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { handleCommandError } from "../../../errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../shared/permissionGuards";
import { handleMemberLogConfigClearJoinMessage } from "./memberLogConfigCommand.clearJoinMessage";
import { handleMemberLogConfigClearLeaveMessage } from "./memberLogConfigCommand.clearLeaveMessage";
import { MEMBER_LOG_CONFIG_COMMAND } from "./memberLogConfigCommand.constants";
import { handleMemberLogConfigDisable } from "./memberLogConfigCommand.disable";
import { handleMemberLogConfigEnable } from "./memberLogConfigCommand.enable";
import { handleMemberLogConfigReset } from "./memberLogConfigCommand.reset";
import { handleMemberLogConfigSetChannel } from "./memberLogConfigCommand.setChannel";
import { handleMemberLogConfigSetJoinMessage } from "./memberLogConfigCommand.setJoinMessage";
import { handleMemberLogConfigSetLeaveMessage } from "./memberLogConfigCommand.setLeaveMessage";
import { handleMemberLogConfigView } from "./memberLogConfigCommand.view";

/**
 * member-log-config の実行入口
 * Guild/権限チェック後にサブコマンド処理へ振り分ける
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeMemberLogConfigCommand(
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
      case MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.SET_CHANNEL:
        await handleMemberLogConfigSetChannel(interaction, guildId);
        break;

      case MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.ENABLE:
        await handleMemberLogConfigEnable(interaction, guildId);
        break;

      case MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.DISABLE:
        await handleMemberLogConfigDisable(interaction, guildId);
        break;

      case MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.SET_JOIN_MESSAGE:
        await handleMemberLogConfigSetJoinMessage(interaction);
        break;

      case MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.SET_LEAVE_MESSAGE:
        await handleMemberLogConfigSetLeaveMessage(interaction);
        break;

      case MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.CLEAR_JOIN_MESSAGE:
        await handleMemberLogConfigClearJoinMessage(interaction, guildId);
        break;

      case MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.CLEAR_LEAVE_MESSAGE:
        await handleMemberLogConfigClearLeaveMessage(interaction, guildId);
        break;

      case MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.RESET:
        await handleMemberLogConfigReset(interaction, guildId);
        break;

      case MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.VIEW:
        await handleMemberLogConfigView(interaction, guildId);
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
