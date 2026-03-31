// src/bot/features/vac/commands/vacConfigCommand.autocomplete.ts
// VAC 設定コマンドの autocomplete 処理

import { AutocompleteInteraction } from "discord.js";
import { respondCategoryAutocomplete } from "../../../utils/categoryAutocomplete";
import { VAC_CONFIG_COMMAND } from "./vacConfigCommand.constants";

/**
 * vac-config のカテゴリ候補 autocomplete
 * @param interaction オートコンプリートインタラクション
 * @returns 実行完了を示す Promise
 */
export async function autocompleteVacConfigCommand(
  interaction: AutocompleteInteraction,
): Promise<void> {
  await respondCategoryAutocomplete(interaction, {
    commandName: VAC_CONFIG_COMMAND.NAME,
    subcommands: [
      VAC_CONFIG_COMMAND.SUBCOMMAND.CREATE_TRIGGER,
      VAC_CONFIG_COMMAND.SUBCOMMAND.REMOVE_TRIGGER,
    ],
    topLocaleKey: "vac:vac-config.remove-trigger-vc.category.top",
    topValue: VAC_CONFIG_COMMAND.TARGET.TOP,
  });
}
