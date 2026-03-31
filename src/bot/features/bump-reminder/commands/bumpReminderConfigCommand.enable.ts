// src/bot/features/bump-reminder/commands/bumpReminderConfigCommand.enable.ts
// bump-reminder-config enable 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotBumpReminderConfigService } from "../../../services/botCompositionRoot";
import { createSuccessEmbed } from "../../../utils/messageResponse";

/**
 * 通知機能を有効化する
 * 通知先チャンネルは実行チャンネルを採用する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleBumpReminderConfigEnable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // enable 実行チャンネルを通知先として保存
  const channelId = interaction.channelId;

  // 設定を有効化（channelId を同時保存）
  await getBotBumpReminderConfigService().setBumpReminderEnabled(
    guildId,
    true,
    channelId,
  );

  const description = tInteraction(
    interaction.locale,
    "bumpReminder:user-response.enable_success",
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
      "system:log_prefix.bump_reminder",
      "bumpReminder:log.config_enabled",
      { guildId, channelId },
    ),
  );
}
