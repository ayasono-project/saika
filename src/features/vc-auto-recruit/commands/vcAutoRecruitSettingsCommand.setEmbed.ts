// src/features/vc-auto-recruit/commands/vcAutoRecruitSettingsCommand.setEmbed.ts
// vc-auto-recruit-settings set-embed 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { getBotVcAutoRecruitSettingsService } from "../../../bot/services/botCompositionRoot";
import { createSuccessEmbed } from "../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { VC_AUTO_RECRUIT_SETTINGS_COMMAND } from "./vcAutoRecruitSettingsCommand.constants";
import { ensureVcAutoRecruitManageGuildPermission } from "./vcAutoRecruitSettingsCommand.guard";

/**
 * 募集 Embed の有効/無効を切り替える
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleVcAutoRecruitSettingsSetEmbed(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureVcAutoRecruitManageGuildPermission(interaction);

  // Embed の有効/無効オプションを取得
  const enabled = interaction.options.getBoolean(
    VC_AUTO_RECRUIT_SETTINGS_COMMAND.OPTION.ENABLED,
    true,
  );

  await getBotVcAutoRecruitSettingsService().setEmbedEnabled(guildId, enabled);

  // Embed を無効にしてもデフォルト本文＋ボタンで投稿されるため投稿は空にならない
  const description = tInteraction(
    interaction.locale,
    enabled
      ? "vcAutoRecruit:user-response.set_embed_enabled"
      : "vcAutoRecruit:user-response.set_embed_disabled",
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
      "vcAutoRecruit:log.config_embed_set",
      {
        guildId,
        enabled: String(enabled),
      },
    ),
  );
}
