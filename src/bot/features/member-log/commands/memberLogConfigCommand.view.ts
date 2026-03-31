// src/bot/features/member-log/commands/memberLogConfigCommand.view.ts
// member-log-config view 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { getBotMemberLogConfigService } from "../../../services/botCompositionRoot";
import { createInfoEmbed } from "../../../utils/messageResponse";
import { ensureMemberLogManageGuildPermission } from "./memberLogConfigCommand.guard";

/**
 * 現在のメンバーログ設定を表示する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定参照対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleMemberLogConfigView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureMemberLogManageGuildPermission(interaction);

  // 常に最新設定を取得して表示
  const config =
    await getBotMemberLogConfigService().getMemberLogConfig(guildId);

  // 未設定時は案内メッセージを返す
  if (!config) {
    const title = tInteraction(
      interaction.locale,
      "memberLog:embed.title.config_view",
    );
    const message = tInteraction(
      interaction.locale,
      "memberLog:embed.description.not_configured",
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
    "memberLog:embed.title.config_view",
  );
  const fieldStatus = tInteraction(
    interaction.locale,
    "common:embed.field.name.status",
  );
  const fieldChannel = tInteraction(
    interaction.locale,
    "memberLog:embed.field.name.channel",
  );
  const fieldJoinMessage = tInteraction(
    interaction.locale,
    "memberLog:embed.field.name.join_message",
  );
  const fieldLeaveMessage = tInteraction(
    interaction.locale,
    "memberLog:embed.field.name.leave_message",
  );
  const labelEnabled = tInteraction(interaction.locale, "common:enabled");
  const labelDisabled = tInteraction(interaction.locale, "common:disabled");
  const labelNone = tInteraction(interaction.locale, "common:none");

  // 設定内容を固定構成で表示
  const embed = createInfoEmbed("", {
    title: viewTitle,
    fields: [
      {
        name: fieldStatus,
        value: config.enabled ? labelEnabled : labelDisabled,
        inline: true,
      },
      {
        name: fieldChannel,
        value: config.channelId ? `<#${config.channelId}>` : labelNone,
        inline: true,
      },
      {
        name: fieldJoinMessage,
        value: config.joinMessage ?? labelNone,
        inline: false,
      },
      {
        name: fieldLeaveMessage,
        value: config.leaveMessage ?? labelNone,
        inline: false,
      },
    ],
  });

  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
