// src/bot/features/member-log/commands/memberLogConfigCommand.disable.ts
// member-log-config disable 実行処理

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotMemberLogConfigService } from "../../../services/botCompositionRoot";
import { createSuccessEmbed } from "../../../utils/messageResponse";
import { ensureMemberLogManageGuildPermission } from "./memberLogConfigCommand.guard";

/**
 * メンバーログ機能を無効化する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleMemberLogConfigDisable(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureMemberLogManageGuildPermission(interaction);

  // 機能を無効化
  await getBotMemberLogConfigService().setEnabled(guildId, false);

  const description = tInteraction(
    interaction.locale,
    "memberLog:user-response.disable_success",
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
      "system:log_prefix.member_log",
      "memberLog:log.config_disabled",
      { guildId },
    ),
  );
}
