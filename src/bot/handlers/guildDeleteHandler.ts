// guildDelete 時のジョブ停止＋データ削除予約ハンドラ

import type { Guild } from "discord.js";
import { scheduleGuildDeletionUsecase } from "../../features/guild-settings/usecases/scheduleGuildDeletionUsecase";
import { stopGuildJobsUsecase } from "../../features/guild-settings/usecases/stopGuildJobsUsecase";
import { logPrefixed } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import {
  getBotBumpReminderManager,
  getBotGuildRegistryRepository,
  getBotTicketRepository,
} from "../services/botCompositionRoot";
import { applyBotPresence } from "../services/botPresence";

/**
 * Bot がギルドから退出した際に、ジョブを停止してデータ削除を予約する
 *
 * **この時点ではデータを削除しない。** Bot を外しただけで不可逆に設定が消えるのは
 * 「再招待は破壊的操作ではない」というユーザーの期待に反するため、2026-09-23 に
 * 即時削除をやめた。猶予期間内に再導入されれば予約は取り消され、設定はそのまま
 * 復活する。即時削除が要るときは `/guild-settings reset-all` を使う。
 *
 * **ジョブの停止は遅らせない。** 参加していないギルドのタイマーが生きていると
 * 投稿・削除を試み続けてエラーログを吐くため、データの削除だけを遅らせる。
 * @param guild 退出したギルド
 * @returns 実行完了を示す Promise
 */
export async function handleGuildDelete(guild: Guild): Promise<void> {
  const guildId = guild.id;

  logger.info(
    logPrefixed("system:log_prefix.guild_delete", "system:guild_delete.start", {
      guildId,
      guildName: guild.name,
    }),
  );

  // 稼働サーバー数の表示を更新する。ジョブ停止の成否に依存しないよう先に行う
  applyBotPresence(guild.client);

  try {
    // 参加していないギルドへ投稿・削除を試み続けないよう、タイマーだけは即座に止める
    await stopGuildJobsUsecase(
      {
        ticketRepository: getBotTicketRepository(),
        bumpReminderManager: getBotBumpReminderManager(),
      },
      guildId,
    );

    // 猶予後の削除を予約する（実際に消すのは日次スイープ）
    const deleteAt = await scheduleGuildDeletionUsecase(
      { guildRegistryRepository: getBotGuildRegistryRepository() },
      guildId,
      new Date(),
    );

    logger.info(
      logPrefixed(
        "system:log_prefix.guild_delete",
        "system:guild_delete.complete",
        { guildId, deleteAt: deleteAt.toISOString() },
      ),
    );
  } catch (err) {
    logger.error(
      logPrefixed(
        "system:log_prefix.guild_delete",
        "system:guild_delete.failed",
        { guildId },
      ),
      err,
    );
  }
}
