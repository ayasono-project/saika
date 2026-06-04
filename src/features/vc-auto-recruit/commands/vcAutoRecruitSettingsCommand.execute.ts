// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.execute.ts
// vc-auto-recruit-settings コマンドのルーター

import { ValidationError } from "@ayasono/shared/core";
import { type ChatInputCommandInteraction } from "discord.js";
import { handleCommandError } from "../../../bot/errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { handleVcAutoRecruitSettingsClearMessage } from "./vcAutoRecruitSettingsCommand.clearMessage";
import { VC_AUTO_RECRUIT_SETTINGS_COMMAND } from "./vcAutoRecruitSettingsCommand.constants";
import { handleVcAutoRecruitSettingsDisable } from "./vcAutoRecruitSettingsCommand.disable";
import { handleVcAutoRecruitSettingsDisableCategory } from "./vcAutoRecruitSettingsCommand.disableCategory";
import { handleVcAutoRecruitSettingsEnable } from "./vcAutoRecruitSettingsCommand.enable";
import { handleVcAutoRecruitSettingsEnableCategory } from "./vcAutoRecruitSettingsCommand.enableCategory";
import { handleVcAutoRecruitSettingsReset } from "./vcAutoRecruitSettingsCommand.reset";
import { handleVcAutoRecruitSettingsSetChannel } from "./vcAutoRecruitSettingsCommand.setChannel";
import { handleVcAutoRecruitSettingsSetEmbed } from "./vcAutoRecruitSettingsCommand.setEmbed";
import { handleVcAutoRecruitSettingsSetMessage } from "./vcAutoRecruitSettingsCommand.setMessage";
import { handleVcAutoRecruitSettingsView } from "./vcAutoRecruitSettingsCommand.view";

/**
 * vc-auto-recruit-settings の実行入口
 * Guild/権限チェック後にサブコマンド処理へ振り分ける
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executeVcAutoRecruitSettingsCommand(
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
      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SET_CHANNEL:
        await handleVcAutoRecruitSettingsSetChannel(interaction, guildId);
        break;

      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.ENABLE:
        await handleVcAutoRecruitSettingsEnable(interaction, guildId);
        break;

      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.DISABLE:
        await handleVcAutoRecruitSettingsDisable(interaction, guildId);
        break;

      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SET_MESSAGE:
        await handleVcAutoRecruitSettingsSetMessage(interaction);
        break;

      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.CLEAR_MESSAGE:
        await handleVcAutoRecruitSettingsClearMessage(interaction, guildId);
        break;

      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SET_EMBED:
        await handleVcAutoRecruitSettingsSetEmbed(interaction, guildId);
        break;

      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.ENABLE_CATEGORY:
        await handleVcAutoRecruitSettingsEnableCategory(interaction, guildId);
        break;

      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.DISABLE_CATEGORY:
        await handleVcAutoRecruitSettingsDisableCategory(interaction, guildId);
        break;

      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.VIEW:
        await handleVcAutoRecruitSettingsView(interaction, guildId);
        break;

      case VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.RESET:
        await handleVcAutoRecruitSettingsReset(interaction, guildId);
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
