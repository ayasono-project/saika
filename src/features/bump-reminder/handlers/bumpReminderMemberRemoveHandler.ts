// src/bot/features/bump-reminder/handlers/bumpReminderMemberRemoveHandler.ts
// メンバー退出時の mentionUserIds 自動除去

import type { GuildMember, PartialGuildMember } from "discord.js";
import { getBotBumpReminderSettingsService } from "../../../bot/services/botCompositionRoot";
import { notifyErrorChannel } from "../../../bot/shared/errorChannelNotifier";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";

/**
 * メンバー退出時に、該当ユーザーが mentionUserIds に含まれていれば自動除去する
 * @param member 退出したギルドメンバー
 */
export async function handleBumpReminderMemberRemove(
  member: GuildMember | PartialGuildMember,
): Promise<void> {
  const guildId = member.guild.id;
  const userId = member.user?.id;
  if (!userId) return;

  try {
    const config =
      await getBotBumpReminderSettingsService().getBumpReminderSettings(
        guildId,
      );
    if (!config || !config.mentionUserIds.includes(userId)) {
      return;
    }

    await getBotBumpReminderSettingsService().removeBumpReminderMentionUser(
      guildId,
      userId,
    );

    logger.info(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.config_users_removed",
        { guildId, userIds: userId },
      ),
    );
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.config_mention_removed",
        { guildId, target: "member-remove-cleanup-failed" },
      ),
      err,
    );
    await notifyErrorChannel(member.guild, err, {
      feature: "Bumpリマインダー",
      action: "メンバー退出時のメンション整理失敗",
    });
  }
}
