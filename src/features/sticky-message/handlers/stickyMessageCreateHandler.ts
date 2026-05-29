// src/bot/features/sticky-message/handlers/stickyMessageCreateHandler.ts
// スティッキーメッセージ messageCreate イベントハンドラー

import { ChannelType, type Message } from "discord.js";
import { getBotStickyMessageResendService } from "../../../bot/services/botCompositionRoot";
import { notifyErrorChannel } from "../../../bot/shared/errorChannelNotifier";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";

/**
 * messageCreate イベントでスティッキーメッセージを処理する
 * Bot 自身の投稿は無視し、テキストチャンネルのみ処理する
 */
export async function handleStickyMessageCreate(
  message: Message,
): Promise<void> {
  // Bot 自身のメッセージは無視（無限ループ防止）
  if (message.author.bot) return;
  // ギルド外は対象外
  if (!message.guildId) return;

  // テキストチャンネル以外は対象外
  if (message.channel.type !== ChannelType.GuildText) return;

  try {
    const service = getBotStickyMessageResendService();
    await service.handleMessageCreate(message.channel, message.guildId);
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.sticky_message",
        "stickyMessage:log.create_handler_error",
        {
          channelId: message.channelId,
          guildId: message.guildId,
        },
      ),
      { channelId: message.channelId, guildId: message.guildId, err },
    );
    if (message.guild) {
      await notifyErrorChannel(message.guild, err, {
        feature: "メッセージ固定",
        action: "再送処理の失敗",
      });
    }
  }
}
