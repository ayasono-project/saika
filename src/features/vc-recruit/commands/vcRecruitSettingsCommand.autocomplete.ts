// src/bot/features/vc-recruit/commands/vcRecruitSettingsCommand.autocomplete.ts
// VC募集設定コマンドの autocomplete 処理

import { AutocompleteInteraction } from "discord.js";
import { respondCategoryAutocomplete } from "../../../bot/utils/categoryAutocomplete";
import { VC_RECRUIT_SETTINGS_COMMAND } from "./vcRecruitSettingsCommand.constants";

/**
 * vc-recruit-settings のカテゴリ候補 autocomplete
 * @param interaction オートコンプリートインタラクション
 * @returns 実行完了を示す Promise
 */
export async function autocompleteVcRecruitSettingsCommand(
  interaction: AutocompleteInteraction,
): Promise<void> {
  await respondCategoryAutocomplete(interaction, {
    commandName: VC_RECRUIT_SETTINGS_COMMAND.NAME,
    subcommands: [VC_RECRUIT_SETTINGS_COMMAND.SUBCOMMAND.SETUP],
    topLocaleKey: "vcRecruit:vc-recruit-settings.setup.category.top",
    topValue: VC_RECRUIT_SETTINGS_COMMAND.TARGET.TOP,
  });
}
