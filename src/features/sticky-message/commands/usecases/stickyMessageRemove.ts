// sticky-message remove ユースケース

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
} from "discord.js";
import { getBotStickyMessageSettingsService } from "../../../../bot/services/botCompositionRoot";
import { createInfoEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { buildStickySelectOptions } from "../helpers/stickyMessageSelectOptions";
import { STICKY_MESSAGE_COMMAND } from "../stickyMessageCommand.constants";

/**
 * sticky-message remove を実行する
 * ギルドで設定済みの全チャンネルを StringSelectMenu（複数選択可）で提示し、
 * ユーザーが選択したチャンネルのスティッキーメッセージを一括削除する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleStickyMessageRemove(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  const service = getBotStickyMessageSettingsService();
  const stickies = await service.findAllByGuild(guildId);

  if (stickies.length === 0) {
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
              "stickyMessage:embed.title.remove_not_found",
            ),
          },
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // StringSelectMenu を構築（複数選択可）
  const select = new StringSelectMenuBuilder()
    .setCustomId(STICKY_MESSAGE_COMMAND.REMOVE_SELECT_CUSTOM_ID)
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "stickyMessage:ui.select.remove_placeholder",
      ),
    )
    .setMinValues(1)
    .setMaxValues(
      Math.min(stickies.length, STICKY_MESSAGE_COMMAND.MAX_SELECT_OPTIONS),
    )
    .addOptions(buildStickySelectOptions(interaction.guild, stickies));

  const selectRow =
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

  const button = new ButtonBuilder()
    .setCustomId(STICKY_MESSAGE_COMMAND.REMOVE_BUTTON_CUSTOM_ID)
    .setLabel(
      tInteraction(interaction.locale, "stickyMessage:ui.button.remove"),
    )
    .setStyle(ButtonStyle.Danger);

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(button);

  await interaction.reply({
    components: [selectRow, buttonRow],
    flags: MessageFlags.Ephemeral,
  });
}
