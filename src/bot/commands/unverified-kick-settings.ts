// src/bot/commands/unverified-kick-settings.ts
// 未承認ユーザー自動キック機能の設定コマンド定義

import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { UNVERIFIED_KICK_SETTINGS_COMMAND } from "../../features/unverified-kick/commands/unverifiedKickSettingsCommand.constants";
import { executeUnverifiedKickSettingsCommand } from "../../features/unverified-kick/commands/unverifiedKickSettingsCommand.execute";
import {
  UNVERIFIED_KICK_GRACE_MAX_DAYS,
  UNVERIFIED_KICK_GRACE_MIN_DAYS,
  UNVERIFIED_KICK_WARN_MIN_DAYS,
} from "../../features/unverified-kick/unverifiedKickSettingsDefaults";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import type { UnverifiedKickTranslations } from "../../shared/locale/locales/ja/features/unverifiedKick";
import { handleCommandError } from "../errors/interactionErrorHandler";
import type { Command } from "../types/discord";

const { SUBCOMMAND, GROUP, EXEMPT_SUBCOMMAND, OPTION } =
  UNVERIFIED_KICK_SETTINGS_COMMAND;

/** 警告日数オプションの最大値（猶予の最大 - 1） */
const WARN_DAYS_MAX = UNVERIFIED_KICK_GRACE_MAX_DAYS - 1;

/**
 * 未承認ユーザー自動キック設定コマンド（サーバー管理権限専用）
 */
