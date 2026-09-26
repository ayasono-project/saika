// Bump検知ユースケースのオーケストレーション

import type { Client } from "discord.js";
import {
  getBotBumpReminderManager,
  getBotBumpReminderRepository,
  getBotBumpReminderSettingsService,
} from "../../../bot/services/botCompositionRoot";
import { notifyErrorChannel } from "../../../bot/shared/errorChannelNotifier";
import { logPrefixed } from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import type { BumpReminderSettingsService } from "../bumpReminderSettingsService";
import type { BumpServiceName } from "../constants/bumpReminderConstants";
import { getReminderDelayMinutes } from "../constants/bumpReminderConstants";
import type { BumpReminder } from "../repositories/types";
import { deleteBumpPanelMessage } from "./usecases/deleteBumpPanel";
import { scheduleBumpReminder } from "./usecases/scheduleBumpReminder";
import { sendBumpPanel } from "./usecases/sendBumpPanel";

/**
 * Bump 検知時に設定確認、パネル送信、リマインダー登録を行う関数
 * 登録後に設定を読み直し、その間に無効化されていれば今回の予約とパネルを取り消す
 * @param client Discord クライアント
 * @param guildId 検知ギルドID
 * @param channelId 検知チャンネルID
 * @param messageId 検知元メッセージID
 * @param serviceName 検知サービス名
 * @returns 実行完了を示す Promise
 */
export async function handleBumpDetected(
  client: Client,
  guildId: string,
  channelId: string,
  messageId: string,
  serviceName: BumpServiceName,
): Promise<void> {
  try {
    // Bump 設定サービスを取得し、機能有効状態を確認
    const bumpReminderSettingsService = getBotBumpReminderSettingsService();

    const config =
      await bumpReminderSettingsService.getBumpReminderSettingsOrDefault(
        guildId,
      );
    if (!config.enabled) {
      // 機能無効ギルドでは検知のみ行い何もしない
      logger.debug(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.scheduler_disabled",
          { guildId },
        ),
      );
      return;
    }

    // 設定チャンネル固定時は、検知チャンネル一致時のみ処理する
    if (config.channelId && config.channelId !== channelId) {
      // 設定チャンネル外の検知はノイズとしてスキップ
      logger.debug(
        logPrefixed(
          "system:log_prefix.bump_reminder",
          "bumpReminder:log.scheduler_unregistered_channel",
          {
            channelId,
            expectedChannelId: config.channelId,
            guildId,
          },
        ),
      );
      return;
    }

    // 同一サービスの前回パネルメッセージが残っていれば削除する
    // 異なるサービスのパネルはリマインド完了まで残す
    await deleteOldPanel(client, guildId, channelId, serviceName);

    // 通知予定を示すパネルを先に送信し、メッセージIDを保持
    // 予約キーは manager 側で guild/channel/message 単位に正規化される
    const panelMessageId = await sendBumpPanel(
      client,
      guildId,
      channelId,
      messageId,
      getReminderDelayMinutes(),
    );
    // panelMessageId は未送信時 undefined のまま許容する

    await scheduleBumpReminder(
      client,
      guildId,
      channelId,
      messageId,
      serviceName,
      bumpReminderSettingsService,
      panelMessageId,
    );

    // 最初に設定を読んでから予約を登録するまでの間に無効化されていたら、今回の予約とパネルを取り消す
    const cancelled = await cancelIfDisabledAfterSchedule(
      client,
      guildId,
      channelId,
      serviceName,
      bumpReminderSettingsService,
      panelMessageId,
    );
    if (cancelled) {
      return;
    }

    // 登録完了時点で検知ログを残す
    logger.info(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.detected",
        {
          guildId,
          service: serviceName,
        },
      ),
    );
  } catch (error) {
    logger.error(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.detection_failed",
        {
          guildId,
        },
      ),
      error,
    );
    const guild = client.guilds?.cache?.get(guildId);
    if (guild) {
      await notifyErrorChannel(guild, error, {
        feature: "Bumpリマインダー",
        action: "Bump検出処理の失敗",
      });
    }
  }
}

/**
 * 予約の登録後に設定を読み直し、無効化されていれば今回の予約とパネルを取り消す関数
 *
 * 無効化の側は「設定を保存 → 予約を取り消す（cancelGuildBumpReminders）」の順で動く。
 * 検知の側が最初に設定を読んでから予約を登録するまで（前回パネルの削除・新パネルの送信を待つ間）に
 * 無効化が終わると、取り消しはまだ無い予約を拾えず、あとから登録された予約とパネルが残る。
 * 登録の後に読み直せば、登録が取り消しより前なら取り消し側が、後ならこの読み直しが無効を見るため、
 * どちらかで必ず拾える。
 * @param client Discord クライアント（パネルの削除に使う）
 * @param guildId 検知ギルドID
 * @param channelId パネルを送ったチャンネルID
 * @param serviceName 登録したリマインダーのサービス名
 * @param bumpReminderSettingsService 設定取得サービス
 * @param panelMessageId 今回送ったパネルメッセージID（未送信なら undefined）
 * @returns 無効化されていて取り消した場合は true
 */
async function cancelIfDisabledAfterSchedule(
  client: Client,
  guildId: string,
  channelId: string,
  serviceName: BumpServiceName,
  bumpReminderSettingsService: BumpReminderSettingsService,
  panelMessageId: string | undefined,
): Promise<boolean> {
  const latestConfig =
    await bumpReminderSettingsService.getBumpReminderSettingsOrDefault(guildId);
  if (latestConfig.enabled) {
    return false;
  }

  // タイマーを先に止め、パネルを消している間にリマインドが発火しないようにする
  await getBotBumpReminderManager().cancelReminder(guildId, serviceName);
  await deleteBumpPanelMessage(client, channelId, panelMessageId, guildId);

  logger.info(
    logPrefixed(
      "system:log_prefix.bump_reminder",
      "bumpReminder:log.scheduler_disabled_after_schedule",
      { guildId, service: serviceName },
    ),
  );
  return true;
}

/**
 * 同一サービスの前回 Bump パネルメッセージを削除する関数
 * DB の pending レコードから panelMessageId を取得して削除を試みる
 * @param client Discord クライアント
 * @param guildId 対象ギルドID
 * @param channelId パネルが存在するチャンネルID
 * @param serviceName 削除対象のサービス名
 * @returns 実行完了を示す Promise
 */
async function deleteOldPanel(
  client: Client,
  guildId: string,
  channelId: string,
  serviceName: BumpServiceName,
): Promise<void> {
  // 設定サービスは pending 行を扱わないため、ランタイムデータのリポジトリを直接引く
  let pendingReminder: BumpReminder | null;
  try {
    pendingReminder =
      await getBotBumpReminderRepository().findPendingByGuildAndService(
        guildId,
        serviceName,
      );
  } catch (error) {
    // 旧パネルの検索失敗は新パネル送信を妨げない
    logger.debug(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.scheduler_panel_lookup_failed",
        { guildId },
      ),
      error,
    );
    return;
  }

  if (!pendingReminder) {
    return;
  }

  // 前回パネルのチャンネルIDを使用（現在のchannelIdと異なる場合もある）
  await deleteBumpPanelMessage(
    client,
    pendingReminder.channelId || channelId,
    pendingReminder.panelMessageId,
    guildId,
  );
}
