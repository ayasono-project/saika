// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.disable.ts
// vc-auto-recruit-settings disable 実行処理

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
 * VC自動募集機能を無効化する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsDisable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  // 機能を無効化（募集終了処理は enabled に依存しないため追跡中の募集には影響しない）
  await getBotVcAutoRecruitSettingsService().setEnabled(guildId, false);

  const description = tInteraction(
    interaction.locale,
    "vcAutoRecruit:user-response.disable_success",
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
      "vcAutoRecruit:log.config_disabled",
      {
        guildId,
      },
    ),
  );
}
