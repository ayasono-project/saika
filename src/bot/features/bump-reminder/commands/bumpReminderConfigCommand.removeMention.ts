// src/bot/features/bump-reminder/commands/bumpReminderConfigCommand.removeMention.ts
// bump-reminder-config remove-mention 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { ValidationError } from "../../../../shared/errors/customErrors";
import { BUMP_REMINDER_MENTION_ROLE_RESULT } from "../../../../shared/features/bump-reminder/bumpReminderConfigService";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotBumpReminderConfigService } from "../../../services/botCompositionRoot";
import { createSuccessEmbed } from "../../../utils/messageResponse";

/**
 * メンションロール設定を削除する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 */
export async function handleBumpReminderConfigRemoveMention(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const bumpReminderConfigService = getBotBumpReminderConfigService();
  const successTitle = tInteraction(
    interaction.locale,
    "common:embed.title.success",
  );

  // メンションロール設定を削除
  const result = await bumpReminderConfigService.setBumpReminderMentionRole(
    guildId,
    undefined,
  );
  if (result === BUMP_REMINDER_MENTION_ROLE_RESULT.NOT_CONFIGURED) {
    throw new ValidationError(
      tInteraction(
        interaction.locale,
        "bumpReminder:embed.description.not_configured",
      ),
    );
  }

  const roleDescription = tInteraction(
    interaction.locale,
    "bumpReminder:user-response.remove_mention_role",
  );
  const roleEmbed = createSuccessEmbed(roleDescription, {
    title: successTitle,
  });
  await interaction.reply({
    embeds: [roleEmbed],
    flags: MessageFlags.Ephemeral,
  });

  logger.info(
    logPrefixed(
      "system:log_prefix.bump_reminder",
      "bumpReminder:log.config_mention_removed",
      {
        guildId,
        target: "role",
      },
    ),
  );
}
