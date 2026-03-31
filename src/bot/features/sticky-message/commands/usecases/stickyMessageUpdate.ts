// src/bot/features/sticky-message/commands/usecases/stickyMessageUpdate.ts
// sticky-message update ユースケース

import {
  ActionRowBuilder,
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotStickyMessageConfigService } from "../../../../services/botCompositionRoot";
import {
  createInfoEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";
import type { StickyEmbedData } from "../../services/stickyMessagePayloadBuilder";
import { STICKY_MESSAGE_COMMAND } from "../stickyMessageCommand.constants";

/**
 * sticky-message update を実行する
 * 既存設定を確認し、embed オプションに応じた更新モーダルを表示する
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function handleStickyMessageUpdate(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // channel: 省略時はコマンド実行チャンネルを対象にする
  const channelOption = interaction.options.getChannel(
    STICKY_MESSAGE_COMMAND.OPTION.CHANNEL,
    false,
  );
  const targetChannel = channelOption ?? interaction.channel;

  if (!targetChannel || targetChannel.type !== ChannelType.GuildText) {
    await interaction.reply({
      embeds: [
        createWarningEmbed(
          tInteraction(
            interaction.locale,
            "stickyMessage:user-response.text_channel_only",
          ),
          {
            title: tInteraction(
              interaction.locale,
              "common:title_channel_invalid",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  const service = getBotStickyMessageConfigService();
  const existing = await service.findByChannel(targetChannel.id);

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

  const useEmbed =
    interaction.options.getString(STICKY_MESSAGE_COMMAND.OPTION.STYLE) ===
    STICKY_MESSAGE_COMMAND.OPTION_VALUE.EMBED;

  if (useEmbed) {
    // 既存の Embed データを読み込んでモーダルを事前入力する
    const prev = existing.embedData
      ? (JSON.parse(existing.embedData) as StickyEmbedData)
      : {};

    const titleInput = new TextInputBuilder()
      .setCustomId(STICKY_MESSAGE_COMMAND.MODAL_INPUT.EMBED_TITLE)
      .setLabel(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_embed_title_label",
        ),
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_embed_title_placeholder",
        ),
      )
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(256);
    if (prev.title) titleInput.setValue(prev.title);

    const descriptionInput = new TextInputBuilder()
      .setCustomId(STICKY_MESSAGE_COMMAND.MODAL_INPUT.EMBED_DESCRIPTION)
      .setLabel(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_embed_description_label",
        ),
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_embed_description_placeholder",
        ),
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(false)
      .setMaxLength(4000);
    if (prev.description) descriptionInput.setValue(prev.description);

    const colorInput = new TextInputBuilder()
      .setCustomId(STICKY_MESSAGE_COMMAND.MODAL_INPUT.EMBED_COLOR)
      .setLabel(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_embed_color_label",
        ),
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_embed_color_placeholder",
        ),
      )
      .setStyle(TextInputStyle.Short)
      .setRequired(false)
      .setMaxLength(20);
    if (prev.color) {
      // 数値カラーを #RRGGBB 形式の文字列に変換して事前入力する
      colorInput.setValue(`#${prev.color.toString(16).padStart(6, "0")}`);
    }

    const modal = new ModalBuilder()
      .setCustomId(
        `${STICKY_MESSAGE_COMMAND.UPDATE_EMBED_MODAL_ID_PREFIX}${targetChannel.id}`,
      )
      .setTitle(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.update_embed_title",
        ),
      )
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(
          descriptionInput,
        ),
      );

    await interaction.showModal(modal);
  } else {
    // 既存のテキスト内容を事前入力してプレーンテキストモーダルを表示する
    const messageInput = new TextInputBuilder()
      .setCustomId(STICKY_MESSAGE_COMMAND.MODAL_INPUT.MESSAGE)
      .setLabel(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.update_message_label",
        ),
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.update_message_placeholder",
        ),
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000)
      .setValue(existing.content.substring(0, 2000));

    const modal = new ModalBuilder()
      .setCustomId(
        `${STICKY_MESSAGE_COMMAND.UPDATE_MODAL_ID_PREFIX}${targetChannel.id}`,
      )
      .setTitle(
        tInteraction(interaction.locale, "stickyMessage:ui.modal.update_title"),
      )
      .addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
      );

    await interaction.showModal(modal);
  }
}
