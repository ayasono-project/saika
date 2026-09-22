// guildDelete 時のジョブ停止ハンドラ（設定データは保持する）

import type { Guild } from "discord.js";
import { stopGuildJobsUsecase } from "../../features/guild-settings/usecases/stopGuildJobsUsecase";
import { logPrefixed } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import {
  getBotBumpReminderManager,
  getBotTicketRepository,
} from "../services/botCompositionRoot";
import { applyBotPresence } from "../services/botPresence";

/**
 * Bot がギルドから退出した際に、そのギルドのジョブを停止する
 *
 * **設定データは削除しない。** Bot を外しただけで不可逆に設定が消えるのは
 * 「再招待は破壊的操作ではない」というユーザーの期待に反するため、2026-09-23 に
 * 即時削除をやめた。猶予付きの自動削除は後続タスクで実装する。
 * 即時削除が要るときは `/guild-settings reset-all` を使う。
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

    logger.info(
      logPrefixed(
        "system:log_prefix.guild_delete",
        "system:guild_delete.complete",
        { guildId },
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
