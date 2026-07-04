// src/bot/commands/inactive-kick-settings.ts
// 非アクティブ自動キック機能の設定コマンド定義

import {
  ChannelType,
  InteractionContextType,
  PermissionFlagsBits,
} from "discord.js";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "../../features/inactive-kick/commands/inactiveKickSettingsCommand.constants";
import { executeInactiveKickSettingsCommand } from "../../features/inactive-kick/commands/inactiveKickSettingsCommand.execute";
import {
  INACTIVE_KICK_THRESHOLD_MAX_DAYS,
  INACTIVE_KICK_THRESHOLD_MIN_DAYS,
  INACTIVE_KICK_TIER_TENURE_MIN_DAYS,
} from "../../features/inactive-kick/inactiveKickSettingsDefaults";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import type { InactiveKickTranslations } from "../../shared/locale/locales/ja/features/inactiveKick";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { createSlashCommand } from "../shared/createSlashCommand";
import type { Command } from "../types/discord";

const {
  SUBCOMMAND,
  GROUP,
  WHITELIST_SUBCOMMAND,
  MENTION_SUBCOMMAND,
  TIER_SUBCOMMAND,
  OPTION,
} = INACTIVE_KICK_SETTINGS_COMMAND;

/**
 * 非アクティブ自動キック設定コマンド（サーバー管理権限専用）
 */
