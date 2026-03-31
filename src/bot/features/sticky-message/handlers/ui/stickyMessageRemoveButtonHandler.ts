// src/bot/features/sticky-message/handlers/ui/stickyMessageRemoveButtonHandler.ts
// sticky-message remove の「削除する」ボタン押下を処理する

import {
  type ButtonInteraction,
  ChannelType,
  type TextChannel,
} from "discord.js";
import { tInteraction } from "../../../../../shared/locale/localeManager";
import type { ButtonHandler } from "../../../../handlers/interactionCreate/ui/types";
import { getBotStickyMessageConfigService } from "../../../../services/botCompositionRoot";
import {
  createInfoEmbed,
  createSuccessEmbed,
} from "../../../../utils/messageResponse";
import { STICKY_MESSAGE_COMMAND } from "../../commands/stickyMessageCommand.constants";
import { stickyMessageRemoveSelections } from "./stickyMessageRemoveState";

export const stickyMessageRemoveButtonHandler: ButtonHandler = {
  matches(customId) {
    return customId === STICKY_MESSAGE_COMMAND.REMOVE_BUTTON_CUSTOM_ID;
  },

  async execute(interaction: ButtonInteraction) {
    const guildId = interaction.guildId;
    if (!guildId) return;

    const key = `${guildId}:${interaction.user.id}`;
    const selectedChannelIds = stickyMessageRemoveSelections.get(key);

    // セレクトメニューで何も選択せずにボタンを押した場合
    if (!selectedChannelIds || selectedChannelIds.length === 0) {
      await interaction.reply({
        embeds: [
          createInfoEmbed(
            tInteraction(
              interaction.locale,
              "stickyMessage:user-response.remove_no_selection",
            ),
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    // 一時保存をクリア
    stickyMessageRemoveSelections.delete(key);

    const service = getBotStickyMessageConfigService();
    const deletedChannels: string[] = [];

    for (const channelId of selectedChannelIds) {
      const existing = await service.findByChannel(channelId);
      if (!existing) continue;

      // チャンネルの最後のスティッキーメッセージを削除（失敗は無視）
      if (existing.lastMessageId) {
        const fetchedChannel = await interaction.guild?.channels
          .fetch(channelId)
          .catch(() => null);
        const textChannel =
          fetchedChannel?.type === ChannelType.GuildText
            ? (fetchedChannel as TextChannel)
            : undefined;
        if (textChannel) {
          try {
            const msg = await textChannel.messages.fetch(
              existing.lastMessageId,
            );
            await msg.delete();
          } catch {
            // 既に削除済みの場合は無視
          }
        }
      }

      await service.delete(existing.id);
      deletedChannels.push(channelId);
    }

    // コンポーネントを除去して結果を表示
    const channelMentions = deletedChannels.map((id) => `<#${id}>`).join(", ");

    await interaction.update({
      embeds: [
        createSuccessEmbed(
          tInteraction(
            interaction.locale,
            "stickyMessage:user-response.remove_success",
            { count: deletedChannels.length },
          ),
          {
            title: tInteraction(
              interaction.locale,
              "stickyMessage:embed.title.remove_success",
            ),
            fields:
              deletedChannels.length > 0
                ? [
                    {
                      name: tInteraction(
                        interaction.locale,
                        "stickyMessage:embed.field.name.removed_channels",
                      ),
                      value: channelMentions,
                      inline: false,
                    },
                  ]
                : undefined,
          },
        ),
      ],
      components: [],
    });
  },
};
