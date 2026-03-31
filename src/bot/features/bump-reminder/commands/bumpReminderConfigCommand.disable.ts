// src/bot/features/bump-reminder/commands/bumpReminderConfigCommand.disable.ts
// bump-reminder-config disable 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import {
  getBotBumpReminderConfigService,
  getBotBumpReminderManager,
} from "../../../services/botCompositionRoot";
import { createSuccessEmbed } from "../../../utils/messageResponse";

/**
 * 通知機能を無効化する
 * 進行中のリマインダーがあれば先にキャンセルする
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleBumpReminderConfigDisable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // メモリ上の pending リマインダーをキャンセル
  const bumpReminderManager = getBotBumpReminderManager();
  await bumpReminderManager.cancelReminder(guildId);

  // 機能を無効化
  await getBotBumpReminderConfigService().setBumpReminderEnabled(
    guildId,
    false,
  );

  const description = tInteraction(
    interaction.locale,
    "bumpReminder:user-response.disable_success",
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
      "bumpReminder:log.config_disabled",
      { guildId },
    ),
  );
}
