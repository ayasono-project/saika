// src/bot/features/bump-reminder/handlers/bumpReminderRoleDeleteHandler.ts
// ロール削除時の mentionRoleId 自動クリア

import type { Role } from "discord.js";
import { getBotBumpReminderSettingsService } from "../../../bot/services/botCompositionRoot";
import { notifyErrorChannel } from "../../../bot/shared/errorChannelNotifier";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";

/**
 * ロール削除時に、該当ロールが mentionRoleId に設定されていれば自動クリアする
 * @param role 削除されたロール
 */
export async function handleBumpReminderRoleDelete(role: Role): Promise<void> {
  const guildId = role.guild.id;

  try {
    const config =
      await getBotBumpReminderSettingsService().getBumpReminderSettings(
        guildId,
      );
    if (!config || config.mentionRoleId !== role.id) {
      return;
    }

    await getBotBumpReminderSettingsService().setBumpReminderMentionRole(
      guildId,
      undefined,
    );

    logger.info(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.config_mention_removed",
        { guildId, target: `role:${role.id}` },
      ),
    );
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.config_mention_removed",
        { guildId, target: "role-delete-cleanup-failed" },
      ),
      err,
    );
    await notifyErrorChannel(role.guild, err, {
      feature: "Bumpリマインダー",
      action: "ロール削除時のメンション整理失敗",
    });
  }
}
