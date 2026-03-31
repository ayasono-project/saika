// src/bot/features/vc-command/commands/usecases/vcRename.ts
// VC名変更ユースケース

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { createSuccessEmbed } from "../../../../utils/messageResponse";
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
    }),
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
