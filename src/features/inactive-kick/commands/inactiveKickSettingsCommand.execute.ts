// src/features/inactive-kick/commands/inactiveKickSettingsCommand.execute.ts
// inactive-kick-settings コマンドのルーター

import { ValidationError } from "@ayasono/shared/core";
import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { handleCommandError } from "../../../bot/errors/interactionErrorHandler";
import { getBotInactiveKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { getGuildTranslator } from "../../../shared/locale/helpers";
import {
  buildObsoleteInactiveKickNotice,
  detectObsoleteInactiveKickPlaceholders,
} from "../services/inactiveKickObsoletePlaceholders";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "./inactiveKickSettingsCommand.constants";
import {
  handleInactiveKickClearMarkerRole,
  handleInactiveKickSetMarkerRole,
} from "./inactiveKickSettingsCommand.markerRole";
import {
  handleInactiveKickClearFinalWarnMessage,
  handleInactiveKickClearKickMessage,
  handleInactiveKickClearWeekWarnMessage,
  handleInactiveKickSetFinalWarnMessage,
  handleInactiveKickSetKickMessage,
  handleInactiveKickSetWeekWarnMessage,
} from "./inactiveKickSettingsCommand.messages";
import { handleInactiveKickPreview } from "./inactiveKickSettingsCommand.preview";
import { handleInactiveKickReset } from "./inactiveKickSettingsCommand.reset";
import {
  handleInactiveKickMentionDisable,
  handleInactiveKickMentionEnable,
  handleInactiveKickSetRunHour,
  handleInactiveKickSetTimezone,
} from "./inactiveKickSettingsCommand.schedule";
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

const { SUBCOMMAND, GROUP, WHITELIST_SUBCOMMAND, MENTION_SUBCOMMAND } =
  INACTIVE_KICK_SETTINGS_COMMAND;

/** モーダルを表示するサブコマンド（返信スロットを消費するため followUp 不可） */
const MODAL_SUBCOMMANDS = new Set<string>([
  SUBCOMMAND.SET_WEEK_WARN_MESSAGE,
  SUBCOMMAND.SET_FINAL_WARN_MESSAGE,
  SUBCOMMAND.SET_KICK_MESSAGE,
]);

/**
 * inactive-kick-settings の実行入口。
 * Guild/権限チェック後にサブコマンド処理へ振り分ける。
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

    const settings =
      await getBotInactiveKickSettingsService().getSettingsOrDefault(guildId);
    const obsolete = detectObsoleteInactiveKickPlaceholders(settings);

    let isModalCommand = false;
    const group = interaction.options.getSubcommandGroup(false);
    if (group === GROUP.WHITELIST) {
      const sub = interaction.options.getSubcommand();
      switch (sub) {
        case WHITELIST_SUBCOMMAND.ADD:
          await handleInactiveKickWhitelistAdd(interaction, guildId);
          break;
        case WHITELIST_SUBCOMMAND.REMOVE:
          await handleInactiveKickWhitelistRemove(interaction, guildId);
          break;
        case WHITELIST_SUBCOMMAND.LIST:
          await handleInactiveKickWhitelistList(interaction, guildId);
          break;
        default:
          throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
      }
    } else if (group === GROUP.MENTION) {
      const sub = interaction.options.getSubcommand();
      switch (sub) {
        case MENTION_SUBCOMMAND.ENABLE:
          await handleInactiveKickMentionEnable(interaction, guildId);
          break;
        case MENTION_SUBCOMMAND.DISABLE:
          await handleInactiveKickMentionDisable(interaction, guildId);
          break;
        default:
          throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
      }
    } else {
      const subcommand = interaction.options.getSubcommand();
      isModalCommand = MODAL_SUBCOMMANDS.has(subcommand);
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
        case SUBCOMMAND.SET_WEEK_WARN_MESSAGE:
          await handleInactiveKickSetWeekWarnMessage(
            interaction,
            settings.weekWarnMessage ?? undefined,
          );
          break;
        case SUBCOMMAND.CLEAR_WEEK_WARN_MESSAGE:
          await handleInactiveKickClearWeekWarnMessage(interaction, guildId);
          break;
        case SUBCOMMAND.SET_FINAL_WARN_MESSAGE:
          await handleInactiveKickSetFinalWarnMessage(
            interaction,
            settings.finalWarnMessage ?? undefined,
          );
          break;
        case SUBCOMMAND.CLEAR_FINAL_WARN_MESSAGE:
          await handleInactiveKickClearFinalWarnMessage(interaction, guildId);
          break;
        case SUBCOMMAND.SET_KICK_MESSAGE:
          await handleInactiveKickSetKickMessage(
            interaction,
            settings.kickMessage ?? undefined,
          );
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
        case SUBCOMMAND.SET_TIMEZONE:
          await handleInactiveKickSetTimezone(interaction, guildId);
          break;
        case SUBCOMMAND.SET_RUN_HOUR:
          await handleInactiveKickSetRunHour(interaction, guildId);
          break;
        case SUBCOMMAND.RESET:
          await handleInactiveKickReset(interaction, guildId);
          break;
        default:
          throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
      }
    }

    // モーダルでないコマンドかつ廃止プレースホルダーがあれば ephemeral で案内を追送する
    if (!isModalCommand && (obsolete.hasDaysLeft || obsolete.hasMarkerRole)) {
      const t = await getGuildTranslator(guildId);
      const notice = buildObsoleteInactiveKickNotice(t, obsolete);
      if (notice) {
        await interaction
          .followUp({ embeds: [notice], flags: MessageFlags.Ephemeral })
          .catch(() => {});
      }
    }
  } catch (error) {
    await handleCommandError(interaction, error);
  }
}
