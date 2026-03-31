// src/bot/commands/vc-recruit-config.ts
// VC募集機能の設定コマンド定義

import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { autocompleteVcRecruitConfigCommand } from "../features/vc-recruit/commands/vcRecruitConfigCommand.autocomplete";
import { VC_RECRUIT_CONFIG_COMMAND } from "../features/vc-recruit/commands/vcRecruitConfigCommand.constants";
import { executeVcRecruitConfigCommand } from "../features/vc-recruit/commands/vcRecruitConfigCommand.execute";
import type { Command } from "../types/discord";

/**
 * VC募集設定コマンド（サーバー管理権限専用）
 * チャンネルセットアップ・ロール管理・設定確認を提供する
 */
export const vcRecruitConfigCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-config.description",
    );
    const setupDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-config.setup.description",
    );
    const setupCategoryDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-config.setup.category.description",
    );
    const setupThreadArchiveDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-config.setup.thread-archive.description",
    );
    const teardownDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-config.teardown.description",
    );
    const addRoleDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-config.add-role.description",
    );
    const removeRoleDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-config.remove-role.description",
    );
    const viewDesc = getCommandLocalizations(
      "vcRecruit",
      "vc-recruit-config.view.description",
    );

    return new SlashCommandBuilder()
      .setName(VC_RECRUIT_CONFIG_COMMAND.NAME)
      .setDescription(cmdDesc.ja)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.SETUP)
          .setDescription(setupDesc.ja)
          .setDescriptionLocalizations(setupDesc.localizations)
          .addStringOption((option) =>
            option
              .setName(VC_RECRUIT_CONFIG_COMMAND.OPTION.CATEGORY)
              .setDescription(setupCategoryDesc.ja)
              .setDescriptionLocalizations(setupCategoryDesc.localizations)
              .setRequired(false)
              .setAutocomplete(true),
          )
          .addStringOption((option) =>
            option
              .setName(VC_RECRUIT_CONFIG_COMMAND.OPTION.THREAD_ARCHIVE)
              .setDescription(setupThreadArchiveDesc.ja)
              .setDescriptionLocalizations(setupThreadArchiveDesc.localizations)
              .setRequired(false)
              .addChoices(...VC_RECRUIT_CONFIG_COMMAND.THREAD_ARCHIVE_CHOICES),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.TEARDOWN)
          .setDescription(teardownDesc.ja)
          .setDescriptionLocalizations(teardownDesc.localizations),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.ADD_ROLE)
          .setDescription(addRoleDesc.ja)
          .setDescriptionLocalizations(addRoleDesc.localizations),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.REMOVE_ROLE)
          .setDescription(removeRoleDesc.ja)
          .setDescriptionLocalizations(removeRoleDesc.localizations),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.VIEW)
          .setDescription(viewDesc.ja)
          .setDescriptionLocalizations(viewDesc.localizations),
      );
  })(),

  /**
   * vc-recruit-config コマンド実行を features 側へ委譲する
   * @param interaction コマンド実行インタラクション
   */
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeVcRecruitConfigCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  /**
   * vc-recruit-config autocomplete を features 側へ委譲する
   * @param interaction オートコンプリートインタラクション
   */
  async autocomplete(interaction: AutocompleteInteraction) {
    await autocompleteVcRecruitConfigCommand(interaction);
  },

  cooldown: 3,
};

export default vcRecruitConfigCommand;
