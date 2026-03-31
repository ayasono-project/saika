// src/bot/features/bump-reminder/commands/bumpReminderConfigCommand.view.ts
// bump-reminder-config view 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { getBotBumpReminderConfigService } from "../../../services/botCompositionRoot";
import { createInfoEmbed } from "../../../utils/messageResponse";

/**
 * 現在の bump-reminder 設定を表示する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定参照対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleBumpReminderConfigView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 常に最新設定を取得して表示
  const config =
    await getBotBumpReminderConfigService().getBumpReminderConfig(guildId);

  // 未設定時は案内メッセージを返す
  if (!config) {
    const title = tInteraction(
      interaction.locale,
      "bumpReminder:embed.title.config_view",
    );
    const message = tInteraction(
      interaction.locale,
      "bumpReminder:embed.description.not_configured",
    );
    const embed = createInfoEmbed(message, { title });
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 表示用のローカライズ文字列を解決
  const viewTitle = tInteraction(
    interaction.locale,
    "bumpReminder:embed.title.config_view",
  );
  const fieldStatus = tInteraction(
    interaction.locale,
    "common:embed.field.name.status",
  );
  const fieldMentionRole = tInteraction(
    interaction.locale,
    "bumpReminder:embed.field.name.mention_role",
  );
  const fieldMentionUsers = tInteraction(
    interaction.locale,
    "bumpReminder:embed.field.name.mention_users",
  );
  const labelEnabled = tInteraction(interaction.locale, "common:enabled");
  const labelDisabled = tInteraction(interaction.locale, "common:disabled");
  const labelNone = tInteraction(interaction.locale, "common:none");

  // status / mention role / mention users を固定構成で表示
  const embed = createInfoEmbed("", {
    title: viewTitle,
    fields: [
      {
        name: fieldStatus,
        value: config.enabled ? labelEnabled : labelDisabled,
        inline: true,
      },
      {
        name: fieldMentionRole,
        value: config.mentionRoleId ? `<@&${config.mentionRoleId}>` : labelNone,
        inline: true,
      },
      {
        name: fieldMentionUsers,
        value:
          config.mentionUserIds && config.mentionUserIds.length > 0
            ? config.mentionUserIds.map((id: string) => `<@${id}>`).join(", ")
            : labelNone,
        inline: false,
      },
    ],
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
