// src/bot/features/bump-reminder/commands/bumpReminderSettingsCommand.setMention.ts
// bump-reminder-settings set-mention 実行処理

import { ValidationError } from "@ayasono/shared/core";
import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { BUMP_REMINDER_MENTION_ROLE_RESULT } from "../../../../shared/features/bump-reminder/bumpReminderSettingsService";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotBumpReminderSettingsService } from "../../../services/botCompositionRoot";
import { createSuccessEmbed } from "../../../utils/messageResponse";
import { BUMP_REMINDER_SETTINGS_COMMAND } from "./bumpReminderSettingsCommand.constants";

/**
 * メンションロールを設定する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 */
export async function handleBumpReminderSettingsSetMention(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // role オプションを取得（required: true なので必ず存在）
  const role = interaction.options.getRole(
    BUMP_REMINDER_SETTINGS_COMMAND.OPTION.ROLE,
    true,
  );

  const bumpReminderSettingsService = getBotBumpReminderSettingsService();

  // ロールを上書き設定
  const roleResult =
    await bumpReminderSettingsService.setBumpReminderMentionRole(
      guildId,
      role.id,
    );
  if (roleResult === BUMP_REMINDER_MENTION_ROLE_RESULT.NOT_CONFIGURED) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "bumpReminder:user-response.set_mention_error",
      ),
    );
  }

  // 変更内容を返信
  const roleMessage = tInteraction(
    interaction.locale,
    "bumpReminder:user-response.set_mention_role_success",
    { role: `<@&${role.id}>` },
  );
  const embed = createSuccessEmbed(roleMessage, {
    title: tInteraction(interaction.locale, "common:embed.title.success"),
  });
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });

  // 監査用ログ
  logger.info(
    logPrefixed(
      "system:log_prefix.bump_reminder",
      "bumpReminder:log.config_mention_set",
      {
        guildId,
        roleId: role.id,
        userIds: "none",
      },
    ),
  );
}
