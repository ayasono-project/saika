// src/bot/commands/vc-auto-recruit-settings.ts
// VC自動募集機能の設定コマンド定義

import {
  ChannelType,
  InteractionContextType,
  PermissionFlagsBits,
} from "discord.js";
import { VC_AUTO_RECRUIT_SETTINGS_COMMAND } from "../../features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.constants";
import { executeVcAutoRecruitSettingsCommand } from "../../features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { createSlashCommand } from "../shared/createSlashCommand";
import type { Command } from "../types/discord";

/**
 * VC自動募集設定コマンド（サーバー管理権限専用）
 * 投稿先チャンネル・有効化/無効化・カスタムメッセージ・Embed・対象チャンネルの設定を提供する
 */
export const vcAutoRecruitSettingsCommand: Command = {
  data: (() => {
    // 各ロケール文言を先に解決して SlashCommandBuilder へ流し込む
    const cmdDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.description",
    );
    const setChannelDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.set-post-channel.description",
    );
    const setChannelChannelDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.set-post-channel.channel.description",
    );
    const enableDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.enable.description",
    );
    const disableDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.disable.description",
    );
    const setMessageDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.set-message.description",
    );
    const clearMessageDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.clear-message.description",
    );
    const setEmbedDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.set-embed.description",
    );
    const setEmbedEnabledDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.set-embed.enabled.description",
    );
    const addChannelDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.add-channel.description",
    );
    const removeChannelDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.remove-channel.description",
    );
    const viewDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.view.description",
    );
    const resetDesc = getCommandLocalizations(
      "vcAutoRecruit",
      "vc-auto-recruit-settings.reset.description",
    );

    // コマンド定義は commands 層に残し、業務処理は features 側へ委譲する
    return (
      createSlashCommand()
        .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.NAME)
        .setDescription(cmdDesc.base)
        .setDescriptionLocalizations(cmdDesc.localizations)
        .setContexts(InteractionContextType.Guild)
        // Discord 側の表示/実行制御として ManageGuild を要求
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommand((subcommand) =>
          // 投稿先チャンネル設定
          subcommand
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SET_CHANNEL)
            .setDescription(setChannelDesc.base)
            .setDescriptionLocalizations(setChannelDesc.localizations)
            .addChannelOption((option) =>
              option
                .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.OPTION.CHANNEL)
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
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.ENABLE)
            .setDescription(enableDesc.base)
            .setDescriptionLocalizations(enableDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 機能無効化
          subcommand
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.DISABLE)
            .setDescription(disableDesc.base)
            .setDescriptionLocalizations(disableDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム招待メッセージ設定（モーダル起動）
          subcommand
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SET_MESSAGE)
            .setDescription(setMessageDesc.base)
            .setDescriptionLocalizations(setMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // カスタム招待メッセージ削除
          subcommand
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.CLEAR_MESSAGE)
            .setDescription(clearMessageDesc.base)
            .setDescriptionLocalizations(clearMessageDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // Embed 有効/無効切り替え
          subcommand
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SET_EMBED)
            .setDescription(setEmbedDesc.base)
            .setDescriptionLocalizations(setEmbedDesc.localizations)
            .addBooleanOption((option) =>
              option
                .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.OPTION.ENABLED)
                .setDescription(setEmbedEnabledDesc.base)
                .setDescriptionLocalizations(setEmbedEnabledDesc.localizations)
                .setRequired(true),
            ),
        )
        .addSubcommand((subcommand) =>
          // 募集対象チャンネル追加（未登録 VC チャンネルをメニューから複数選択）
          subcommand
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.ADD_CHANNEL)
            .setDescription(addChannelDesc.base)
            .setDescriptionLocalizations(addChannelDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 募集対象チャンネル解除（登録済み VC チャンネルをメニューから複数選択）
          subcommand
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_CHANNEL)
            .setDescription(removeChannelDesc.base)
            .setDescriptionLocalizations(removeChannelDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 設定表示
          subcommand
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.VIEW)
            .setDescription(viewDesc.base)
            .setDescriptionLocalizations(viewDesc.localizations),
        )
        .addSubcommand((subcommand) =>
          // 設定リセット
          subcommand
            .setName(VC_AUTO_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.RESET)
            .setDescription(resetDesc.base)
            .setDescriptionLocalizations(resetDesc.localizations),
        )
    );
  })(),

  /**
   * vc-auto-recruit-settings コマンドの実行入口
   * @param interaction コマンド実行インタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction) {
    try {
      await executeVcAutoRecruitSettingsCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },
};
