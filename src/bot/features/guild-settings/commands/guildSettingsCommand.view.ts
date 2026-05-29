// src/bot/features/guild-settings/commands/guildSettingsCommand.view.ts
// guild-settings view サブコマンド実行処理（単一ページ表示）

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { buildGuildSettingsPage } from "./guildSettingsCommand.viewPages";

/**
 * ギルド設定を単一 Embed で表示する
 * @param interaction コマンド実行インタラクション
 * @param guildId 表示対象のギルドID
 */
export async function handleView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const embed = await buildGuildSettingsPage(guildId, interaction.locale);

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
