// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.view.ts
// vc-auto-recruit-settings view 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import { createInfoEmbed } from "../../../bot/utils/messageResponse";
import { tInteraction } from "../../../shared/locale/localeManager";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/**
 * 現在の VC自動募集設定を表示する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定参照対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  // 常に最新設定を取得して表示
  const config =
    await getBotVcAutoRecruitSettingsService().getVcAutoRecruitSettings(
      guildId,
    );

  const locale = interaction.locale;
  const viewTitle = tInteraction(
    locale,
    "vcAutoRecruit:embed.title.config_view",
  );

  // 未設定時は案内メッセージを返す
  if (!config) {
    const message = tInteraction(
      locale,
      "vcAutoRecruit:embed.description.not_configured",
    );
    await interaction.reply({
      embeds: [createInfoEmbed(message, { title: viewTitle })],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 表示用のローカライズ文字列を解決
  const labelEnabled = tInteraction(locale, "common:enabled");
  const labelDisabled = tInteraction(locale, "common:disabled");
  const labelNone = tInteraction(locale, "common:none");

  // 設定内容を固定構成で表示
  const embed = createInfoEmbed("", {
    title: viewTitle,
    fields: [
      {
        name: tInteraction(locale, "common:embed.field.name.status"),
        value: config.enabled ? labelEnabled : labelDisabled,
        inline: true,
      },
      {
        name: tInteraction(locale, "vcAutoRecruit:embed.field.name.channel"),
        value: config.channelId ? `<#${config.channelId}>` : labelNone,
        inline: true,
      },
      {
        name: tInteraction(locale, "vcAutoRecruit:embed.field.name.embed"),
        value: config.embedEnabled ? labelEnabled : labelDisabled,
        inline: true,
      },
      {
        name: tInteraction(locale, "vcAutoRecruit:embed.field.name.message"),
        value: config.message ?? labelNone,
        inline: false,
      },
    ],
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
