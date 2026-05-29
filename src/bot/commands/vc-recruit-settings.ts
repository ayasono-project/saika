// src/bot/commands/vc-recruit-settings.ts
// VC募集機能の設定コマンド定義

import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { autocompleteVcRecruitSettingsCommand } from "../features/vc-recruit/commands/vcRecruitSettingsCommand.autocomplete";
import { VC_RECRUIT_SETTINGS_COMMAND } from "../features/vc-recruit/commands/vcRecruitSettingsCommand.constants";
import { executeVcRecruitSettingsCommand } from "../features/vc-recruit/commands/vcRecruitSettingsCommand.execute";
import type { Command } from "../types/discord";

/**
 * VC募集設定コマンド（サーバー管理権限専用）
 * チャンネルセットアップ・ロール管理・設定確認を提供する
 */
export const vcRecruitSettingsCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-settings.description",
    );
    const setupDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-settings.setup.description",
    );
    const setupCategoryDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-settings.setup.category.description",
    );
    const setupThreadArchiveDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-settings.setup.thread-archive.description",
    );
    const teardownDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-settings.teardown.description",
    );
    const addRoleDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-settings.add-role.description",
    );
    const removeRoleDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-settings.remove-role.description",
    );
    const viewDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-settings.view.description",
    );

    return new SlashCommandBuilder()
      .setName(VC_RECRUIT_SETTINGS_COMMAND.NAME)
      .setDescription(cmdDesc.ja)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SETUP)
          .setDescription(setupDesc.ja)
          .setDescriptionLocalizations(setupDesc.localizations)
          .addStringOption((option) =>
            option
              .setName(VC_RECRUIT_SETTINGS_COMMAND.OPTION.CATEGORY)
              .setDescription(setupCategoryDesc.ja)
              .setDescriptionLocalizations(setupCategoryDesc.localizations)
              .setRequired(false)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName(VC_RECRUIT_SETTINGS_COMMAND.OPTION.THREAD_ARCHIVE)
              .setDescription(setupThreadArchiveDesc.ja)
              .setDescriptionLocalizations(setupThreadArchiveDesc.localizations)
              .setRequired(false)
              .addChoices(
                ...VC_RECRUIT_SETTINGS_COMMAND.THREAD_ARCHIVE_CHOICES,
              ),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.TEARDOWN)
          .setDescription(teardownDesc.ja)
          .setDescriptionLocalizations(teardownDesc.localizations),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.ADD_ROLE)
          .setDescription(addRoleDesc.ja)
          .setDescriptionLocalizations(addRoleDesc.localizations),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_ROLE)
          .setDescription(removeRoleDesc.ja)
          .setDescriptionLocalizations(removeRoleDesc.localizations),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.VIEW)
          .setDescription(viewDesc.ja)
          .setDescriptionLocalizations(viewDesc.localizations),
      );
  })(),

  /**
   * vc-recruit-settings コマンド実行を features 側へ委譲する
   * @param interaction コマンド実行インタラクション
   */
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeVcRecruitSettingsCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  /**
   * vc-recruit-settings autocomplete を features 側へ委譲する
   * @param interaction オートコンプリートインタラクション
   */
  async autocomplete(interaction: AutocompleteInteraction) {
    await autocompleteVcRecruitSettingsCommand(interaction);
  },

  cooldown: 3,
};

export default vcRecruitSettingsCommand;
