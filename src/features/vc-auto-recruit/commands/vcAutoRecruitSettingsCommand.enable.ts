// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.enable.ts
// vc-auto-recruit-settings enable 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/**
 * VC自動募集機能を有効化する
 * 投稿先チャンネルが未設定の場合はエラーを返す
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsEnable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  // 現在の設定を確認
  const config =
    await getBotVcAutoRecruitSettingsService().getVcAutoRecruitSettings(
      guildId,
    );

  // 投稿先チャンネルが未設定の場合は有効化できない
  if (!config?.channelId) {
    const description = tInteraction(
      interaction.locale,
      "vcAutoRecruit:user-response.enable_error_no_channel",
    );
    await interaction.reply({
      embeds: [
        createWarningEmbed(description, {
          title: tInteraction(
            interaction.locale,
            "common:title_config_required",
          ),
        }),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // 機能を有効化
  await getBotVcAutoRecruitSettingsService().setEnabled(guildId, true);

  const description = tInteraction(
    interaction.locale,
    "vcAutoRecruit:user-response.enable_success",
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
      "vcAutoRecruit:log.config_enabled",
      {
        guildId,
      },
    ),
  );
}
