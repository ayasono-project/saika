// 削除対象チャンネルリストの構築

import {
  type AnyThreadChannel,
  ChannelType,
  type ChatInputCommandInteraction,
  type Guild,
  GuildMember,
  type GuildTextBasedChannel,
  type MessageComponentInteraction,
  PermissionFlagsBits,
} from "discord.js";
import {
  createErrorEmbed,
  createWarningEmbed,
} from "../../../../bot/utils/messageResponse";
import {
  logPrefixed,
  tInteraction,
} from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { MSG_DEL_CHANNEL_REQUIRED_PERMISSIONS } from "../../constants/messageDeleteConstants";

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
    channel.permissionsFor(me)?.has(MSG_DEL_CHANNEL_REQUIRED_PERMISSIONS) ===
    true
  );
}

/**
 * コマンド実行者の GuildMember を取得する
 * ギルドがキャッシュ済みなら interaction.member をそのまま使い、そうでなければ API から取り直す
 * @param interaction 条件設定フェーズから渡された interaction
 * @param guild 対象ギルド
 * @returns 実行者の GuildMember（取得できなければ null）
 */
async function resolveExecutor(
  interaction: ChatInputCommandInteraction | MessageComponentInteraction,
  guild: Guild,
): Promise<GuildMember | null> {
  if (interaction.member instanceof GuildMember) return interaction.member;
  try {
    return await guild.members.fetch(interaction.user.id);
  } catch (error) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.msg_del",
        "messageDelete:log.executor_fetch_failed",
        { userId: interaction.user.id, error: String(error) },
      ),
    );
    return null;
  }
}

/**
 * スレッドに指定ユーザーが参加しているかを判定する
 * キャッシュが古いと抜けた人を参加者と誤認するため、API から取り直す
 * @param thread 対象スレッド
 * @param userId 判定するユーザーID
 * @returns 参加していれば true（確認できなかった場合も false）
 */
async function isThreadMember(
  thread: AnyThreadChannel,
  userId: string,
): Promise<boolean> {
  try {
    await thread.members.fetch({ member: userId, force: true });
    return true;
  } catch {
    return false;
  }
}

/**
 * コマンド実行者が、そのチャンネルのメッセージを見て削除できるかを判定する
 * 実行者が見られないチャンネルを収集・プレビュー・削除の対象にしないためのもの
 * @param channel 対象チャンネル
 * @param executor 実行者の GuildMember（取得できなかった場合は null）
 * @returns 対象にしてよければ true（実行者が不明なら false）
 */
async function hasExecutorAccess(
  channel: GuildTextBasedChannel,
  executor: GuildMember | null,
): Promise<boolean> {
  if (!executor) return false;
  const permissions = channel.permissionsFor(executor);
  if (!permissions?.has(MSG_DEL_CHANNEL_REQUIRED_PERMISSIONS)) {
    return false;
  }
  // 非公開スレッドは親チャンネルの権限だけでは中を見られない。参加しているかスレッド管理の権限が要る
  if (
    channel.type !== ChannelType.PrivateThread ||
    permissions.has(PermissionFlagsBits.ManageThreads)
  ) {
    return true;
  }
  return isThreadMember(channel, executor.id);
}

