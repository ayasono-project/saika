// src/bot/features/vc-command/commands/usecases/vcVoiceChannelGuard.ts
// VC操作コマンドの操作対象VCガード

import { ValidationError } from "@ayasono/shared/core";
import { ChannelType, type ChatInputCommandInteraction } from "discord.js";
import {
  getBotVacSettingsService,
  getBotVcRecruitRepository,
} from "../../../../bot/services/botCompositionRoot";
import { tInteraction } from "../../../../shared/locale/localeManager";

/**
 * 実行者が参加中のVCがBot管理下（VAC または VC募集）かを確認する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 管理対象VCの最小情報
 */
export async function getManagedVoiceChannel(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<{ id: string }> {
  // 実行者の現在接続VCを取得
  const member = await interaction.guild?.members.fetch(interaction.user.id);
  const voiceChannel = member?.voice.channel;

  if (!voiceChannel || voiceChannel.type !== ChannelType.GuildVoice) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.not_in_any_vc"),
    );
  }

  // VAC管理下かチェック
  const isVacManaged = await getBotVacSettingsService().isManagedVacChannel(
    guildId,
    voiceChannel.id,
  );
  if (isVacManaged) {
    return { id: voiceChannel.id };
  }

  // VC募集の新規作成VCかチェック
  const isVcRecruitManaged =
    await getBotVcRecruitRepository().isCreatedVcRecruitChannel(
      guildId,
      voiceChannel.id,
    );
  if (isVcRecruitManaged) {
    return { id: voiceChannel.id };
  }

  throw new ValidationError(
    tInteraction(interaction.locale, "vc:user-response.not_managed_channel"),
  );
}
