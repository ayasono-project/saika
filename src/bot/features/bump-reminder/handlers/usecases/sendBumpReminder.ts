// src/bot/features/bump-reminder/handlers/usecases/sendBumpReminder.ts
// スケジュール到達時のBumpリマインダー送信ユースケース

import type { Client } from "discord.js";
import type { ParseKeys } from "i18next";
import type { BumpReminderConfigService } from "../../../../../shared/features/bump-reminder/bumpReminderConfigService";
import { getGuildTranslator } from "../../../../../shared/locale/helpers";
import type { AllNamespaces } from "../../../../../shared/locale/i18n";
import { logPrefixed } from "../../../../../shared/locale/localeManager";
import { logger } from "../../../../../shared/utils/logger";
import {
  notifyErrorChannel,
  notifyWarnChannel,
} from "../../../../shared/errorChannelNotifier";
import type { BumpServiceName } from "../../constants/bumpReminderConstants";

/**
 * スケジュール到達時に Bump リマインダー通知を送信する関数
 * @param client Discord クライアント
 * @param guildId 通知対象ギルドID
 * @param channelId 通知先チャンネルID
 * @param messageId 返信参照に使う元メッセージID
 * @param serviceName 通知文言切り替え用サービス名
 * @param bumpReminderConfigService 設定取得サービス
 * @param panelMessageId 通知完了後に削除するパネルメッセージID
 * @returns 実行完了を示す Promise
 */
export async function sendBumpReminder(
  client: Client,
  guildId: string,
  channelId: string,
  messageId: string | undefined,
  serviceName: BumpServiceName | undefined,
  bumpReminderConfigService: BumpReminderConfigService,
  panelMessageId?: string,
): Promise<void> {
  try {
    let channel: Awaited<ReturnType<Client["channels"]["fetch"]>> | undefined;
    // 送信先チャンネルを解決し、TextBased でない場合は終了
    channel = await client.channels.fetch(channelId);
    if (!channel?.isTextBased()) {
      // 削除済み/型不一致チャンネルでは通知不能
      logger.warn(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.scheduler_channel_not_found",
          {
            channelId,
            guildId,
          },
        ),
      );
      const guild = client.guilds?.cache?.get(guildId);
      if (guild) {
        await notifyWarnChannel(guild, `Channel ${channelId} not found`, {
          feature: "Bumpリマインダー",
          action: "リマインダー送信先チャンネル未発見",
        });
      }
      return;
    }

    // 送信直前に最新設定を再取得し、無効化されていたら中止
    const currentConfig =
      await bumpReminderConfigService.getBumpReminderConfigOrDefault(guildId);
    if (!currentConfig.enabled) {
      // 予約後に無効化されていた場合は送信を抑止
      logger.debug(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.scheduler_disabled",
          {
            guildId,
          },
        ),
      );
      return;
    }

    // ロール + ユーザーのメンション文字列を組み立て
    const mentions: string[] = [];
    if (currentConfig.mentionRoleId) {
      mentions.push(`<@&${currentConfig.mentionRoleId}>`);
    }
    if (
      currentConfig.mentionUserIds &&
      currentConfig.mentionUserIds.length > 0
    ) {
      // ユーザー複数指定時は順序を保ってメンション文字列化
      // 保存順を保つことで設定画面との表示差異を最小化する
      currentConfig.mentionUserIds.forEach((userId: string) => {
        mentions.push(`<@${userId}>`);
      });
    }

    // role/user の順で連結し、空の場合はメンションなし本文にする
    const mentionText = mentions.length > 0 ? mentions.join(" ") : "";

    const tGuild = await getGuildTranslator(guildId);

    // サービス名から翻訳キーを動的に組み立て（サービス追加時にこの関数の変更は不要）
    const serviceKey = serviceName?.toLowerCase();
    const messageKey = (
      serviceKey
        ? `bumpReminder:user-response.reminder_message_${serviceKey}`
        : "bumpReminder:user-response.reminder_message"
    ) as ParseKeys<AllNamespaces>;
    const reminderMessage = tGuild(messageKey);

    // メンション有無に応じて本文を整形
    const content = mentionText
      ? `${mentionText}\n${reminderMessage}`
      : reminderMessage;
    // メンション文言は先頭行に固定し、通知本文の視認性を保つ

    // 元メッセージに返信できる場合は reply 形式で送信
    if (channel.isSendable()) {
      if (messageId) {
        // Bump元メッセージへスレッド的に紐づけて通知
        // messageReference により文脈追跡しやすい通知導線を維持する
        await channel.send({
          content,
          reply: { messageReference: messageId },
        });
      } else {
        // 参照元がない場合は通常メッセージとして送信
        await channel.send(content);
      }
    }
    // send 不可チャンネルでは通知を行わず、後段 cleanup のみ実行する

    logger.info(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.scheduler_sent",
        {
          guildId,
          channelId,
        },
      ),
    );

    // リマインド完了後にパネルメッセージを削除する
    await deletePanelMessage(client, channelId, panelMessageId, guildId);
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.scheduler_send_failed",
        {
          guildId,
          channelId,
        },
      ),
      error,
    );
    const guild = client.guilds?.cache?.get(guildId);
    if (guild) {
      await notifyErrorChannel(guild, error, {
        feature: "Bumpリマインダー",
        action: "リマインダー送信失敗",
      });
    }
  }
}

/**
 * リマインド完了後にパネルメッセージを削除する
 * @param client Discord クライアント
 * @param channelId パネルが存在するチャンネルID
 * @param panelMessageId 削除対象のパネルメッセージID
 * @param guildId ログ用ギルドID
 */
async function deletePanelMessage(
  client: Client,
  channelId: string,
  panelMessageId: string | undefined,
  guildId: string,
): Promise<void> {
  if (!panelMessageId) {
    return;
  }

  try {
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel?.isTextBased()) {
      const panelMessage = await channel.messages
        .fetch(panelMessageId)
        .catch(() => null);
      if (panelMessage) {
        await panelMessage.delete();
        logger.debug(
          logPrefixed(
            "system:log_prefix.bump_reminder",
            "bumpReminder:log.scheduler_panel_deleted",
            {
              panelMessageId,
              guildId,
            },
          ),
        );
      }
    }
  } catch (error) {
    // パネル削除失敗はリマインド送信の成功に影響しない
    logger.debug(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.scheduler_panel_delete_failed",
        {
          panelMessageId,
        },
      ),
      error,
    );
  }
}
