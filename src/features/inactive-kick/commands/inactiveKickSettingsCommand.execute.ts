// src/features/inactive-kick/commands/inactiveKickSettingsCommand.execute.ts
// inactive-kick-settings コマンドのルーター

import { ValidationError } from "@ayasono/shared/core";
import type { ChatInputCommandInteraction } from "discord.js";
import { handleCommandError } from "../../../bot/errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "./inactiveKickSettingsCommand.constants";
import {
  handleInactiveKickClearMarkerRole,
  handleInactiveKickSetMarkerRole,
} from "./inactiveKickSettingsCommand.markerRole";
import {
  handleInactiveKickClearKickMessage,
  handleInactiveKickClearWarnMessage,
  handleInactiveKickSetKickMessage,
  handleInactiveKickSetWarnMessage,
} from "./inactiveKickSettingsCommand.messages";
import { handleInactiveKickPreview } from "./inactiveKickSettingsCommand.preview";
import { handleInactiveKickReset } from "./inactiveKickSettingsCommand.reset";
import {
  handleInactiveKickDisable,
  handleInactiveKickEnable,
  handleInactiveKickSetChannel,
  handleInactiveKickSetThreshold,
} from "./inactiveKickSettingsCommand.simple";
import { handleInactiveKickView } from "./inactiveKickSettingsCommand.view";
import {
  handleInactiveKickWhitelistAdd,
  handleInactiveKickWhitelistList,
  handleInactiveKickWhitelistRemove,
} from "./inactiveKickSettingsCommand.whitelist";

const { SUBCOMMAND, GROUP, WHITELIST_SUBCOMMAND } =
  INACTIVE_KICK_SETTINGS_COMMAND;

/**
 * inactive-kick-settings の実行入口。
 * Guild/権限チェック後にサブコマン��処理へ振り分ける。
 * @param interaction コマンド実行インタラクション
 */
export async function executeInactiveKickSettingsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }
    ensureManageGuildPermission(interaction);

    // whitelist サブコマンドグループ
    const group = interaction.options.getSubcommandGroup(false);
    if (group === GROUP.WHITELIST) {
      const sub = interaction.options.getSubcommand();
      switch (sub) {
        case WHITELIST_SUBCOMMAND.ADD:
          await handleInactiveKickWhitelistAdd(interaction, guildId);
          return;
        case WHITELIST_SUBCOMMAND.REMOVE:
          await handleInactiveKickWhitelistRemove(interaction, guildId);
          return;
        case WHITELIST_SUBCOMMAND.LIST:
          await handleInactiveKickWhitelistList(interaction, guildId);
          return;
        default:
          throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
      }
    }

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case SUBCOMMAND.SET_CHANNEL:
        await handleInactiveKickSetChannel(interaction, guildId);
        break;
      case SUBCOMMAND.SET_THRESHOLD:
        await handleInactiveKickSetThreshold(interaction, guildId);
        break;
      case SUBCOMMAND.ENABLE:
        await handleInactiveKickEnable(interaction, guildId);
        break;
      case SUBCOMMAND.DISABLE:
        await handleInactiveKickDisable(interaction, guildId);
        break;
      case SUBCOMMAND.SET_WARN_MESSAGE:
        await handleInactiveKickSetWarnMessage(interaction);
        break;
      case SUBCOMMAND.CLEAR_WARN_MESSAGE:
        await handleInactiveKickClearWarnMessage(interaction, guildId);
        break;
      case SUBCOMMAND.SET_KICK_MESSAGE:
        await handleInactiveKickSetKickMessage(interaction);
        break;
      case SUBCOMMAND.CLEAR_KICK_MESSAGE:
        await handleInactiveKickClearKickMessage(interaction, guildId);
        break;
      case SUBCOMMAND.SET_MARKER_ROLE:
        await handleInactiveKickSetMarkerRole(interaction, guildId);
        break;
      case SUBCOMMAND.CLEAR_MARKER_ROLE:
        await handleInactiveKickClearMarkerRole(interaction, guildId);
        break;
      case SUBCOMMAND.PREVIEW:
        await handleInactiveKickPreview(interaction, guildId);
        break;
      case SUBCOMMAND.VIEW:
        await handleInactiveKickView(interaction, guildId);
        break;
      case SUBCOMMAND.RESET:
        await handleInactiveKickReset(interaction, guildId);
        break;
      default:
        throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
