// src/bot/features/member-log/handlers/guildMemberRemoveHandler.ts
// guildMemberRemove イベントのメンバーログ処理

import {
  ChannelType,
  EmbedBuilder,
  type GuildMember,
  type PartialGuildMember,
} from "discord.js";
import { EMBED_COLORS } from "../../../../shared/constants/embedColors";
import { getGuildTranslator } from "../../../../shared/locale/helpers";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";
import { getBotMemberLogConfigService } from "../../../services/botCompositionRoot";
import {
  notifyErrorChannel,
  notifyWarnChannel,
} from "../../../shared/errorChannelNotifier";
import { calcDuration } from "./accountAge";
import { formatAccountAge, formatCustomMessage } from "./memberLogUtils";

/**
 * guildMemberRemove 時にメンバーログ通知を送信する
 * 機能が無効またはチャンネル未設定の場合はスキップ
 * @param member 退出したギルドメンバー（Partial の可能性あり）
 * @returns 実行完了を示す Promise
 */
export async function handleGuildMemberRemove(
  member: GuildMember | PartialGuildMember,
): Promise<void> {
  const guildId = member.guild.id;

  try {
    // 設定を取得し、機能が有効かチェック
    const config =
      await getBotMemberLogConfigService().getMemberLogConfig(guildId);
    if (!config?.enabled || !config.channelId) {
      // 機能無効またはチャンネル未設定はスキップ
      return;
    }

    // 通知先チャンネルを取得（キャッシュ未登録の場合も API で取得）
    const channel = await member.guild.channels.fetch(config.channelId);
    if (!channel || channel.type !== ChannelType.GuildText) {
      // チャンネルが存在しない場合：設定をリセットしてシステムチャンネルへ通知
      await getBotMemberLogConfigService().disableAndClearChannel(guildId);
      logger.warn(
        logPrefixed(
          "system:log_prefix.member_log",
          "memberLog:log.channel_deleted_config_cleared",
          {
            guildId,
            channelId: config.channelId,
          },
        ),
      );
      await notifyWarnChannel(
        member.guild,
        `Channel ${config.channelId} not found`,
        {
          feature: "メンバーログ",
          action: "通知先チャンネル消失→設定自動リセット",
        },
      );
      const t = await getGuildTranslator(guildId);
      await member.guild.systemChannel
        ?.send({ content: t("memberLog:user-response.channel_deleted_notice") })
        .catch(() => null);
      return;
    }

    // ギルドロケールで翻訳関数を取得
    const t = await getGuildTranslator(guildId);

    // メンバー情報を収集
    const userId = member.user?.id ?? "unknown";
    const username = member.user?.displayName ?? "unknown";
    const userMention = `<@${userId}>`;
    const avatarUrl = member.user?.displayAvatarURL({ size: 256 }) ?? null;
    const createdTimestamp = member.user
      ? Math.floor(member.user.createdTimestamp / 1000)
      : null;
    const joinedTimestamp = member.joinedTimestamp
      ? Math.floor(member.joinedTimestamp / 1000)
      : null;
    const leftTimestamp = Math.floor(Date.now() / 1000);
    const stayDuration =
      member.joinedTimestamp !== null
        ? calcDuration(member.joinedTimestamp)
        : null;
    const memberCount = member.guild.memberCount;
    // createdTimestamp が存在する場合のみアカウント年齢を算出（member.user の null 判定を集約）
    const accountAge = member.user
      ? calcDuration(member.user.createdTimestamp)
      : null;

    // 退出通知 Embed を生成
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.MEMBER_LOG_LEAVE)
      .setTitle(t("memberLog:embed.title.leave"))
      .addFields(
        {
          name: t("memberLog:embed.field.name.leave_username"),
          value: userMention,
          inline: true,
        },
        ...(createdTimestamp !== null && accountAge !== null
          ? [
              {
                name: t("memberLog:embed.field.name.leave_account_created"),
                value: `<t:${createdTimestamp}:f>(${formatAccountAge(accountAge.years, accountAge.months, accountAge.days, t)})`,
                inline: true,
              },
            ]
          : []),
        ...(joinedTimestamp !== null
          ? [
              {
                name: t("memberLog:embed.field.name.leave_server_joined"),
                value: `<t:${joinedTimestamp}:f>`,
                inline: true,
              },
            ]
          : []),
        {
          name: t("memberLog:embed.field.name.leave_server_left"),
          value: `<t:${leftTimestamp}:f>`,
          inline: true,
        },
        {
          name: t("memberLog:embed.field.name.leave_stay_duration"),
          value: stayDuration
            ? formatAccountAge(
                stayDuration.years,
                stayDuration.months,
                stayDuration.days,
                t,
              )
            : t("memberLog:embed.field.value.unknown"),
          inline: true,
        },
        {
          name: t("memberLog:embed.field.name.leave_member_count"),
          value: t("memberLog:embed.field.value.member_count", {
            count: memberCount,
          }),
          inline: true,
        },
      )
      .setTimestamp();

    // アバター画像がある場合はサムネイルとして設定
    if (avatarUrl) {
      embed.setThumbnail(avatarUrl);
    }

    // カスタム退出メッセージが設定されている場合は content として追加
    const customMessage = config.leaveMessage
      ? formatCustomMessage(
          config.leaveMessage,
          userMention,
          username,
          memberCount,
          member.guild.name,
        )
      : undefined;

    // 通知チャンネルへ送信
    await channel.send({
      content: customMessage,
      embeds: [embed],
    });

    // 送信完了ログ
    logger.debug(
      logPrefixed(
        "system:log_prefix.member_log",
        "memberLog:log.leave_notification_sent",
        {
          guildId,
          userId,
        },
      ),
    );
  } catch (err) {
    // エラーが発生しても Bot のクラッシュを防ぐ
    logger.error(
      logPrefixed(
        "system:log_prefix.member_log",
        "memberLog:log.notification_failed",
        { guildId },
      ),
      err,
    );
    await notifyErrorChannel(member.guild, err, {
      feature: "メンバーログ",
      action: "退室通知の送信失敗",
    });
  }
}
