// src/features/vc-command/commands/usecases/vcDisconnect.ts
// /vc disconnect ユースケース（個別切断 + VC全員の一括切断）

import { ValidationError } from "@ayasono/shared/core";
import type { ChatInputCommandInteraction } from "discord.js";
import {
  formatActionLog,
  resolveAuditReason,
} from "../../../../bot/shared/vcActionLog";
import {
  fetchMemberInVoice,
  fetchNonEmptyVoiceChannel,
  resolveVcActionTarget,
} from "../../../../bot/shared/vcActionTarget";
import { presentBulkConfirm } from "../../../../bot/shared/vcBulkAction";
import {
  logCommand,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { VC_COMMAND } from "../vcCommand.constants";

/**
 * 対象メンバーを個別にVCから切断する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @param userId 切断対象ユーザーID
 * @param reason ユーザー指定の理由（任意）
 * @returns 実行完了を示す Promise
 */
async function disconnectMember(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  userId: string,
  reason: string | undefined,
): Promise<void> {
  const member = await fetchMemberInVoice(interaction, userId);

  await member.voice.disconnect(
    resolveAuditReason("disconnect", interaction.locale, reason),
  );

  const embed = formatActionLog({
    action: "disconnect",
    locale: interaction.locale,
    invokerId: interaction.user.id,
    targetUserId: userId,
    reason,
  });
  await interaction.reply({ embeds: [embed] });

  logger.info(
    logCommand("/vc disconnect", "vc:log.disconnected", {
      guildId,
      targetId: userId,
    }),
  );
}

/**
 * /vc disconnect 実行処理
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function executeVcDisconnect(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const reason =
    interaction.options.getString(VC_COMMAND.OPTION.REASON) ?? undefined;
  const target = resolveVcActionTarget(
    interaction,
    VC_COMMAND.OPTION.TARGET_MEMBER,
    VC_COMMAND.OPTION.TARGET_CHANNEL,
  );

  if (target.kind === "none") {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.target_required"),
    );
  }

  // target=channel: 確認ダイアログ経由で一括切断
  if (target.kind === "channel") {
    const channel = await fetchNonEmptyVoiceChannel(
      interaction,
      target.channelId,
    );
    await presentBulkConfirm(
      interaction,
      {
        action: "disconnect",
        guildId,
        invokerId: interaction.user.id,
        locale: interaction.locale,
        sourceChannelId: channel.id,
        reason,
      },
      [...channel.members.keys()],
    );
    return;
  }

  // target=member: 即時に個別切断
  await disconnectMember(interaction, guildId, target.userId, reason);
}
