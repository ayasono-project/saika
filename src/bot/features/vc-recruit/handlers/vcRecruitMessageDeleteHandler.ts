// src/bot/features/vc-recruit/handlers/vcRecruitMessageDeleteHandler.ts
// VC募集パネルメッセージ削除の自己修復ハンドラー

import { type Message, type PartialMessage } from "discord.js";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotVcRecruitRepository } from "../../../services/botCompositionRoot";
import { buildVcRecruitPanelComponents } from "../commands/vcRecruitPanelEmbed";

/**
 * messageDelete 時にVC募集パネルメッセージが削除されていた場合、再送信して DB を更新する
 * @param message 削除されたメッセージ（Partial の場合あり）
 */
export async function handleVcRecruitMessageDelete(
  message: Message | PartialMessage,
): Promise<void> {
  if (!message.guildId || !message.channelId) return;

  const guildId = message.guildId;
  const repo = getBotVcRecruitRepository();

  // 削除されたメッセージのチャンネルがパネルチャンネルとして登録されているか確認
  const setup = await repo.findSetupByPanelChannelId(
    guildId,
    message.channelId,
  );
  if (!setup) return;

  // 削除されたのがパネルメッセージ本体かを確認
  if (setup.panelMessageId !== message.id) return;

  logger.info(
    logPrefixed(
      "system:log_prefix.vc_recruit",
      "vcRecruit:log.panel_delete_detected",
      {
        guildId,
        panelChannelId: message.channelId,
        messageId: message.id,
      },
    ),
  );

  // パネルチャンネルを取得
  const guild = (message as Message).guild;
  if (!guild) return;

  const panelChannel = await guild.channels
    .fetch(setup.panelChannelId)
    .catch(() => null);
  if (!panelChannel || !panelChannel.isSendable()) return;

  // パネルメッセージを再送信
  const { embed, row } = await buildVcRecruitPanelComponents(
    guildId,
    setup.panelChannelId,
  );

  const newMessage = await panelChannel
    .send({ embeds: [embed], components: [row] })
    .catch(() => null);
  if (!newMessage) return;

  // DB の panelMessageId を更新
  await repo.updatePanelMessageId(guildId, setup.panelChannelId, newMessage.id);

  logger.info(
    logPrefixed("system:log_prefix.vc_recruit", "vcRecruit:log.panel_resent", {
      guildId,
      panelChannelId: setup.panelChannelId,
      newMessageId: newMessage.id,
    }),
  );
}
