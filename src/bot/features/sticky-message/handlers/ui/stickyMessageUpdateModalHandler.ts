// src/bot/features/sticky-message/handlers/ui/stickyMessageUpdateModalHandler.ts
// sticky-message update（プレーンテキスト）モーダル送信処理

import {
  ChannelType,
  MessageFlags,
  type ModalSubmitInteraction,
  type TextChannel,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { ModalHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotStickyMessageConfigService } from "../../../../services/botCompositionRoot";
import {
  createInfoEmbed,
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import { STICKY_MESSAGE_COMMAND } from "../../commands/stickyMessageCommand.constants";
import { buildStickyMessagePayload } from "../../services/stickyMessagePayloadBuilder";

export const stickyMessageUpdateModalHandler: ModalHandler = {
  /**
   * ハンドラー対象の customId かを判定する
   * @param customId 判定対象の customId
   * @returns sticky-message update テキストモーダルなら true
   */
  matches(customId) {
    return customId.startsWith(STICKY_MESSAGE_COMMAND.UPDATE_MODAL_ID_PREFIX);
  },

  /**
   * sticky-message update プレーンテキストモーダルの送信を処理する
   * @param interaction モーダルインタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction: ModalSubmitInteraction) {
    const guild = interaction.guild;
    if (!guild) {
      return;
    }

    const guildId = guild.id;

    // customId からチャンネル ID を抽出する
    const channelId = interaction.customId.slice(
      STICKY_MESSAGE_COMMAND.UPDATE_MODAL_ID_PREFIX.length,
    );

    // モーダルのテキスト入力値を取得する
    const content = interaction.fields.getTextInputValue(
      STICKY_MESSAGE_COMMAND.MODAL_INPUT.MESSAGE,
    );

    if (!content.trim()) {
      await interaction.reply({
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "stickyMessage:user-response.empty_message",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_invalid_input",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const service = getBotStickyMessageConfigService();

    // モーダル表示から送信までの間に削除された可能性があるため再確認する
    const existing = await service.findByChannel(channelId);
    if (!existing) {
      await interaction.reply({
        embeds: [
          createInfoEmbed(
            tInteraction(
              interaction.locale,
              "stickyMessage:user-response.remove_not_found",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "stickyMessage:embed.title.update_not_found",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      // プレーンテキストとして更新する（embedData を null に設定）
      const updated = await service.updateContent(
        existing.id,
        content,
        null,
        interaction.user.id,
      );

      const fetchedUpdateChannel = await guild.channels
        .fetch(channelId)
        .catch(() => null);
      const textChannel =
        fetchedUpdateChannel?.type === ChannelType.GuildText
          ? (fetchedUpdateChannel as TextChannel)
          : undefined;

      if (textChannel && existing.lastMessageId) {
        // 古いスティッキーメッセージを削除する
        try {
          const msg = await textChannel.messages.fetch(existing.lastMessageId);
          await msg.delete();
        } catch {
          // 既に削除済みは無視する
        }
        // 新しい内容でスティッキーメッセージを送信する
        try {
          const payload = buildStickyMessagePayload(updated);
          const sent = await textChannel.send(payload);
          await service.updateLastMessageId(updated.id, sent.id);
        } catch (err) {
          logger.error(
            logPrefixed(
              "system:log_prefix.sticky_message",
              "stickyMessage:log.resend_after_update_failed",
              {
                channelId,
              },
            ),
            { channelId, err },
          );
        }
      }

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            tInteraction(
              interaction.locale,
              "stickyMessage:user-response.update_success",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "stickyMessage:embed.title.update_success",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      logger.error(
        logPrefixed(
          "system:log_prefix.sticky_message",
          "stickyMessage:log.update_failed",
          {
            channelId,
            guildId,
          },
        ),
        { channelId, guildId, err },
      );
      throw err;
    }
  },
};
