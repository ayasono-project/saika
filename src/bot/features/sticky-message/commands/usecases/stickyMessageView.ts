// src/bot/features/sticky-message/commands/usecases/stickyMessageView.ts
// sticky-message view ユースケース

import {
  ActionRowBuilder,
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
 * sticky-message view を実行する
 * ギルドで設定済みの全チャンネルを StringSelectMenu で提示し、
 * ユーザーが選択したチャンネルの詳細を表示する
 * @param interaction コマンド実行インタラクション
 * @param guildId 実行対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function handleStickyMessageView(
  interaction: ChatInputCommandInteraction,
  guildId: string,
): Promise<void> {
  // ギルド内の全スティッキーメッセージ設定を取得する
  const service = getBotStickyMessageConfigService();
  const stickies = await service.findAllByGuild(guildId);

  if (stickies.length === 0) {
    await interaction.reply({
      embeds: [
        createInfoEmbed(
          tInteraction(
            interaction.locale,
            "stickyMessage:user-response.view_empty",
          ),
        ),
      ],
      flags: MessageFlags.Ephemeral,
    });
    return;
  }

  // StringSelectMenu を構築して選択肢を返信する
  // 上限 25 件まで選択肢として追加
  const options = stickies
    .slice(0, STICKY_MESSAGE_COMMAND.MAX_SELECT_OPTIONS)
    .map((sticky) => {
      // キャッシュからチャンネル名を取得し、未キャッシュ時は ID をフォールバックとして使う
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
    .setCustomId(STICKY_MESSAGE_COMMAND.VIEW_SELECT_CUSTOM_ID)
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "stickyMessage:ui.select.view_placeholder",
      ),
    )
    .addOptions(options);

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    select,
  );

  await interaction.reply({
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}
