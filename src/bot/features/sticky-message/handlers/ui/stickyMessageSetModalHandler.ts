// src/bot/features/sticky-message/handlers/ui/stickyMessageSetModalHandler.ts
// sticky-message set モーダル送信処理（プレーンテキスト入力）

import {
  ChannelType,
  MessageFlags,
  type ModalSubmitInteraction,
  type TextChannel,
} from "discord.js";
import { ValidationError } from "../../../../../shared/errors/customErrors";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import type { ModalHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotStickyMessageConfigService } from "../../../../services/botCompositionRoot";
import {
  createSuccessEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import { STICKY_MESSAGE_COMMAND } from "../../commands/stickyMessageCommand.constants";
import { buildStickyMessagePayload } from "../../services/stickyMessagePayloadBuilder";

export const stickyMessageSetModalHandler: ModalHandler = {
  /**
   * ハンドラー対象の customId かを判定する
   * @param customId 判定対象の customId
   * @returns sticky-message set モーダルなら true
   */
  matches(customId) {
    return customId.startsWith(STICKY_MESSAGE_COMMAND.SET_MODAL_ID_PREFIX);
  },

  /**
   * sticky-message set モーダルの送信を処理する
   * @param interaction モーダルインタラクション
   * @returns 実行完了を示す Promise
   */
  async execute(interaction: ModalSubmitInteraction) {
    // guild がないコンテキスト（DM 等）は処理対象外
    const guild = interaction.guild;
    if (!guild) {
      return;
    }

    const guildId = guild.id;

    // customId からチャンネル ID を抽出する
    const channelId = interaction.customId.slice(
      STICKY_MESSAGE_COMMAND.SET_MODAL_ID_PREFIX.length,
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

    // モーダル表示から送信までの間に他のユーザーが設定した可能性があるため再確認する
    const existing = await service.findByChannel(channelId);
    if (existing) {
      await interaction.reply({
        embeds: [
          createWarningEmbed(
            tInteraction(
              interaction.locale,
              "stickyMessage:user-response.already_exists",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_already_registered",
              ),
            },
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    // Guild テキストチャンネル取得（キャッシュ未登録でも API で取得）
    const fetchedSetChannel = await guild.channels
      .fetch(channelId)
      .catch(() => null);
    const textChannel =
      fetchedSetChannel?.type === ChannelType.GuildText
        ? (fetchedSetChannel as TextChannel)
        : undefined;
    if (!textChannel) {
      throw new ValidationError(
        tInteraction(
          interaction.locale,
          "stickyMessage:user-response.text_channel_only",
        ),
      );
    }

    try {
      // DB に保存（プレーンテキストなので embedData は undefined）
      const stickyRecord = await service.create(
        guildId,
        channelId,
        content,
        undefined,
        interaction.user.id,
      );

      // チャンネルに実際にメッセージを送信
      const sendPayload = buildStickyMessagePayload(stickyRecord);
      const sent = await textChannel.send(sendPayload);

      // lastMessageId を更新
      await service.updateLastMessageId(stickyRecord.id, sent.id);

      await interaction.reply({
        embeds: [
          createSuccessEmbed(
            tInteraction(
              interaction.locale,
              "stickyMessage:user-response.set_success",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "stickyMessage:embed.title.set_success",
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
          "stickyMessage:log.set_failed",
          { channelId, guildId },
        ),
        { channelId, guildId, err },
      );
      throw err;
    }
  },
};
