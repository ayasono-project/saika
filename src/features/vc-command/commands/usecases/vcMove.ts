// src/features/vc-command/commands/usecases/vcMove.ts
// /vc move ユースケース（個別移動 + VC全員の一括移動）

import { ValidationError } from "@ayasono/shared/core";
import { ChannelType, type ChatInputCommandInteraction } from "discord.js";
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
 * 対象メンバーを個別に移動先VCへ移動する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @param userId 移動対象ユーザーID
 * @param toChannelId 移動先VCチャンネルID
 * @param reason ユーザー指定の理由（任意）
 * @returns 実行完了を示す Promise
 */
async function moveMember(
  interaction: ChatInputCommandInteraction,
  guildId: string,
  userId: string,
  toChannelId: string,
  reason: string | undefined,
): Promise<void> {
  const member = await fetchMemberInVoice(interaction, userId);

  const destination = await interaction.guild?.channels
    .fetch(toChannelId)
    .catch(() => null);
  if (!destination || destination.type !== ChannelType.GuildVoice) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.target_not_voice"),
    );
  }

  await member.voice.setChannel(
    destination,
    resolveAuditReason("move", interaction.locale, reason),
  );

  const embed = formatActionLog({
    action: "move",
    locale: interaction.locale,
    invokerId: interaction.user.id,
    targetUserId: userId,
    destinationChannelId: toChannelId,
    reason,
  });
  await interaction.reply({ embeds: [embed] });

  logger.info(
    logCommand("/vc move", "vc:log.move_executed", {
      guildId,
      targetId: userId,
      channelId: toChannelId,
    }),
  );
}

/**
 * /vc move 実行処理
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function executeVcMove(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const reason =
    interaction.options.getString(VC_COMMAND.OPTION.REASON) ?? undefined;
  const toChannel = interaction.options.getChannel(VC_COMMAND.OPTION.TO, true);
  if (toChannel.type !== ChannelType.GuildVoice) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.target_not_voice"),
    );
  }

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

  // target=channel: 確認ダイアログ経由で一括移動
  if (target.kind === "channel") {
    // 移動元と移動先が同一なら no-op エラー
    if (target.channelId === toChannel.id) {
      throw new ValidationError(
        tInteraction(interaction.locale, "vc:user-response.same_channel"),
      );
    }
    const channel = await fetchNonEmptyVoiceChannel(
      interaction,
      target.channelId,
    );
    await presentBulkConfirm(
      interaction,
      {
        action: "move",
        guildId,
        invokerId: interaction.user.id,
        locale: interaction.locale,
        sourceChannelId: channel.id,
        destinationChannelId: toChannel.id,
        reason,
      },
      [...channel.members.keys()],
    );
    return;
  }

  // target=member: 即時に個別移動
  await moveMember(interaction, guildId, target.userId, toChannel.id, reason);
}
