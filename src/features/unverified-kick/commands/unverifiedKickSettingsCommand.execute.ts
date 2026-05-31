// src/features/unverified-kick/commands/unverifiedKickSettingsCommand.execute.ts
// unverified-kick-settings コマンドのルーター

import { ValidationError } from "@ayasono/shared/core";
import type { ChatInputCommandInteraction } from "discord.js";
import { handleCommandError } from "../../../bot/errors/interactionErrorHandler";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { UNVERIFIED_KICK_SETTINGS_COMMAND } from "./unverifiedKickSettingsCommand.constants";
import {
  handleUnverifiedKickClearDmMessage,
  handleUnverifiedKickClearNotifyMessage,
  handleUnverifiedKickSetDmMessage,
  handleUnverifiedKickSetNotifyMessage,
} from "./unverifiedKickSettingsCommand.dmMessage";
import {
  handleUnverifiedKickExemptAdd,
  handleUnverifiedKickExemptList,
  handleUnverifiedKickExemptRemove,
} from "./unverifiedKickSettingsCommand.exempt";
import {
  handleUnverifiedKickClearMarkerRole,
  handleUnverifiedKickSetMarkerRole,
} from "./unverifiedKickSettingsCommand.markerRole";
import { handleUnverifiedKickPreview } from "./unverifiedKickSettingsCommand.preview";
import { handleUnverifiedKickReset } from "./unverifiedKickSettingsCommand.reset";
import {
  handleUnverifiedKickClearLogChannel,
  handleUnverifiedKickClearNotifyChannel,
  handleUnverifiedKickClearWarnDays,
  handleUnverifiedKickDisable,
  handleUnverifiedKickEnable,
  handleUnverifiedKickSetGraceDays,
  handleUnverifiedKickSetLogChannel,
  handleUnverifiedKickSetNotifyChannel,
  handleUnverifiedKickSetVerifiedRole,
  handleUnverifiedKickSetWarnDays,
} from "./unverifiedKickSettingsCommand.simple";
import { handleUnverifiedKickView } from "./unverifiedKickSettingsCommand.view";

const { SUBCOMMAND, GROUP, EXEMPT_SUBCOMMAND } =
  UNVERIFIED_KICK_SETTINGS_COMMAND;

/**
 * unverified-kick-settings の実行入口。
 * Guild/権限チェック後にサブコマンド処理へ振り分ける。
 * @param interaction コマンド実行インタラクション
 */
export async function executeUnverifiedKickSettingsCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  try {
    const guildId = interaction.guildId;
    if (!guildId) {
      throw ValidationError.fromKey(COMMON_I18N_KEYS.GUILD_ONLY);
    }
    ensureManageGuildPermission(interaction);

    // exempt サブコマンドグループ
    const group = interaction.options.getSubcommandGroup(false);
    if (group === GROUP.EXEMPT) {
      const sub = interaction.options.getSubcommand();
      switch (sub) {
        case EXEMPT_SUBCOMMAND.ADD:
          await handleUnverifiedKickExemptAdd(interaction, guildId);
          return;
        case EXEMPT_SUBCOMMAND.REMOVE:
          await handleUnverifiedKickExemptRemove(interaction, guildId);
          return;
        case EXEMPT_SUBCOMMAND.LIST:
          await handleUnverifiedKickExemptList(interaction, guildId);
          return;
        default:
          throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
      }
    }

    const subcommand = interaction.options.getSubcommand();
    switch (subcommand) {
      case SUBCOMMAND.SET_VERIFIED_ROLE:
        await handleUnverifiedKickSetVerifiedRole(interaction, guildId);
        break;
      case SUBCOMMAND.SET_GRACE_DAYS:
        await handleUnverifiedKickSetGraceDays(interaction, guildId);
        break;
      case SUBCOMMAND.SET_WARN_DAYS:
        await handleUnverifiedKickSetWarnDays(interaction, guildId);
        break;
      case SUBCOMMAND.CLEAR_WARN_DAYS:
        await handleUnverifiedKickClearWarnDays(interaction, guildId);
        break;
      case SUBCOMMAND.SET_NOTIFY_CHANNEL:
        await handleUnverifiedKickSetNotifyChannel(interaction, guildId);
        break;
      case SUBCOMMAND.CLEAR_NOTIFY_CHANNEL:
        await handleUnverifiedKickClearNotifyChannel(interaction, guildId);
        break;
      case SUBCOMMAND.SET_LOG_CHANNEL:
        await handleUnverifiedKickSetLogChannel(interaction, guildId);
        break;
      case SUBCOMMAND.CLEAR_LOG_CHANNEL:
        await handleUnverifiedKickClearLogChannel(interaction, guildId);
        break;
      case SUBCOMMAND.SET_MARKER_ROLE:
        await handleUnverifiedKickSetMarkerRole(interaction, guildId);
        break;
      case SUBCOMMAND.CLEAR_MARKER_ROLE:
        await handleUnverifiedKickClearMarkerRole(interaction, guildId);
        break;
      case SUBCOMMAND.SET_DM_MESSAGE:
        await handleUnverifiedKickSetDmMessage(interaction);
        break;
      case SUBCOMMAND.CLEAR_DM_MESSAGE:
        await handleUnverifiedKickClearDmMessage(interaction, guildId);
        break;
      case SUBCOMMAND.SET_NOTIFY_MESSAGE:
        await handleUnverifiedKickSetNotifyMessage(interaction);
        break;
      case SUBCOMMAND.CLEAR_NOTIFY_MESSAGE:
        await handleUnverifiedKickClearNotifyMessage(interaction, guildId);
        break;
      case SUBCOMMAND.ENABLE:
        await handleUnverifiedKickEnable(interaction, guildId);
        break;
      case SUBCOMMAND.DISABLE:
        await handleUnverifiedKickDisable(interaction, guildId);
        break;
      case SUBCOMMAND.PREVIEW:
        await handleUnverifiedKickPreview(interaction, guildId);
        break;
      case SUBCOMMAND.VIEW:
        await handleUnverifiedKickView(interaction, guildId);
        break;
      case SUBCOMMAND.RESET:
        await handleUnverifiedKickReset(interaction, guildId);
        break;
      default:
        throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
