// sticky-message set ユースケース

import {
  type ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
} from "discord.js";
import { getBotStickyMessageSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createWarningEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  buildStickyEmbedModalRows,
  buildStickyMessageModalRow,
} from "../helpers/stickyMessageModalInputs";
import { resolveStickyTargetChannelId } from "../helpers/stickyMessageTargetChannel";
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
  const targetChannelId = await resolveStickyTargetChannelId(interaction);
  if (!targetChannelId) return;

  const service = getBotStickyMessageSettingsService();

  // 同チャンネルに既存設定がないか確認する
  const existing = await service.findByChannel(targetChannelId);
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
        `${STICKY_MESSAGE_COMMAND.SET_EMBED_MODAL_ID_PREFIX}${targetChannelId}`,
      )
      .setTitle(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.set_embed_title",
        ),
      )
      .addComponents(...buildStickyEmbedModalRows(interaction.locale));

    await interaction.showModal(modal);
  } else {
    // プレーンテキストモーダルを表示する
    const modal = new ModalBuilder()
      .setCustomId(
        `${STICKY_MESSAGE_COMMAND.SET_MODAL_ID_PREFIX}${targetChannelId}`,
      )
      .setTitle(
        tInteraction(interaction.locale, "stickyMessage:ui.modal.set_title"),
      )
      .addComponents(
        buildStickyMessageModalRow(interaction.locale, {
          label: "stickyMessage:ui.modal.set_message_label",
          placeholder: "stickyMessage:ui.modal.set_message_placeholder",
        }),
      );

    await interaction.showModal(modal);
  }
}
