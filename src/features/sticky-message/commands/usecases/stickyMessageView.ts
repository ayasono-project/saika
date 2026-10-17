// sticky-message view ユースケース

import {
  ActionRowBuilder,
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
  const service = getBotStickyMessageSettingsService();
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
  const select = new StringSelectMenuBuilder()
    .setCustomId(STICKY_MESSAGE_COMMAND.VIEW_SELECT_CUSTOM_ID)
    .setPlaceholder(
      tInteraction(
        interaction.locale,
        "stickyMessage:ui.select.view_placeholder",
      ),
    )
    .addOptions(buildStickySelectOptions(interaction.guild, stickies));

  const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
    select,
  );

  await interaction.reply({
    components: [row],
    flags: MessageFlags.Ephemeral,
  });
}
