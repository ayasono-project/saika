// Bump パネルメッセージ（「<t:…:R>にリマインドが通知されます」）の削除

import type { Client } from "discord.js";
import { logPrefixed } from "../../../../shared/locale/localeManager";
import { logger } from "../../../../shared/utils/logger";

/**
 * Bump パネルメッセージを削除する
 *
 * リマインドの送信後・次の Bump の検知時・予約の取り消し時・発火時に機能が無効だったとき（sendBumpReminder）・
 * 予約の登録直後に無効化を見つけたとき（cancelIfDisabledAfterSchedule）に呼ぶ。
 * チャンネルやメッセージが既に無い場合は何もしない。削除の失敗は呼び出し元の処理を止めないよう、
 * ログだけ残して握りつぶす。
 * @param client Discord クライアント
 * @param channelId パネルが存在するチャンネルID
 * @param panelMessageId 削除対象のパネルメッセージID（無ければ何もしない）
 * @param guildId ログ用ギルドID
 * @returns 実行完了を示す Promise
 */
export async function deleteBumpPanelMessage(
  client: Client,
  channelId: string,
  panelMessageId: string | null | undefined,
  guildId: string,
): Promise<void> {
  if (!panelMessageId) {
    return;
  }

  try {
    // チャンネル・メッセージが消えていれば削除済みとして扱う
    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (!channel?.isTextBased()) {
      return;
    }
    const panelMessage = await channel.messages
      .fetch(panelMessageId)
      .catch(() => null);
    if (!panelMessage) {
      return;
    }

    await panelMessage.delete();
    logger.debug(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.scheduler_panel_deleted",
        { panelMessageId, guildId },
      ),
    );
  } catch (error) {
    // パネルが残るだけなので、呼び出し元（送信・検知・取り消し等）は続行させる
    logger.debug(
      logPrefixed(
        "system:log_prefix.bump_reminder",
        "bumpReminder:log.scheduler_panel_delete_failed",
        { panelMessageId, guildId },
      ),
      error,
    );
  }
}
