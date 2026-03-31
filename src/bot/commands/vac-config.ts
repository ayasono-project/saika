// src/bot/commands/vac-config.ts
// VC自動作成機能の設定コマンド定義

import {
  type AutocompleteInteraction,
  type ChatInputCommandInteraction,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";
import { getCommandLocalizations } from "../../shared/locale/commandLocalizations";
import { handleCommandError } from "../errors/interactionErrorHandler";
import { autocompleteVacConfigCommand } from "../features/vac/commands/vacConfigCommand.autocomplete";
import { VAC_CONFIG_COMMAND } from "../features/vac/commands/vacConfigCommand.constants";
import { executeVacConfigCommand } from "../features/vac/commands/vacConfigCommand.execute";
import type { Command } from "../types/discord";

/**
 * VAC（自動作成VC）設定コマンド（サーバー管理権限専用）
 * トリガーVCの追加・削除・設定確認を提供する
 */
export const vacConfigCommand: Command = {
  data: (() => {
    const cmdDesc = getCommandLocalizations("vac", "vac-config.description");
    const createDesc = getCommandLocalizations(
      "vac",
      "vac-config.create-trigger-vc.description",
    );
    const removeDesc = getCommandLocalizations(
      "vac",
      "vac-config.remove-trigger-vc.description",
    );
    const createCategoryDesc = getCommandLocalizations(
      "vac",
      "vac-config.create-trigger-vc.category.description",
    );
    const viewDesc = getCommandLocalizations(
      "vac",
      "vac-config.view.description",
    );

    return new SlashCommandBuilder()
      .setName(VAC_CONFIG_COMMAND.NAME)
      .setDescription(cmdDesc.ja)
      .setDescriptionLocalizations(cmdDesc.localizations)
      .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VAC_CONFIG_COMMAND.SUBCOMMAND.CREATE_TRIGGER)
          .setDescription(createDesc.ja)
          .setDescriptionLocalizations(createDesc.localizations)
          .addStringOption((option) =>
            option
              .setName(VAC_CONFIG_COMMAND.OPTION.CATEGORY)
              .setDescription(createCategoryDesc.ja)
              .setDescriptionLocalizations(createCategoryDesc.localizations)
              .setRequired(false)
              .setAutocomplete(true),
          ),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VAC_CONFIG_COMMAND.SUBCOMMAND.REMOVE_TRIGGER)
          .setDescription(removeDesc.ja)
          .setDescriptionLocalizations(removeDesc.localizations),
      )
      .addSubcommand((subcommand) =>
        subcommand
          .setName(VAC_CONFIG_COMMAND.SUBCOMMAND.VIEW)
          .setDescription(viewDesc.ja)
          .setDescriptionLocalizations(viewDesc.localizations),
      );
  })(),

  /**
   * vac-config コマンド実行を features 側へ委譲する
   * @param interaction コマンド実行インタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction: ChatInputCommandInteraction) {
    try {
      await executeVacConfigCommand(interaction);
    } catch (error) {
      await handleCommandError(interaction, error);
    }
  },

  /**
   * vac-config の autocomplete 処理を features 側へ委譲する
   * @param interaction オートコンプリートインタラクション
   * @returns 実行完了を示す Promise
   */
  async autocomplete(interaction: AutocompleteInteraction) {
    await autocompleteVacConfigCommand(interaction);
  },

  cooldown: 3,
};

export default vacConfigCommand;
