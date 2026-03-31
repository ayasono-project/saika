// src/bot/features/vc-recruit/commands/vcRecruitConfigCommand.autocomplete.ts
// VC募集設定コマンドの autocomplete 処理

import { AutocompleteInteraction } from "discord.js";
import { respondCategoryAutocomplete } from "../../../utils/categoryAutocomplete";
import { VC_RECRUIT_CONFIG_COMMAND } from "./vcRecruitConfigCommand.constants";

/**
 * vc-recruit-config のカテゴリ候補 autocomplete
 * @param interaction オートコンプリートインタラクション
 * @returns 実行完了を示す Promise
 */
export async function autocompleteVcRecruitConfigCommand(
  interaction: AutocompleteInteraction,
): Promise<void> {
  await respondCategoryAutocomplete(interaction, {
    commandName: VC_RECRUIT_CONFIG_COMMAND.NAME,
    subcommands: [VC_RECRUIT_CONFIG_COMMAND.SUBCOMMAND.SETUP],
    topLocaleKey: "vcRecruit:vc-recruit-config.setup.category.top",
    topValue: VC_RECRUIT_CONFIG_COMMAND.TARGET.TOP,
  });
}
