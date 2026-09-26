// Bump リマインダー設定のリセット（コマンドとダッシュボードで共通）

import type { Client } from "discord.js";
import { getBotBumpReminderSettingsService } from "../../../../bot/services/botCompositionRoot";
import type { BumpReminderSettings } from "../../../../shared/database/types";
import { createDefaultBumpReminderSettings } from "../../bumpReminderSettingsDefaults";
import { cancelGuildBumpReminders } from "./cancelGuildBumpReminders";

/**
 * Bump リマインダー設定を初期状態に戻し、進行中の予約とパネルを取り消す
 *
 * 初期状態は、一度も設定していないギルドと同じ（機能は有効・全チャンネルで検知・メンションなし）。
 * コマンドとダッシュボードでリセットの結果が食い違わないよう、リセットは必ずこの関数を通す。
 * @param client Discord クライアント（パネルの削除に使う）
 * @param guildId 対象ギルドID
 * @returns リセット後の設定
 */
export async function resetBumpReminderSettings(
  client: Client,
  guildId: string,
): Promise<BumpReminderSettings> {
  const defaults = createDefaultBumpReminderSettings();
  await getBotBumpReminderSettingsService().saveBumpReminderSettings(
    guildId,
    defaults,
  );

  // 設定を戻したうえで、リセット前の Bump の予約とパネルを片付ける
  await cancelGuildBumpReminders(client, guildId);
  return defaults;
}
