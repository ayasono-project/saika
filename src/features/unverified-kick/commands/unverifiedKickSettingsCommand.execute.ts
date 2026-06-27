// src/features/unverified-kick/commands/unverifiedKickSettingsCommand.execute.ts
// unverified-kick-settings コマンドのルーター

import { ValidationError } from "@ayasono/shared/core";
import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { handleCommandError } from "../../../bot/errors/interactionErrorHandler";
import { getBotUnverifiedKickSettingsService } from "../../../bot/services/botCompositionRoot";
import { COMMON_I18N_KEYS } from "../../../bot/shared/i18nKeys";
import { ensureManageGuildPermission } from "../../../bot/shared/permissionGuards";
import { getGuildTranslator } from "../../../shared/locale/helpers";
import {
  buildObsoleteUnverifiedKickNotice,
  detectObsoleteUnverifiedKickPlaceholders,
} from "../services/unverifiedKickObsoletePlaceholders";
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
  handleUnverifiedKickMentionDisable,
  handleUnverifiedKickMentionEnable,
  handleUnverifiedKickSetRunHour,
  handleUnverifiedKickSetTimezone,
} from "./unverifiedKickSettingsCommand.schedule";
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

const { SUBCOMMAND, GROUP, EXEMPT_SUBCOMMAND, MENTION_SUBCOMMAND } =
  UNVERIFIED_KICK_SETTINGS_COMMAND;

/** モーダルを表示するサブコマンド（返信スロットを消費するため followUp 不可） */
const MODAL_SUBCOMMANDS = new Set<string>([
  SUBCOMMAND.SET_DM_MESSAGE,
  SUBCOMMAND.SET_NOTIFY_MESSAGE,
]);

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

    const settings =
      await getBotUnverifiedKickSettingsService().getSettingsOrDefault(guildId);
    const obsolete = detectObsoleteUnverifiedKickPlaceholders(settings);

    let isModalCommand = false;
    const group = interaction.options.getSubcommandGroup(false);
    if (group === GROUP.EXEMPT) {
      const sub = interaction.options.getSubcommand();
      switch (sub) {
        case EXEMPT_SUBCOMMAND.ADD:
          await handleUnverifiedKickExemptAdd(interaction, guildId);
          break;
        case EXEMPT_SUBCOMMAND.REMOVE:
          await handleUnverifiedKickExemptRemove(interaction, guildId);
          break;
        case EXEMPT_SUBCOMMAND.LIST:
          await handleUnverifiedKickExemptList(interaction, guildId);
          break;
        default:
          throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
      }
    } else if (group === GROUP.MENTION) {
      const sub = interaction.options.getSubcommand();
      switch (sub) {
        case MENTION_SUBCOMMAND.ENABLE:
          await handleUnverifiedKickMentionEnable(interaction, guildId);
          break;
        case MENTION_SUBCOMMAND.DISABLE:
          await handleUnverifiedKickMentionDisable(interaction, guildId);
          break;
        default:
          throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
      }
    } else {
      const subcommand = interaction.options.getSubcommand();
      isModalCommand = MODAL_SUBCOMMANDS.has(subcommand);
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
          await handleUnverifiedKickSetDmMessage(
            interaction,
            settings.dmTemplate ?? undefined,
          );
          break;
        case SUBCOMMAND.CLEAR_DM_MESSAGE:
          await handleUnverifiedKickClearDmMessage(interaction, guildId);
          break;
        case SUBCOMMAND.SET_NOTIFY_MESSAGE:
          await handleUnverifiedKickSetNotifyMessage(
            interaction,
            settings.notifyTemplate ?? undefined,
          );
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
        case SUBCOMMAND.SET_TIMEZONE:
          await handleUnverifiedKickSetTimezone(interaction, guildId);
          break;
        case SUBCOMMAND.SET_RUN_HOUR:
          await handleUnverifiedKickSetRunHour(interaction, guildId);
          break;
        case SUBCOMMAND.RESET:
          await handleUnverifiedKickReset(interaction, guildId);
          break;
        default:
          throw ValidationError.fromKey(COMMON_I18N_KEYS.INVALID_SUBCOMMAND);
      }
    }

    // モーダルでないコマンドかつ廃止プレースホルダーがあれば ephemeral で案内を追送する
    if (!isModalCommand && obsolete.hasMarkerRole) {
      const t = await getGuildTranslator(guildId);
      const notice = buildObsoleteUnverifiedKickNotice(t, obsolete);
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