export const unverifiedKickSettingsCommand: Command = {
  data: (() => {
    // 各ロケール文言を解決するヘルパー
    const desc = (key: keyof UnverifiedKickTranslations) =>
      getCommandLocalizations("unverifiedKick", key);

    const cmdDesc = desc("unverified-kick-settings.description");

    return new SlashCommandBuilder()
      .setName(UNVERIFIED_KICK_SETTINGS_COMMAND.NAME)
      .setDescription(cmdDesc.ja)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((sub) => {
        const d = desc(
          "unverified-kick-settings.set-verified-role.description",
        );
        const od = desc(
          "unverified-kick-settings.set-verified-role.role.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_VERIFIED_ROLE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations)
          .addRoleOption((o) =>
            o
              .setName(OPTION.ROLE)
              .setDescription(od.ja)
              .setDescriptionLocalizations(od.localizations)
              .setRequired(true),
          );
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.set-grace-days.description");
        const od = desc(
          "unverified-kick-settings.set-grace-days.days.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_GRACE_DAYS)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations)
          .addIntegerOption((o) =>
            o
              .setName(OPTION.DAYS)
              .setDescription(od.ja)
              .setDescriptionLocalizations(od.localizations)
              .setMinValue(UNVERIFIED_KICK_GRACE_MIN_DAYS)
              .setMaxValue(UNVERIFIED_KICK_GRACE_MAX_DAYS)
              .setRequired(true),
          );
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.set-warn-days.description");
        const od = desc(
          "unverified-kick-settings.set-warn-days.days.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_WARN_DAYS)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations)
          .addIntegerOption((o) =>
            o
              .setName(OPTION.DAYS)
              .setDescription(od.ja)
              .setDescriptionLocalizations(od.localizations)
              .setMinValue(UNVERIFIED_KICK_WARN_MIN_DAYS)
              .setMaxValue(WARN_DAYS_MAX)
              .setRequired(true),
          );
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.clear-warn-days.description");
        return sub
          .setName(SUBCOMMAND.CLEAR_WARN_DAYS)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "unverified-kick-settings.set-notify-channel.description",
        );
        const od = desc(
          "unverified-kick-settings.set-notify-channel.channel.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_NOTIFY_CHANNEL)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations)
          .addChannelOption((o) =>
            o
              .setName(OPTION.CHANNEL)
              .setDescription(od.ja)
              .setDescriptionLocalizations(od.localizations)
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true),
          );
      })
      .addSubcommand((sub) => {
        const d = desc(
          "unverified-kick-settings.clear-notify-channel.description",
        );
        return sub
          .setName(SUBCOMMAND.CLEAR_NOTIFY_CHANNEL)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.set-log-channel.description");
        const od = desc(
          "unverified-kick-settings.set-log-channel.channel.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_LOG_CHANNEL)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations)
          .addChannelOption((o) =>
            o
              .setName(OPTION.CHANNEL)
              .setDescription(od.ja)
              .setDescriptionLocalizations(od.localizations)
              .addChannelTypes(ChannelType.GuildText)
              .setRequired(true),
          );
      })
      .addSubcommand((sub) => {
        const d = desc(
          "unverified-kick-settings.clear-log-channel.description",
        );
        return sub
          .setName(SUBCOMMAND.CLEAR_LOG_CHANNEL)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.set-marker-role.description");
        const od = desc(
          "unverified-kick-settings.set-marker-role.role.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_MARKER_ROLE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations)
          .addRoleOption((o) =>
            o
              .setName(OPTION.ROLE)
              .setDescription(od.ja)
              .setDescriptionLocalizations(od.localizations)
              .setRequired(true),
          );
      })
      .addSubcommand((sub) => {
        const d = desc(
          "unverified-kick-settings.clear-marker-role.description",
        );
        return sub
          .setName(SUBCOMMAND.CLEAR_MARKER_ROLE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.set-dm-message.description");
        return sub
          .setName(SUBCOMMAND.SET_DM_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.clear-dm-message.description");
        return sub
          .setName(SUBCOMMAND.CLEAR_DM_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "unverified-kick-settings.set-notify-message.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_NOTIFY_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "unverified-kick-settings.clear-notify-message.description",
        );
        return sub
          .setName(SUBCOMMAND.CLEAR_NOTIFY_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.enable.description");
        return sub
          .setName(SUBCOMMAND.ENABLE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.disable.description");
        return sub
          .setName(SUBCOMMAND.DISABLE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.preview.description");
        return sub
          .setName(SUBCOMMAND.PREVIEW)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.view.description");
        return sub
          .setName(SUBCOMMAND.VIEW)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("unverified-kick-settings.reset.description");
        return sub
          .setName(SUBCOMMAND.RESET)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommandGroup((group) => {
        const gd = desc("unverified-kick-settings.exempt.description");
        const addD = desc("unverified-kick-settings.exempt.add.description");
        const addRole = desc(
          "unverified-kick-settings.exempt.add.role.description",
        );
        const rmD = desc("unverified-kick-settings.exempt.remove.description");
        const listD = desc("unverified-kick-settings.exempt.list.description");
        return group
          .setName(GROUP.EXEMPT)
          .setDescription(gd.ja)
          .setDescriptionLocalizations(gd.localizations)
          .addSubcommand((sub) =>
            sub
              .setName(EXEMPT_SUBCOMMAND.ADD)
              .setDescription(addD.ja)
              .setDescriptionLocalizations(addD.localizations)
              .addRoleOption((o) =>
                o
                  .setName(OPTION.ROLE)
                  .setDescription(addRole.ja)
                  .setDescriptionLocalizations(addRole.localizations)
                  .setRequired(true),
              ),
          )
          .addSubcommand((sub) =>
            // remove は登録済み項目をセレクトメニューで複数選択するためオプションなし
            sub
              .setName(EXEMPT_SUBCOMMAND.REMOVE)
              .setDescription(rmD.ja)
              .setDescriptionLocalizations(rmD.localizations),
          )
          .addSubcommand((sub) =>
            sub
              .setName(EXEMPT_SUBCOMMAND.LIST)
              .setDescription(listD.ja)
              .setDescriptionLocalizations(listD.localizations),
          );
      });
  })(),

  /**
   * unverified-kick-settings コマンドの実行入口
   * @param interaction コマンド実行インタラクション
   */
  async execute(interaction) {
    try {
      await executeUnverifiedKickSettingsCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
