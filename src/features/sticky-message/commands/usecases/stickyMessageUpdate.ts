// sticky-message update ユースケース

import {
  type ChatInputCommandInteraction,
  MessageFlags,
  ModalBuilder,
} from "discord.js";
import { getBotStickyMessageSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createInfoEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import {
  buildStickyEmbedModalRows,
  buildStickyMessageModalRow,
} from "../helpers/stickyMessageModalInputs";
import { resolveStickyTargetChannelId } from "../helpers/stickyMessageTargetChannel";
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
  const targetChannelId = await resolveStickyTargetChannelId(interaction);
  if (!targetChannelId) return;

  const service = getBotStickyMessageSettingsService();
  const existing = await service.findByChannel(targetChannelId);

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
    const modal = new ModalBuilder()
      .setCustomId(
        `${STICKY_MESSAGE_COMMAND.UPDATE_EMBED_MODAL_ID_PREFIX}${targetChannelId}`,
      )
      .setTitle(
        tInteraction(
          interaction.locale,
          "stickyMessage:ui.modal.update_embed_title",
        ),
      )
      .addComponents(
        ...buildStickyEmbedModalRows(
          interaction.locale,
          existing.embedData ?? {},
        ),
      );

    await interaction.showModal(modal);
  } else {
    // 既存のテキスト内容を事前入力してプレーンテキストモーダルを表示する
    const modal = new ModalBuilder()
      .setCustomId(
        `${STICKY_MESSAGE_COMMAND.UPDATE_MODAL_ID_PREFIX}${targetChannelId}`,
      )
      .setTitle(
        tInteraction(interaction.locale, "stickyMessage:ui.modal.update_title"),
      )
      .addComponents(
        buildStickyMessageModalRow(
          interaction.locale,
          {
            label: "stickyMessage:ui.modal.update_message_label",
            placeholder: "stickyMessage:ui.modal.update_message_placeholder",
          },
          existing.content,
        ),
      );

    await interaction.showModal(modal);
  }
}
