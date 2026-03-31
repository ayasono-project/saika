// src/bot/features/sticky-message/commands/usecases/stickyMessageRemove.ts
// sticky-message remove ユースケース

import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  type ChatInputCommandInteraction,
  MessageFlags,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import { getBotStickyMessageConfigService } from "../../../../services/botCompositionRoot";
import { createInfoEmbed } from "../../../../utils/messageResponse";
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
  const service = getBotStickyMessageConfigService();
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
  const options = stickies
    .slice(0, STICKY_MESSAGE_COMMAND.MAX_SELECT_OPTIONS)
    .map((sticky) => {
      const channel = interaction.guild?.channels.cache.get(sticky.channelId);
      const label = channel ? `#${channel.name}` : `#${sticky.channelId}`;
      const preview =
        sticky.content.length > 50
          ? `${sticky.content.substring(0, 50)}...`
          : sticky.content;

      return new StringSelectMenuOptionBuilder()
        .setLabel(label)
        .setValue(sticky.channelId)
        .setDescription(preview);
    });

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
    .addOptions(options);

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
