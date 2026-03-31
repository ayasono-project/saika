// src/bot/features/bump-reminder/handlers/usecases/scheduleBumpReminder.ts
// Bumpリマインダー予約登録ユースケース

import type { Client } from "discord.js";
import type { BumpReminderConfigService } from "../../../../../shared/features/bump-reminder/bumpReminderConfigService";
import { getBotBumpReminderManager } from "../../../../services/botCompositionRoot";
import {
  type BumpServiceName,
  getReminderDelayMinutes,
} from "../../constants/bumpReminderConstants";
import { sendBumpReminder } from "./sendBumpReminder";

/**
 * Bump検知後のリマインダー予約を行う関数
 * @param client Discord クライアント
 * @param guildId 検知ギルドID
 * @param channelId 検知チャンネルID
 * @param messageId 検知元メッセージID
 * @param serviceName 検知サービス名
 * @param bumpReminderConfigService 設定取得サービス
 * @param panelMessageId 送信済みパネルメッセージID（DB記録用）
 */
export async function scheduleBumpReminder(
  client: Client,
  guildId: string,
  channelId: string,
  messageId: string,
  serviceName: BumpServiceName,
  bumpReminderConfigService: BumpReminderConfigService,
  panelMessageId?: string,
): Promise<void> {
  const bumpReminderManager = getBotBumpReminderManager();
  const delayMinutes = getReminderDelayMinutes();

  const reminderTask = async () => {
    // 実行時点の最新設定を参照するため、送信処理へ委譲
    // 予約時に閉じ込めず実行時再評価することで設定変更を反映する
    await sendBumpReminder(
      client,
      guildId,
      channelId,
      messageId,
      serviceName,
      bumpReminderConfigService,
      panelMessageId,
    );
  };

  // 既存予約を考慮しつつ、今回のリマインダーを登録
  // 同一キー既存予約の置換/取消は manager 側契約に委譲する
  await bumpReminderManager.setReminder(
    guildId,
    channelId,
    messageId,
    panelMessageId,
    delayMinutes,
    reminderTask,
    serviceName,
  );
}
