// src/bot/features/vac/commands/vacSettingsCommand.autocomplete.ts
// VAC 設定コマンドの autocomplete 処理

import { AutocompleteInteraction } from "discord.js";
import { respondCategoryAutocomplete } from "../../../bot/utils/categoryAutocomplete";
import { VAC_SETTINGS_COMMAND } from "./vacSettingsCommand.constants";

/**
 * vac-settings のカテゴリ候補 autocomplete
 * @param interaction オートコンプリートインタラクション
 * @returns 実行完了を示す Promise
 */
export async function autocompleteVacSettingsCommand(
  interaction: AutocompleteInteraction,
): Promise<void> {
  await respondCategoryAutocomplete(interaction, {
    commandName: VAC_SETTINGS_COMMAND.NAME,
    subcommands: [
      VAC_SETTINGS_COMMAND.SUBCOMMAND.CREATE_TRIGGER,
      VAC_SETTINGS_COMMAND.SUBCOMMAND.REMOVE_TRIGGER,
    ],
    topLocaleKey: "vac:vac-settings.remove-trigger-vc.category.top",
    topValue: VAC_SETTINGS_COMMAND.TARGET.TOP,
  });
}
