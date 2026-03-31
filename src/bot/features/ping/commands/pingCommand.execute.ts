// src/bot/features/ping/commands/pingCommand.execute.ts
// ping コマンド実行処理

import type { ChatInputCommandInteraction } from "discord.js";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  createInfoEmbed,
  createSuccessEmbed,
} from "../../../utils/messageResponse";

const PING_I18N_KEYS = {
  EMBED_MEASURING: "ping:user-response.measuring",
  EMBED_RESPONSE: "ping:user-response.result",
} as const;

/**
 * ping コマンド実行入口
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function executePingCommand(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  const measuring = tInteraction(
    interaction.locale,
    PING_I18N_KEYS.EMBED_MEASURING,
  );
  // 計測中の一時表示（後続で結果Embedに差し替え）
  await interaction.reply({
    embeds: [createInfoEmbed(measuring)],
  });
  const sent = await interaction.fetchReply();

  const apiLatency = sent.createdTimestamp - interaction.createdTimestamp;
  const wsLatency = interaction.client.ws.ping;

  const description = tInteraction(
    interaction.locale,
    PING_I18N_KEYS.EMBED_RESPONSE,
    {
      apiLatency,
      wsLatency,
    },
  );

  const embed = createSuccessEmbed(description);

  await interaction.editReply({
    embeds: [embed],
  });
}
