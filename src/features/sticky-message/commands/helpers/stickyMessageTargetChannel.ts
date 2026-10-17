// sticky-message set / update の対象チャンネル解決

import {
  ChannelType,
  type ChatInputCommandInteraction,
  MessageFlags,
} from "discord.js";
import { COMMON_I18N_KEYS } from "../../../../bot/shared/i18nKeys";
import { createWarningEmbed } from "../../../../bot/utils/messageResponse";
import { tInteraction } from "../../../../shared/locale/localeManager";
import { STICKY_MESSAGE_COMMAND } from "../stickyMessageCommand.constants";

/**
 * channel オプション（省略時は実行チャンネル）を対象として解決する。
 * テキストチャンネルでなければ理由を Ephemeral で返信する
 * @param interaction コマンド実行インタラクション（未応答であること）
 * @returns 対象チャンネルの ID。拒否した場合は null（返信済みなので呼び出し側はそのまま return する）
 */
export async function resolveStickyTargetChannelId(
  interaction: ChatInputCommandInteraction,
): Promise<string | null> {
  // channel: 第2引数 false で任意。省略時はコマンド実行チャンネルを対象にする
  const channelOption = interaction.options.getChannel(
    STICKY_MESSAGE_COMMAND.OPTION.CHANNEL,
    false,
  );
  const targetChannel = channelOption ?? interaction.channel;

  if (targetChannel?.type === ChannelType.GuildText) {
    return targetChannel.id;
  }

  await interaction.reply({
    embeds: [
      createWarningEmbed(
        tInteraction(interaction.locale, COMMON_I18N_KEYS.TEXT_CHANNEL_ONLY),
        {
          title: tInteraction(
            interaction.locale,
            COMMON_I18N_KEYS.TITLE_CHANNEL_INVALID,
          ),
        },
      ),
    ],
    flags: MessageFlags.Ephemeral,
  });
  return null;
}
