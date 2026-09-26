// guildCreate 時のBot共通ハンドラ

import type { Guild } from "discord.js";
import { sendGuildJoinDmUsecase } from "../../features/guild-settings/usecases/sendGuildJoinDmUsecase";
import { syncGuildTickets } from "../../features/ticket/services/ticketChannelSync";
import { logPrefixed } from "../../shared/locale/localeManager";
import { logger } from "../../shared/utils/logger";
import {
  getBotGuildRegistryRepository,
  getBotTicketRepository,
} from "../services/botCompositionRoot";
import { applyBotPresence } from "../services/botPresence";

/**
 * Bot がギルドへ参加した際の共通処理を行う
 *
 * 親レコードの作成と削除予約の取り消しを行う。後者があるため、猶予期間内の
 * 再導入では設定がそのまま復活する。チケットを Discord の状態に合わせてから、オーナーへ DM を送る
 * （新規導入なら案内と保持期間の告知、再導入なら設定が残っている旨。Bot が扱えないチケットのチャンネルを
 * エラー通知チャンネルで知らせられなかったときは、その件数と付け直す手順も載せる）。
 * @param guild 参加したギルド
 * @returns 実行完了を示す Promise
 */
export async function handleGuildCreate(guild: Guild): Promise<void> {
  logger.info(
    logPrefixed(
      "system:log_prefix.guild_create",
      "system:guild_create.joined",
      {
        guildId: guild.id,
        guildName: guild.name,
      },
    ),
  );

  // 全機能テーブルが guilds へ FK を張っているため、親行が無いギルドでは
  // 設定を1件も保存できない。プレゼンス更新（Discord API 呼び出し）より先に
  // 作り、FK 違反になりうる時間を最短にする。
  // どちらも純粋な委譲なのでサービス層を挟まない（実装ガイドラインの例外）
  let cancelledDeletionAt: Date | null = null;
  try {
    const registry = getBotGuildRegistryRepository();
    await registry.ensureGuild(guild.id);
    // 猶予中に再導入されたケース。取り消さないと、生きている設定が期限後に消える。
    // 戻り値（取り消した予定日時）が DM の出し分けにそのまま使える
    cancelledDeletionAt = await registry.cancelScheduledDeletion(guild.id);
  } catch (error) {
    // ここで throw すると以降のプレゼンス更新まで巻き添えで止まる。
    // 取りこぼしは次回の照合（起動時・日次）が拾うため、記録だけして続行する
    logger.error(
      logPrefixed(
        "system:log_prefix.guild_create",
        "system:guild_create.registry_failed",
        { guildId: guild.id },
      ),
      error,
    );
  }

  // 稼働サーバー数の表示を更新する
  applyBotPresence(guild.client);

  // 猶予内の再導入なら、退出時に止めたチケットの自動削除タイマーを組み直し、
  // 外されていた間に消されたチャンネルのチケットを片付ける（新規導入ならチケットが無いので何もしない）。
  // 外したときに Discord がチケットのチャンネルから Bot の上書きを消すため、Bot が入れなくなった
  // チャンネルがあれば、エラー通知チャンネルで管理者に付け直しを頼む（再導入のときだけ・1回）。
  // キックで Bot のロールも消え、管理者専用のエラー通知チャンネルには届かないことがあるので、
  // 届かなかった（未設定を含む）件数を DM に載せられるよう、DM より先に行う
  let unnotifiedInaccessibleTicketCount = 0;
  try {
    const { inaccessibleCount, notified } = await syncGuildTickets(
      guild,
      getBotTicketRepository(),
      { notifyInaccessibleChannels: true },
    );
    if (!notified) unnotifiedInaccessibleTicketCount = inaccessibleCount;
  } catch (error) {
    // 同期に失敗しても DM は送る（件数は分からないので載せない）
    logger.error(
      logPrefixed(
        "system:log_prefix.ticket",
        "ticket:log.ticket_channel_sync_failed",
        { guildId: guild.id },
      ),
      error,
    );
  }

  // オーナーへの DM。送信失敗はユースケース側で握りつぶすため導入処理は止まらない
  await sendGuildJoinDmUsecase(
    guild,
    cancelledDeletionAt,
    unnotifiedInaccessibleTicketCount,
  );
}
