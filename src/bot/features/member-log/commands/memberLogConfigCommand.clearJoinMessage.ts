// src/bot/features/member-log/commands/memberLogConfigCommand.clearJoinMessage.ts
// member-log-config clear-join-message 実行処理

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
 * カスタム参加メッセージを削除する
 * @param interaction コマンド実行インタラクション
 * @param guildId 設定更新対象のギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleMemberLogConfigClearJoinMessage(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // 実行時にも管理権限を確認
  await ensureMemberLogManageGuildPermission(interaction);

  // 参加メッセージを削除
  await getBotMemberLogConfigService().clearJoinMessage(guildId);

  const description = tInteraction(
    interaction.locale,
    "memberLog:user-response.clear_join_message_success",
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
      "memberLog:log.config_join_message_cleared",
      { guildId },
    ),
  );
}
