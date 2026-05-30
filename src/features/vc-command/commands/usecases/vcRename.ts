// src/bot/features/vc-command/commands/usecases/vcRename.ts
// VC名変更ユースケース

import type { ChatInputCommandInteraction } from "discord.js";
import { createSuccessEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { resolveVoiceChannelForEdit } from "../helpers/vcVoiceChannelResolver";
import { VC_COMMAND } from "../vcCommand.constants";

/**
 * VC名変更処理
 * @param interaction コマンド実行インタラクション
 * @param channelId 変更対象VCのチャンネルID
 * @returns 実行完了を示す Promise
 */
export async function executeVcRename(
  interaction: ChatInputCommandInteraction,
  channelId: string,
): Promise<void> {
  const newName = interaction.options.getString(VC_COMMAND.OPTION.NAME, true);
  const channel = await resolveVoiceChannelForEdit(interaction, channelId);

  await channel.edit({ name: newName });

  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "vc:user-response.renamed", {
      name: newName,
      channel: channelId,
    }),
  );
  // 共有リソース（VC名）の変更のため public で応答する
  await interaction.reply({ embeds: [embed] });
}