/**
 * 削除対象のチャンネルリストを構築する
 * channelIds 指定時は指定チャンネル（スレッドを含む）のみ、未指定（空配列）時は Bot がアクセス可能な全チャンネルと進行中のスレッドを返す。
 * どちらの場合も、実行者が見てメッセージを管理できるチャンネルに限る
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
  const executor = await resolveExecutor(interaction, guild);

  // チャンネル指定あり: 指定チャンネルのみ対象
  if (channelIds.length > 0) {
    const allChannels = await guild.channels.fetch();
    const targetChannels: GuildTextBasedChannel[] = [];
    const botSkippedIds: string[] = [];
    const executorSkippedIds: string[] = [];

    for (const id of channelIds) {
      // 一括取得（GET /guilds/{id}/channels）はスレッドを返さないため、無かった ID だけ個別に取り直す
      const ch =
        allChannels.get(id) ??
        (await guild.channels.fetch(id).catch(() => null));
      if (!ch || !ch.isTextBased()) {
        // 解決できない ID（削除済み・参照不可）も黙って落とさず、スキップとして通知する
        botSkippedIds.push(id);
        continue;
      }

      const textCh = ch as GuildTextBasedChannel;
      // 実行者の権限を先に見る（実行者が扱えないチャンネルは、Bot が扱えても対象にしない）
      if (!(await hasExecutorAccess(textCh, executor))) {
        executorSkippedIds.push(id);
      } else if (hasBotAccess(textCh, me)) {
        targetChannels.push(textCh);
      } else {
        botSkippedIds.push(id);
      }
    }

    // スキップの理由ごとに、見出しと文言を分けて通知する
    const skipGroups = [
      {
        ids: executorSkippedIds,
        partialKey:
          "messageDelete:user-response.channel_partial_skip_member" as const,
        allKey:
          "messageDelete:user-response.channel_all_no_access_member" as const,
        titleKey: "common:title_permission_denied" as const,
      },
      {
        ids: botSkippedIds,
        partialKey: "messageDelete:user-response.channel_partial_skip" as const,
        allKey: "messageDelete:user-response.channel_all_no_access" as const,
        titleKey: "common:title_bot_permission_denied" as const,
      },
    ].filter((group) => group.ids.length > 0);

    // 一部をスキップした: 対象のチャンネルで続行し、スキップしたチャンネルを通知
    if (skipGroups.length > 0 && targetChannels.length > 0) {
      await interaction
        .followUp({
          embeds: skipGroups.map((group) =>
            createWarningEmbed(
              tInteraction(interaction.locale, group.partialKey, {
                channels: group.ids.map((id) => `<#${id}>`).join(", "),
              }),
              { title: tInteraction(interaction.locale, group.titleKey) },
            ),
          ),
          ephemeral: true,
        })
        .catch(() => {});
    }

    // 全チャンネルを対象にできない
    if (targetChannels.length === 0) {
      await interaction.editReply({
        embeds: skipGroups.map((group) =>
          createErrorEmbed(tInteraction(interaction.locale, group.allKey), {
            title: tInteraction(interaction.locale, group.titleKey),
          }),
        ),
        components: [],
        content: "",
      });
      return null;
    }

    return targetChannels;
  }

  // チャンネル未指定: サーバー内の全テキストチャンネル + 進行中のスレッドを対象
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
  const activeThreads = await fetchActiveThreads(guild);

  const botAccessible = [...allChannels.values(), ...activeThreads].filter(
    (ch) =>
      ch !== null &&
      ch.isTextBased() &&
      hasBotAccess(ch as GuildTextBasedChannel, me),
  ) as GuildTextBasedChannel[];

  // 実行者が見られないチャンネル（非公開スレッドを含む）は、存在も知らせないよう黙って除く
  const executorAllowed = await Promise.all(
    botAccessible.map((ch) => hasExecutorAccess(ch, executor)),
  );
  const targetChannels = botAccessible.filter((_, i) => executorAllowed[i]);
  const excludedCount = botAccessible.length - targetChannels.length;
  if (excludedCount > 0) {
    logger.debug(
      logPrefixed(
        "system:log_prefix.msg_del",
        "messageDelete:log.executor_no_access_excluded",
        { count: excludedCount },
      ),
    );
  }
  return targetChannels;
}

/**
 * ギルドの進行中（クローズしていない）スレッドを取得する
 * 一括取得（GET /guilds/{id}/channels）はスレッドを返さないため別に取る。
 * クローズ済みはチャンネル選択にも出ないので、範囲をそろえて含めない。
 * 取得に失敗した場合はスレッド抜きで続行できるよう空配列を返す
 * @param guild 対象ギルド
 * @returns 進行中のスレッド一覧
 */
async function fetchActiveThreads(guild: Guild): Promise<AnyThreadChannel[]> {
  try {
    const { threads } = await guild.channels.fetchActiveThreads();
    return [...threads.values()];
  } catch (error) {
    logger.warn(
      logPrefixed(
        "system:log_prefix.msg_del",
        "messageDelete:log.active_threads_fetch_failed",
        { error: String(error) },
      ),
    );
    return [];
  }
}
