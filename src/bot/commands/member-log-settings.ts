// src/bot/commands/member-log-settings.ts
// メンバーログ機能の設定コマンド定義

import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { MEMBER_LOG_SETTINGS_COMMAND } from "../../features/member-log/commands/memberLogSettingsCommand.constants";
import { executeMemberLogSettingsCommand } from "../../features/member-log/commands/memberLogSettingsCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import type { Command } from "../types/discord";

/**
 * メンバーログ設定コマンド（サーバー管理権限専用）
 * 通知チャンネル・有効化/無効化・カスタムメッセージの設定を提供する
 */
export const memberLogSettingsCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.description",
    );
    const setChannelDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.set-channel.description",
    );
    const setChannelChannelDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.set-channel.channel.description",
    );
    const enableDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.enable.description",
    );
    const disableDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.disable.description",
    );
    const setJoinMessageDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.set-join-message.description",
    );
    const setLeaveMessageDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.set-leave-message.description",
    );
    const clearJoinMessageDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.clear-join-message.description",
    );
    const clearLeaveMessageDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.clear-leave-message.description",
    );
    const resetDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.reset.description",
    );
    const viewDesc = getCommandLocalizations(
      "memberLog",
      "member-log-settings.view.description",
    );

    // コマンド定義は commands 層に残し、業務処理は features 側へ委譲する
    return (
      new SlashCommandBuilder()
        .setName(MEMBER_LOG_SETTINGS_COMMAND.NAME)
        .setDescription(cmdDesc.base)
        .setDescriptionLocalizations(cmdDesc.localizations)
        // Discord 側の表示/実行制御として ManageGuild を要求
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((subcommand) =>
          // 通知チャンネル設定
          subcommand
            .setName(MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.SET_CHANNEL)
            .setDescription(setChannelDesc.base)
            .setDescriptionLocalizations(setChannelDesc.localizations)
            .addChannelOption((option) =>
              option
                .setName(MEMBER_LOG_SETTINGS_COMMAND.OPTION.CHANNEL)
                .setDescription(setChannelChannelDesc.base)
                .setDescriptionLocalizations(
                  setChannelChannelDesc.localizations,
                )
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          // 機能有効化
          subcommand
            .setName(MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.ENABLE)
            .setDescription(enableDesc.base)
            .setDescriptionLocalizations(enableDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 機能無効化
          subcommand
            .setName(MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.DISABLE)
            .setDescription(disableDesc.base)
            .setDescriptionLocalizations(disableDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム参加メッセージ設定（モーダル起動）
          subcommand
            .setName(MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.SET_JOIN_MESSAGE)
            .setDescription(setJoinMessageDesc.base)
            .setDescriptionLocalizations(setJoinMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム退出メッセージ設定（モーダル起動）
          subcommand
            .setName(MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.SET_LEAVE_MESSAGE)
            .setDescription(setLeaveMessageDesc.base)
            .setDescriptionLocalizations(setLeaveMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム参加メッセージ削除
          subcommand
            .setName(MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.CLEAR_JOIN_MESSAGE)
            .setDescription(clearJoinMessageDesc.base)
            .setDescriptionLocalizations(clearJoinMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム退出メッセージ削除
          subcommand
            .setName(MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.CLEAR_LEAVE_MESSAGE)
            .setDescription(clearLeaveMessageDesc.base)
            .setDescriptionLocalizations(clearLeaveMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 設定リセット
          subcommand
            .setName(MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.RESET)
            .setDescription(resetDesc.base)
            .setDescriptionLocalizations(resetDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 設定表示
          subcommand
            .setName(MEMBER_LOG_SETTINGS_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.base)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
    );
  })(),

  /**
   * member-log-settings コマンドの実行入口
   * @param interaction コマンド実行インタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction) {
    try {
      await executeMemberLogSettingsCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