export const inactiveKickSettingsCommand: Command = {
  data: (() => {
    // 各ロケール文言を解決するヘルパー
    const desc = (key: keyof InactiveKickTranslations) =>
      getCommandLocalizations("inactiveKick", key);

    const cmdDesc = desc("inactive-kick-settings.description");

    return createSlashCommand()
      .setName(INACTIVE_KICK_SETTINGS_COMMAND.NAME)
      .setDescription(cmdDesc.base)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .setContexts(InteractionContextType.Guild)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.set-channel.description");
        const od = desc(
          "inactive-kick-settings.set-channel.channel.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_CHANNEL)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations)
          .addChannelOption((o) =>
            o
              .setName(OPTION.CHANNEL)
              .setDescription(od.base)
              .setDescriptionLocalizations(od.localizations)
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true),
          );
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.enable.description");
        return sub
          .setName(SUBCOMMAND.ENABLE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.disable.description");
        return sub
          .setName(SUBCOMMAND.DISABLE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "inactive-kick-settings.set-week-warn-message.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_WEEK_WARN_MESSAGE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "inactive-kick-settings.clear-week-warn-message.description",
        );
        return sub
          .setName(SUBCOMMAND.CLEAR_WEEK_WARN_MESSAGE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "inactive-kick-settings.set-final-warn-message.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_FINAL_WARN_MESSAGE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "inactive-kick-settings.clear-final-warn-message.description",
        );
        return sub
          .setName(SUBCOMMAND.CLEAR_FINAL_WARN_MESSAGE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.set-kick-message.description");
        return sub
          .setName(SUBCOMMAND.SET_KICK_MESSAGE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.clear-kick-message.description");
        return sub
          .setName(SUBCOMMAND.CLEAR_KICK_MESSAGE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.set-marker-role.description");
        const od = desc(
          "inactive-kick-settings.set-marker-role.role.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_MARKER_ROLE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations)
          .addRoleOption((o) =>
            o
              .setName(OPTION.ROLE)
              .setDescription(od.base)
              .setDescriptionLocalizations(od.localizations)
              .setRequired(true),
          );
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.clear-marker-role.description");
        return sub
          .setName(SUBCOMMAND.CLEAR_MARKER_ROLE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.preview.description");
        return sub
          .setName(SUBCOMMAND.PREVIEW)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.view.description");
        return sub
          .setName(SUBCOMMAND.VIEW)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.reset.description");
        return sub
          .setName(SUBCOMMAND.RESET)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.set-timezone.description");
        return sub
          .setName(SUBCOMMAND.SET_TIMEZONE)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.set-run-hour.description");
        return sub
          .setName(SUBCOMMAND.SET_RUN_HOUR)
          .setDescription(d.base)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommandGroup((group) => {
        const gd = desc("inactive-kick-settings.mention.description");
        const enableD = desc(
          "inactive-kick-settings.mention.enable.description",
        );
        const disableD = desc(
          "inactive-kick-settings.mention.disable.description",
        );
        return group
          .setName(GROUP.MENTION)
          .setDescription(gd.base)
          .setDescriptionLocalizations(gd.localizations)
          .addSubcommand((sub) =>
            sub
              .setName(MENTION_SUBCOMMAND.ENABLE)
              .setDescription(enableD.base)
              .setDescriptionLocalizations(enableD.localizations),
          )
          .addSubcommand((sub) =>
            sub
              .setName(MENTION_SUBCOMMAND.DISABLE)
              .setDescription(disableD.base)
              .setDescriptionLocalizations(disableD.localizations),
          );
      })
      .addSubcommandGroup((group) => {
        const gd = desc("inactive-kick-settings.whitelist.description");
        const addD = desc("inactive-kick-settings.whitelist.add.description");
        const addRole = desc(
          "inactive-kick-settings.whitelist.add.role.description",
        );
        const addUser = desc(
          "inactive-kick-settings.whitelist.add.user.description",
        );
        const rmD = desc("inactive-kick-settings.whitelist.remove.description");
        const listD = desc("inactive-kick-settings.whitelist.list.description");
        return group
          .setName(GROUP.WHITELIST)
          .setDescription(gd.base)
          .setDescriptionLocalizations(gd.localizations)
          .addSubcommand((sub) =>
            sub
              .setName(WHITELIST_SUBCOMMAND.ADD)
              .setDescription(addD.base)
              .setDescriptionLocalizations(addD.localizations)
              .addRoleOption((o) =>
                o
                  .setName(OPTION.ROLE)
                  .setDescription(addRole.base)
                  .setDescriptionLocalizations(addRole.localizations),
              )
              .addUserOption((o) =>
                o
                  .setName(OPTION.USER)
                  .setDescription(addUser.base)
                  .setDescriptionLocalizations(addUser.localizations),
              ),
          )
          .addSubcommand((sub) =>
            // remove は登録済み項目をセレクトメニューで複数選択するためオプションなし
            sub
              .setName(WHITELIST_SUBCOMMAND.REMOVE)
              .setDescription(rmD.base)
              .setDescriptionLocalizations(rmD.localizations),
          )
          .addSubcommand((sub) =>
            sub
              .setName(WHITELIST_SUBCOMMAND.LIST)
              .setDescription(listD.base)
              .setDescriptionLocalizations(listD.localizations),
          );
      })
      .addSubcommandGroup((group) => {
        const gd = desc("inactive-kick-settings.tier.description");
        const setD = desc("inactive-kick-settings.tier.set.description");
        const setTenureD = desc(
          "inactive-kick-settings.tier.set.tenure-days.description",
        );
        const setThresholdD = desc(
          "inactive-kick-settings.tier.set.threshold-days.description",
        );
        const setTrackMessageD = desc(
          "inactive-kick-settings.tier.set.track-message.description",
        );
        const setTrackVoiceD = desc(
          "inactive-kick-settings.tier.set.track-voice.description",
        );
        const setTrackReactionD = desc(
          "inactive-kick-settings.tier.set.track-reaction.description",
        );
        const setMinMessageD = desc(
          "inactive-kick-settings.tier.set.min-message-count.description",
        );
        const setMinVoiceD = desc(
          "inactive-kick-settings.tier.set.min-voice-count.description",
        );
        const setMinReactionD = desc(
          "inactive-kick-settings.tier.set.min-reaction-count.description",
        );
        const setTenureDeadlineD = desc(
          "inactive-kick-settings.tier.set.tenure-deadline.description",
        );
        const rmD = desc("inactive-kick-settings.tier.remove.description");
        const listD = desc("inactive-kick-settings.tier.list.description");
        return group
          .setName(GROUP.TIER)
          .setDescription(gd.base)
          .setDescriptionLocalizations(gd.localizations)
          .addSubcommand((sub) =>
            sub
              .setName(TIER_SUBCOMMAND.SET)
              .setDescription(setD.base)
              .setDescriptionLocalizations(setD.localizations)
              .addIntegerOption((o) =>
                o
                  .setName(OPTION.TENURE_DAYS)
                  .setDescription(setTenureD.base)
                  .setDescriptionLocalizations(setTenureD.localizations)
                  .setMinValue(INACTIVE_KICK_TIER_TENURE_MIN_DAYS)
                  .setRequired(true),
              )
              .addIntegerOption((o) =>
                o
                  .setName(OPTION.THRESHOLD_DAYS)
                  .setDescription(setThresholdD.base)
                  .setDescriptionLocalizations(setThresholdD.localizations)
                  .setMinValue(INACTIVE_KICK_THRESHOLD_MIN_DAYS)
                  .setMaxValue(INACTIVE_KICK_THRESHOLD_MAX_DAYS)
                  .setRequired(true),
              )
              .addBooleanOption((o) =>
                o
                  .setName(OPTION.TRACK_MESSAGE)
                  .setDescription(setTrackMessageD.base)
                  .setDescriptionLocalizations(setTrackMessageD.localizations),
              )
              .addBooleanOption((o) =>
                o
                  .setName(OPTION.TRACK_VOICE)
                  .setDescription(setTrackVoiceD.base)
                  .setDescriptionLocalizations(setTrackVoiceD.localizations),
              )
              .addBooleanOption((o) =>
                o
                  .setName(OPTION.TRACK_REACTION)
                  .setDescription(setTrackReactionD.base)
                  .setDescriptionLocalizations(setTrackReactionD.localizations),
              )
              .addIntegerOption((o) =>
                o
                  .setName(OPTION.MIN_MESSAGE_COUNT)
                  .setDescription(setMinMessageD.base)
                  .setDescriptionLocalizations(setMinMessageD.localizations)
                  .setMinValue(0),
              )
              .addIntegerOption((o) =>
                o
                  .setName(OPTION.MIN_VOICE_COUNT)
                  .setDescription(setMinVoiceD.base)
                  .setDescriptionLocalizations(setMinVoiceD.localizations)
                  .setMinValue(0),
              )
              .addIntegerOption((o) =>
                o
                  .setName(OPTION.MIN_REACTION_COUNT)
                  .setDescription(setMinReactionD.base)
                  .setDescriptionLocalizations(setMinReactionD.localizations)
                  .setMinValue(0),
              )
              .addBooleanOption((o) =>
                o
                  .setName(OPTION.TENURE_DEADLINE)
                  .setDescription(setTenureDeadlineD.base)
                  .setDescriptionLocalizations(
                    setTenureDeadlineD.localizations,
                  ),
              ),
          )
          .addSubcommand((sub) =>
            // remove は登録済み階層をセレクトメニューで複数選択するためオプションなし
            sub
              .setName(TIER_SUBCOMMAND.REMOVE)
              .setDescription(rmD.base)
              .setDescriptionLocalizations(rmD.localizations),
          )
          .addSubcommand((sub) =>
            sub
              .setName(TIER_SUBCOMMAND.LIST)
              .setDescription(listD.base)
              .setDescriptionLocalizations(listD.localizations),
          );
      });
  })(),

  /**
   * inactive-kick-settings コマンドの実行入口
   * @param interaction コマンド実行インタラクション
   */
  async execute(interaction) {
    try {
      await executeInactiveKickSettingsCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
