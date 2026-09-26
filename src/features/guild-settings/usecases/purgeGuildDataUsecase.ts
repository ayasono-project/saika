// ギルドの全データ後始末（Bump の予約パネル削除 + インメモリタイマー解除 + DB 一括削除）のユースケース

import type { Client } from "discord.js";
import type { ITicketRepository } from "../../../shared/database/types/repositories";
import { cancelGuildBumpReminders } from "../../bump-reminder/handlers/usecases/cancelGuildBumpReminders";
import type { BumpReminderManager } from "../../bump-reminder/services/bumpReminderService";
import type { GuildSettingsService } from "../guildSettingsService";
import { stopGuildJobsUsecase } from "./stopGuildJobsUsecase";

type PurgeGuildDataDeps = {
  /** Bump の予約パネルを消すのに使う（reset-all は Bot がギルドにいる間に実行されるので消せる） */
  client: Client;
  guildSettingsService: GuildSettingsService;
  ticketRepository: ITicketRepository;
  bumpReminderManager: BumpReminderManager;
};

/**
 * ギルドの全データを**即時**に後始末する（reset-all 専用）
 *
 * 最初に Bump の予約パネル（「<t:…:R>にリマインドが通知されます」）を消し、予約を取り消す
 * （`cancelGuildBumpReminders`：pending 行からパネルの場所を控える → 予約の取り消し → パネル削除）。
 * パネルの場所は pending 行からしか引けないため、DB 削除より前に行う。
 * reset-all は Bot がギルドにいる間に実行されるのでパネルを消せる（Bot の退出時の
 * `stopGuildJobsUsecase` はパネルに触れない）。
 *
 * DB 行を消すだけではインメモリタイマーは止まらない。
 * `createTrackedReminderTask` は投稿を実行した「後に」status を更新するため、
 * 先に DB を消すとタイマーが生き残って投稿が実行され、
 * 続く status 更新が P2025 で失敗してログが荒れる。
 * したがって「タイマー解除 → DB 削除」の順序を必ず守ること。
 *
 * ⚠️ **`guildDelete` からは呼ばない。** Bot をサーバーから外しただけで設定が
 * 不可逆に消えるのを避けるため、退出時は `stopGuildJobsUsecase` のみを呼び、
 * データは保持する（2026-09-23 変更）。
 * @param deps 依存オブジェクト
 * @param guildId 対象ギルドID
 * @returns 実行完了を示す Promise
 */
export async function purgeGuildDataUsecase(
  deps: PurgeGuildDataDeps,
  guildId: string,
): Promise<void> {
  const {
    client,
    guildSettingsService,
    ticketRepository,
    bumpReminderManager,
  } = deps;

  // 0. Bump の予約を取り消し、予約パネル（「リマインドが通知されます」）も消す
  //    （pending 行からパネルの場所を控える → 取り消す → パネルを消す）。
  //    DB を消すとパネルの場所を引けなくなるため、DB 削除より前に行う
  await cancelGuildBumpReminders(client, guildId);

  // 1. インメモリタイマーを先に解除する（順序の理由は上記 JSDoc）
  await stopGuildJobsUsecase(
    { ticketRepository, bumpReminderManager },
    guildId,
  );

  // 2. 全設定データを一括削除（GuildSettings + 各機能テーブル）
  await guildSettingsService.deleteAllSettings(guildId);
}
