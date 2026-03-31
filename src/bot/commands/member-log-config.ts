// src/bot/commands/member-log-config.ts
// メンバーログ機能の設定コマンド定義

import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { MEMBER_LOG_CONFIG_COMMAND } from "../features/member-log/commands/memberLogConfigCommand.constants";
import { executeMemberLogConfigCommand } from "../features/member-log/commands/memberLogConfigCommand.execute";
import type { Command } from "../types/discord";

/**
 * メンバーログ設定コマンド（サーバー管理権限専用）
 * 通知チャンネル・有効化/無効化・カスタムメッセージの設定を提供する
 */
export const memberLogConfigCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.description",
    );
    const setChannelDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.set-channel.description",
    );
    const setChannelChannelDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.set-channel.channel.description",
    );
    const enableDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.enable.description",
    );
    const disableDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.disable.description",
    );
    const setJoinMessageDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.set-join-message.description",
    );
    const setLeaveMessageDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.set-leave-message.description",
    );
    const clearJoinMessageDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.clear-join-message.description",
    );
    const clearLeaveMessageDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.clear-leave-message.description",
    );
    const resetDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.reset.description",
    );
    const viewDesc = getCommandLocalizations(
      "memberLog",
      "member-log-config.view.description",
    );

    // コマンド定義は commands 層に残し、業務処理は features 側へ委譲する
    return (
      new SlashCommandBuilder()
        .setName(MEMBER_LOG_CONFIG_COMMAND.NAME)
        .setDescription(cmdDesc.ja)
        .setDescriptionLocalizations(cmdDesc.localizations)
        // Discord 側の表示/実行制御として ManageGuild を要求
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((subcommand) =>
          // 通知チャンネル設定
          subcommand
            .setName(MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.SET_CHANNEL)
            .setDescription(setChannelDesc.ja)
            .setDescriptionLocalizations(setChannelDesc.localizations)
            .addChannelOption((option) =>
              option
                .setName(MEMBER_LOG_CONFIG_COMMAND.OPTION.CHANNEL)
                .setDescription(setChannelChannelDesc.ja)
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
            .setName(MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.ENABLE)
            .setDescription(enableDesc.ja)
            .setDescriptionLocalizations(enableDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 機能無効化
          subcommand
            .setName(MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.DISABLE)
            .setDescription(disableDesc.ja)
            .setDescriptionLocalizations(disableDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム参加メッセージ設定（モーダル起動）
          subcommand
            .setName(MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.SET_JOIN_MESSAGE)
            .setDescription(setJoinMessageDesc.ja)
            .setDescriptionLocalizations(setJoinMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム退出メッセージ設定（モーダル起動）
          subcommand
            .setName(MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.SET_LEAVE_MESSAGE)
            .setDescription(setLeaveMessageDesc.ja)
            .setDescriptionLocalizations(setLeaveMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム参加メッセージ削除
          subcommand
            .setName(MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.CLEAR_JOIN_MESSAGE)
            .setDescription(clearJoinMessageDesc.ja)
            .setDescriptionLocalizations(clearJoinMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム退出メッセージ削除
          subcommand
            .setName(MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.CLEAR_LEAVE_MESSAGE)
            .setDescription(clearLeaveMessageDesc.ja)
            .setDescriptionLocalizations(clearLeaveMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 設定リセット
          subcommand
            .setName(MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.RESET)
            .setDescription(resetDesc.ja)
            .setDescriptionLocalizations(resetDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 設定表示
          subcommand
            .setName(MEMBER_LOG_CONFIG_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.ja)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
    );
  })(),

  /**
   * member-log-config コマンドの実行入口
   * @param interaction コマンド実行インタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction) {
    try {
      await executeMemberLogConfigCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
