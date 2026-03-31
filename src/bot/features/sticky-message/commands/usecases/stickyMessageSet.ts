// src/bot/features/sticky-message/commands/usecases/stickyMessageSet.ts
// sticky-message set ユースケース

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
import { createWarningEmbed } from "../../../../utils/messageResponse";
import { STICKY_MESSAGE_COMMAND } from "../stickyMessageCommand.constants";

/**
 * sticky-message set を実行する
 * チャンネルを検証し、embed オプションに応じたモーダルを表示する
 * @param interaction コマンド実行インタラクション
 * @returns 実行完了を示す Promise
 */
export async function handleStickyMessageSet(
  interaction: ChatInputCommandInteraction,
): Promise<void> {
  // channel: 第2引数 false で任意。省略時はコマンド実行チャンネルを対象にする
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

  // 同チャンネルに既存設定がないか確認する
  const existing = await service.findByChannel(targetChannel.id);
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

  const useEmbed =
    interaction.options.getString(STICKY_MESSAGE_COMMAND.OPTION.STYLE) ===
    STICKY_MESSAGE_COMMAND.OPTION_VALUE.EMBED;

  if (useEmbed) {
    // Embed モーダルを表示する（tInteraction は同期）
    const modal = new ModalBuilder()
      .setCustomId(
        `${STICKY_MESSAGE_COMMAND.SET_EMBED_MODAL_ID_PREFIX}${targetChannel.id}`,
      )
      .setTitle(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_embed_title",
        ),
      );

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

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(colorInput),
      new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
    );

    await interaction.showModal(modal);
  } else {
    // プレーンテキストモーダルを表示する
    const modal = new ModalBuilder()
      .setCustomId(
        `${STICKY_MESSAGE_COMMAND.SET_MODAL_ID_PREFIX}${targetChannel.id}`,
      )
      .setTitle(
        tInteraction(interaction.locale, "stickyMessage:ui.modal.set_title"),
      );

    const messageInput = new TextInputBuilder()
      .setCustomId(STICKY_MESSAGE_COMMAND.MODAL_INPUT.MESSAGE)
      .setLabel(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_message_label",
        ),
      )
      .setPlaceholder(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_message_placeholder",
        ),
      )
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true)
      .setMaxLength(2000);

    modal.addComponents(
      new ActionRowBuilder<TextInputBuilder>().addComponents(messageInput),
    );

    await interaction.showModal(modal);
  }
}
