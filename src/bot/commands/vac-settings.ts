// src/bot/commands/vac-settings.ts
// VC自動作成機能の設定コマンド定義

import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { autocompleteVacSettingsCommand } from "../../features/vac/commands/vacSettingsCommand.autocomplete";
import { VAC_SETTINGS_COMMAND } from "../../features/vac/commands/vacSettingsCommand.constants";
import { executeVacSettingsCommand } from "../../features/vac/commands/vacSettingsCommand.execute";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import type { Command } from "../types/discord";

/**
 * VAC（自動作成VC）設定コマンド（サーバー管理権限専用）
 * トリガーVCの追加・削除・設定確認を提供する
 */
export const vacSettingsCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations("vac", "vac-settings.description");
    const createDesc = getCommandLocalizations(
      "vac",
      "vac-settings.create-trigger-vc.description",
    );
    const removeDesc = getCommandLocalizations(
      "vac",
      "vac-settings.remove-trigger-vc.description",
    );
    const createCategoryDesc = getCommandLocalizations(
      "vac",
      "vac-settings.create-trigger-vc.category.description",
    );
    const viewDesc = getCommandLocalizations(
      "vac",
      "vac-settings.view.description",
    );

    return new SlashCommandBuilder()
      .setName(VAC_SETTINGS_COMMAND.NAME)
      .setDescription(cmdDesc.base)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VAC_SETTINGS_COMMAND.SUBCOMMAND.CREATE_TRIGGER)
          .setDescription(createDesc.base)
          .setDescriptionLocalizations(createDesc.localizations)
          .addStringOption((option) =>
            option
              .setName(VAC_SETTINGS_COMMAND.OPTION.CATEGORY)
              .setDescription(createCategoryDesc.base)
              .setDescriptionLocalizations(createCategoryDesc.localizations)
              .setRequired(false)
              .setAutocomplete(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VAC_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_TRIGGER)
          .setDescription(removeDesc.base)
          .setDescriptionLocalizations(removeDesc.localizations),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VAC_SETTINGS_COMMAND.SUBCOMMAND.VIEW)
          .setDescription(viewDesc.base)
          .setDescriptionLocalizations(viewDesc.localizations),
      );
  })(),

  /**
   * vac-settings コマンド実行を features 側へ委譲する
   * @param interaction コマンド実行インタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeVacSettingsCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  /**
   * vac-settings の autocomplete 処理を features 側へ委譲する
   * @param interaction オートコンプリートインタラクション
   * @returns 実行完了を示す Promise
   */
  async autocomplete(interaction: AutocompleteInteraction) {
    await autocompleteVacSettingsCommand(interaction);
  },

  cooldown: 3,
};

export default vacSettingsCommand;
