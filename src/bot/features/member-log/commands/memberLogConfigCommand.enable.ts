// src/bot/features/member-log/commands/memberLogConfigCommand.enable.ts
// member-log-config enable 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotMemberLogConfigService } from "../../../services/botCompositionRoot";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../utils/messageResponse";
import { ensureMemberLogManageGuildPermission } from "./memberLogConfigCommand.guard";

/**
 * メンバーログ機能を有効化する
 * チャンネルが未設定の場合はエラーを返す
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleMemberLogConfigEnable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureMemberLogManageGuildPermission(interaction);

  // 現在の設定を確認
  const config =
    await getBotMemberLogConfigService().getMemberLogConfig(guildId);

  // チャンネルが未設定の場合は有効化できない
  if (!config?.channelId) {
    const description = tInteraction(
      interaction.locale,
      "memberLog:user-response.enable_error_no_channel",
    );
    const embed = createWarningEmbed(description, {
      title: tInteraction(interaction.locale, "common:title_config_required"),
    });
    await interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 機能を有効化
  await getBotMemberLogConfigService().setEnabled(guildId, true);

  const description = tInteraction(
    interaction.locale,
    "memberLog:user-response.enable_success",
  );
  const successTitle = tInteraction(
    interaction.locale,
    "common:embed.title.success",
  );
  const embed = createSuccessEmbed(description, { title: successTitle });
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });

  // 監査用ログ
  logger.info(
    logPrefixed(
      "system:log_prefix.member_log",
      "memberLog:log.config_enabled",
      { guildId },
    ),
  );
}
