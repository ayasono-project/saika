// bump-reminder-settings disable 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotBumpReminderSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { cancelGuildBumpReminders } from "../handlers/usecases/cancelGuildBumpReminders";

/**
 * 通知機能を無効化する
 * 進行中のリマインダーがあれば、そのパネルメッセージとともに取り消す
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleBumpReminderSettingsDisable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 先に無効化を保存し、取り消しの最中に検知した Bump で新しい予約が入らないようにする
  // （保存より前に設定を読み終えた検知は、予約の登録後に設定を読み直して自分で取り消す）
  await getBotBumpReminderSettingsService().setBumpReminderEnabled(
    guildId,
    false,
  );

  // このギルドの予約をすべて取り消し（タイマー解除 + DB の status を cancelled へ）、パネルも消す
  await cancelGuildBumpReminders(interaction.client, guildId);

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
