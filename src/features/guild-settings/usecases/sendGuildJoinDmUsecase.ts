// 導入時・再導入時にサーバーオーナーへ DM を送るユースケース

import type { Guild } from "discord.js";
import { env } from "../../../shared/config/env";
import type { GuildTFunction } from "../../../shared/locale/helpers";
import {
  localeManager,
  logPrefixed,
} from "../../../shared/locale/localeManager";
import { logger } from "../../../shared/utils/logger";
import { GUILD_DELETION_GRACE_DAYS } from "../constants/guildSettings.constants";
import {
  buildGuildJoinIntroDm,
  buildGuildJoinReturnDm,
  type GuildJoinDmTranslators,
} from "../services/guildJoinDmBuilder";

const LOG_PREFIX = "system:log_prefix.guild_create";

/**
 * 導入・再導入をサーバーオーナーへ DM で知らせる
 *
 * **DM だけに送り、チャンネルへは投稿しない。** `systemChannel` が null の
 * サーバーで当てずっぽうのチャンネルへ長文が出るのを避けるため。宛先は
 * `guild.fetchOwner()` でその場で解決し、**userId は永続化しない**
 * （`INVITE_PERMISSIONS` に `ViewAuditLog` が無く導入者は特定できないので、
 * オーナー宛が最小権限方針と整合する）。
 *
 * **日本語と英語を1通に併記する**（理由は `GuildJoinDmTranslators` を参照）。
 * 導入直後はそのギルドのロケール設定も存在しないため、`tGuild` も使えない。
 *
 * 送信失敗（オーナーが DM を閉じている = 50007 等）はログのみで握りつぶす。
 * 導入処理そのものは成功扱いにする。
 *
 * **再起動で全オーナーへ DM が飛ぶことはない。** discord.js の GUILD_CREATE
 * ハンドラは `client.ws.status === Status.Ready` のときだけ `guildCreate` を
 * emit するため、起動直後のギルド同期では発火しない（14.27.0 のソースで確認）。
 * 既に参加しているギルドが復帰した場合は `guildAvailable` 側になる。
 *
 * **Bot の停止中・切断中に導入・再導入されたギルドには送られない（既知の制限）。**
 * そのギルドは READY に unavailable で載るため、続く GUILD_CREATE も `guildAvailable`
 * になり `guildCreate` が飛ばない。親行と予約は照合が直すが、照合からは DM を送らない。
 * 送ると、初回リリースで設定の無い既存ギルドにも照合が親行を作るため、全オーナーへの
 * 一斉送信になる。
 * @param guild 参加したギルド
 * @param cancelledDeletionAt 取り消した削除予定時刻（null なら新規導入として扱う）
 * @returns 実行完了を示す Promise
 */
export async function sendGuildJoinDmUsecase(
  guild: Guild,
  cancelledDeletionAt: Date | null,
): Promise<void> {
  try {
    // i18next 側の型より実運用側（全NSキー許容）が広いため型を合わせる
    const t: GuildJoinDmTranslators = {
      ja: localeManager.getFixedT("ja") as unknown as GuildTFunction,
      en: localeManager.getFixedT("en") as unknown as GuildTFunction,
    };
    const embed = cancelledDeletionAt
      ? buildGuildJoinReturnDm(t, cancelledDeletionAt)
      : buildGuildJoinIntroDm(t, GUILD_DELETION_GRACE_DAYS, {
          manualUrl: env.USER_MANUAL_URL,
          dashboardUrl: env.DASHBOARD_URL,
          privacyPolicyUrl: env.PRIVACY_POLICY_URL,
          supportServerUrl: env.SUPPORT_SERVER_URL,
        });

    const owner = await guild.fetchOwner();
    await owner.send({ embeds: [embed] });

    logger.debug(
      logPrefixed(LOG_PREFIX, "system:guild_create.dm_sent", {
        guildId: guild.id,
      }),
    );
  } catch (error) {
    // オーナーが DM を閉じているのは日常的に起きるので warn に留める
    logger.warn(
      logPrefixed(LOG_PREFIX, "system:guild_create.dm_failed", {
        guildId: guild.id,
      }),
      error,
    );
  }
}
