// src/bot/commands/inactive-kick-settings.ts
// 非アクティブ自動キック機能の設定コマンド定義

import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { INACTIVE_KICK_SETTINGS_COMMAND } from "../../features/inactive-kick/commands/inactiveKickSettingsCommand.constants";
import { executeInactiveKickSettingsCommand } from "../../features/inactive-kick/commands/inactiveKickSettingsCommand.execute";
import {
  INACTIVE_KICK_THRESHOLD_MAX_DAYS,
  INACTIVE_KICK_THRESHOLD_MIN_DAYS,
} from "../../features/inactive-kick/inactiveKickSettingsDefaults";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import type { InactiveKickTranslations } from "../../shared/locale/locales/ja/features/inactiveKick";
import { handleCommandError } from "../errors/interactionErrorHandler";
import type { Command } from "../types/discord";

const { SUBCOMMAND, GROUP, WHITELIST_SUBCOMMAND, OPTION } =
  INACTIVE_KICK_SETTINGS_COMMAND;

/**
 * 非アクティブ自動キック設定コマンド（サーバー管理権限専用）
 */
export const inactiveKickSettingsCommand: Command = {
  data: (() => {
    // 各ロケール文言を解決するヘルパー
    const desc = (key: keyof InactiveKickTranslations) =>
      getCommandLocalizations("inactiveKick", key);

    const cmdDesc = desc("inactive-kick-settings.description");

    return new SlashCommandBuilder()
      .setName(INACTIVE_KICK_SETTINGS_COMMAND.NAME)
      .setDescription(cmdDesc.ja)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.set-channel.description");
        const od = desc(
          "inactive-kick-settings.set-channel.channel.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_CHANNEL)
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
        const d = desc("inactive-kick-settings.set-threshold.description");
        const od = desc(
          "inactive-kick-settings.set-threshold.days.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_THRESHOLD)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations)
          .addIntegerOption((o) =>
            o
              .setName(OPTION.DAYS)
              .setDescription(od.ja)
              .setDescriptionLocalizations(od.localizations)
              .setMinValue(INACTIVE_KICK_THRESHOLD_MIN_DAYS)
              .setMaxValue(INACTIVE_KICK_THRESHOLD_MAX_DAYS)
              .setRequired(true),
          );
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.enable.description");
        return sub
          .setName(SUBCOMMAND.ENABLE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.disable.description");
        return sub
          .setName(SUBCOMMAND.DISABLE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "inactive-kick-settings.set-week-warn-message.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_WEEK_WARN_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "inactive-kick-settings.clear-week-warn-message.description",
        );
        return sub
          .setName(SUBCOMMAND.CLEAR_WEEK_WARN_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "inactive-kick-settings.set-final-warn-message.description",
        );
        return sub
          .setName(SUBCOMMAND.SET_FINAL_WARN_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc(
          "inactive-kick-settings.clear-final-warn-message.description",
        );
        return sub
          .setName(SUBCOMMAND.CLEAR_FINAL_WARN_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.set-kick-message.description");
        return sub
          .setName(SUBCOMMAND.SET_KICK_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.clear-kick-message.description");
        return sub
          .setName(SUBCOMMAND.CLEAR_KICK_MESSAGE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.set-marker-role.description");
        const od = desc(
          "inactive-kick-settings.set-marker-role.role.description",
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
        const d = desc("inactive-kick-settings.clear-marker-role.description");
        return sub
          .setName(SUBCOMMAND.CLEAR_MARKER_ROLE)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.preview.description");
        return sub
          .setName(SUBCOMMAND.PREVIEW)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.view.description");
        return sub
          .setName(SUBCOMMAND.VIEW)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
      })
      .addSubcommand((sub) => {
        const d = desc("inactive-kick-settings.reset.description");
        return sub
          .setName(SUBCOMMAND.RESET)
          .setDescription(d.ja)
          .setDescriptionLocalizations(d.localizations);
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
          .setDescription(gd.ja)
          .setDescriptionLocalizations(gd.localizations)
          .addSubcommand((sub) =>
            sub
              .setName(WHITELIST_SUBCOMMAND.ADD)
              .setDescription(addD.ja)
              .setDescriptionLocalizations(addD.localizations)
              .addRoleOption((o) =>
                o
                  .setName(OPTION.ROLE)
                  .setDescription(addRole.ja)
                  .setDescriptionLocalizations(addRole.localizations),
              )
              .addUserOption((o) =>
                o
                  .setName(OPTION.USER)
                  .setDescription(addUser.ja)
                  .setDescriptionLocalizations(addUser.localizations),
              ),
          )
          .addSubcommand((sub) =>
            // remove は登録済み項目をセレクトメニューで複数選択するためオプションなし
            sub
              .setName(WHITELIST_SUBCOMMAND.REMOVE)
              .setDescription(rmD.ja)
              .setDescriptionLocalizations(rmD.localizations),
          )
          .addSubcommand((sub) =>
            sub
              .setName(WHITELIST_SUBCOMMAND.LIST)
              .setDescription(listD.ja)
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
