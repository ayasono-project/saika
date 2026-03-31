// src/bot/utils/categoryAutocomplete.ts
// カテゴリ選択 autocomplete の共通ロジック

import { AutocompleteInteraction, ChannelType } from "discord.js";
import type { AllParseKeys } from "../../shared/locale/i18n";
import { tInteraction } from "../../shared/locale/localeManager";

export interface CategoryAutocompleteOptions {
  /** 対象コマンド名 */
  commandName: string;
  /** カテゴリ autocomplete を有効にするサブコマンド名の一覧 */
  subcommands: readonly string[];
  /** TOP 選択肢のラベルに使うロケールキー */
  topLocaleKey: AllParseKeys;
  /** TOP 選択肢の value */
  topValue: string;
}

/**
 * カテゴリ選択オートコンプリートに候補を返す共通処理
 *
 * - 対象外コマンド・サブコマンドのときは空配列を返す
 * - Discord の3秒タイムアウト制約があるため、DB を参照する tGuild ではなく
 *   同期的な tInteraction を使用する
 * @param interaction オートコンプリートインタラクション
 * @param opts コマンド固有のオプション
 */
export async function respondCategoryAutocomplete(
  interaction: AutocompleteInteraction,
  opts: CategoryAutocompleteOptions,
): Promise<void> {
  const subcommand = interaction.options.getSubcommand();
  if (
    interaction.commandName !== opts.commandName ||
    !opts.subcommands.includes(subcommand)
  ) {
    await interaction.respond([]);
    return;
  }

  const focused = interaction.options.getFocused();
  const guild = interaction.guild;
  if (!guild) {
    // guild 文脈がないとカテゴリ候補を解決できない
    await interaction.respond([]);
    return;
  }

  const topLabel = tInteraction(interaction.locale, opts.topLocaleKey);

  const categoryChoices = guild.channels.cache
    .filter((ch) => ch.type === ChannelType.GuildCategory)
    .map((category) => ({
      name: category.name,
      value: category.id,
    }));

  // カテゴリ候補は「TOP + カテゴリ一覧」を入力文字で絞り込む
  const choices = [{ name: topLabel, value: opts.topValue }, ...categoryChoices]
    .filter((choice) =>
      choice.name.toLowerCase().includes(focused.toLowerCase()),
    )
    .slice(0, 25);

  await interaction.respond(choices);
}
