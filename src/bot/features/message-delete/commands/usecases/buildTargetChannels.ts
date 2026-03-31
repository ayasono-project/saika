// src/bot/features/message-delete/commands/usecases/buildTargetChannels.ts
// 削除対象チャンネルリストの構築

import {
  type ChatInputCommandInteraction,
  type Guild,
  type GuildTextBasedChannel,
  type MessageComponentInteraction,
  PermissionFlagsBits,
} from "discord.js";
import {
  logPrefixed,
  tInteraction,
} from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import {
  createErrorEmbed,
  createWarningEmbed,
} from "../../../../utils/messageResponse";

/**
 * Bot がテキストチャンネルにアクセス可能かを判定する
 * @param channel 対象チャンネル
 * @param me Bot の GuildMember
 * @returns アクセス可能なら true
 */
function hasBotAccess(
  channel: GuildTextBasedChannel,
  me: Guild["members"]["me"],
): boolean {
  if (!me) return true;
  return (
    channel
      .permissionsFor(me)
      ?.has([
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.ManageMessages,
      ]) === true
  );
}

/**
 * 削除対象のチャンネルリストを構築する
 * channelIds 指定時は指定チャンネルのみ、未指定（空配列）時は Bot がアクセス可能な全チャンネルを返す
 * @param interaction 条件設定フェーズから渡された interaction
 * @param channelIds 条件設定フェーズで選択されたチャンネルID一覧（空配列で全チャンネル）
 * @returns 対象チャンネル配列（エラー時は null）
 */
export async function buildTargetChannels(
  interaction: ChatInputCommandInteraction | MessageComponentInteraction,
  channelIds: string[],
): Promise<GuildTextBasedChannel[] | null> {
  const guild = interaction.guild;
  if (!guild) return null;
  const me = guild.members.me;

  // チャンネル指定あり: 指定チャンネルのみ対象
  if (channelIds.length > 0) {
    const allChannels = await guild.channels.fetch();
    const targetChannels: GuildTextBasedChannel[] = [];
    const skippedChannelIds: string[] = [];

    for (const id of channelIds) {
      const ch = allChannels.get(id);
      if (!ch || !ch.isTextBased()) continue;

      const textCh = ch as GuildTextBasedChannel;
      if (hasBotAccess(textCh, me)) {
        targetChannels.push(textCh);
      } else {
        skippedChannelIds.push(id);
      }
    }

    // スキップしたチャンネルを通知
    if (skippedChannelIds.length > 0 && targetChannels.length > 0) {
      const channelMentions = skippedChannelIds
        .map((id) => `<#${id}>`)
        .join(", ");
      await interaction
        .followUp({
          embeds: [
            createWarningEmbed(
              tInteraction(
                interaction.locale,
                "messageDelete:user-response.channel_partial_skip",
                {
                  channels: channelMentions,
                },
              ),
              {
                title: tInteraction(
                  interaction.locale,
                  "common:title_bot_permission_denied",
                ),
              },
            ),
          ],
          ephemeral: true,
        })
        .catch(() => {});
    }

    // 全チャンネルアクセス不可
    if (targetChannels.length === 0) {
      await interaction.editReply({
        embeds: [
          createErrorEmbed(
            tInteraction(
              interaction.locale,
              "messageDelete:user-response.channel_all_no_access",
            ),
            {
              title: tInteraction(
                interaction.locale,
                "common:title_bot_permission_denied",
              ),
            },
          ),
        ],
        components: [],
        content: "",
      });
      return null;
    }

    return targetChannels;
  }

  // チャンネル未指定: サーバー内の全テキストチャンネルを対象
  logger.debug(
    logPrefixed(
      "system:log_prefix.msg_del",
      "messageDelete:log.cmd_all_channels_start",
    ),
  );
  const allChannels = await guild.channels.fetch();
  logger.debug(
    logPrefixed(
      "system:log_prefix.msg_del",
      "messageDelete:log.cmd_channel_count",
      {
        count: allChannels.size,
      },
    ),
  );

  if (!me) {
    return [...allChannels.values()].filter(
      (ch) => ch !== null && ch.isTextBased(),
    ) as GuildTextBasedChannel[];
  }
  return [...allChannels.values()].filter(
    (ch) =>
      ch !== null &&
      ch.isTextBased() &&
      hasBotAccess(ch as GuildTextBasedChannel, me),
  ) as GuildTextBasedChannel[];
}
