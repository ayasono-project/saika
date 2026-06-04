// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.clearMessage.ts
// vc-auto-recruit-settings clear-message 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/**
 * カスタム募集メッセージを削除する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsClearMessage(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  // カスタム募集メッセージを削除（未設定時もデフォルト本文で投稿される）
  await getBotVcAutoRecruitSettingsService().clearMessage(guildId);

  const description = tInteraction(
    interaction.locale,
    "vcAutoRecruit:user-response.clear_message_success",
  );
  const successTitle = tInteraction(
    interaction.locale,
    "common:embed.title.success",
  );
  await interaction.reply({
    embeds: [createSuccessEmbed(description, { title: successTitle })],
    flags: MessageFlags.Ephemeral,
  });

  // 監査用ログ
  logger.info(
    logPrefixed(
      "system:log_prefix.vc_auto_recruit",
      "vcAutoRecruit:log.config_message_cleared",
      { guildId },
    ),
  );
}
