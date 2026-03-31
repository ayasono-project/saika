// src/bot/features/vc-command/commands/usecases/vcLimit.ts
// VC人数制限変更ユースケース

import { type ChatInputCommandInteraction, MessageFlags } from "discord.js";
import { ValidationError } from "../../../../../shared/errors/customErrors";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { createSuccessEmbed } from "../../../../utils/messageResponse";
import { resolveVoiceChannelForEdit } from "../helpers/vcVoiceChannelResolver";
import { VC_COMMAND } from "../vcCommand.constants";

/**
 * VC人数制限変更処理
 * @param interaction コマンド実行インタラクション
 * @param channelId 変更対象VCのチャンネルID
 * @returns 実行完了を示す Promise
 */
export async function executeVcLimit(
  interaction: ChatInputCommandInteraction,
  channelId: string,
): Promise<void> {
  const limit = interaction.options.getInteger(VC_COMMAND.OPTION.LIMIT, true);

  if (limit < VC_COMMAND.LIMIT_MIN || limit > VC_COMMAND.LIMIT_MAX) {
    throw new ValidationError(
      tInteraction(interaction.locale, "vc:user-response.limit_out_of_range"),
    );
  }

  const channel = await resolveVoiceChannelForEdit(interaction, channelId);

  await channel.edit({ userLimit: limit });

  const limitLabel =
    limit === 0
      ? tInteraction(interaction.locale, "vc:user-response.unlimited")
      : String(limit);
  const embed = createSuccessEmbed(
    tInteraction(interaction.locale, "vc:user-response.limit_changed", {
      limit: limitLabel,
    }),
  );
  await interaction.reply({
    embeds: [embed],
    flags: MessageFlags.Ephemeral,
  });
}
