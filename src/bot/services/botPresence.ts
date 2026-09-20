// src/bot/services/botPresence.ts
// Bot のプレゼンス（稼働サーバー数の表示）を適用する

import { ActivityType, type Client, PresenceUpdateStatus } from "discord.js";
import { tDefault } from "../../shared/locale/localeManager";

/**
 * 現在の稼働サーバー数を反映した「プレイ中」プレゼンスを適用する。
 *
 * 呼び出しが必要になる契機は2種類ある。
 * - 再接続（shardReady / shardResume）: 再 IDENTIFY でアクティビティが失われ、
 *   once の clientReady では復元されない
 * - ギルド参加・退出（guildCreate / guildDelete）: 呼ばないと再起動または
 *   再接続まで古いサーバー数が表示され続ける
 *
 * discord.js は guildCreate をキャッシュへの追加後、guildDelete をキャッシュからの
 * 削除後に発火するため、どちらのハンドラからでも更新後の件数が読める。
 * 障害時は guildUnavailable が飛びキャッシュからは消えないため、件数は変わらない。
 * @param client プレゼンスを適用する Discord クライアント
 */
export function applyBotPresence(client: Client): void {
  const serverCount = client.guilds.cache.size;
  client.user?.setPresence({
    activities: [
      {
        name: tDefault("system:bot.presence_activity", {
          count: serverCount,
        }),
        type: ActivityType.Playing,
      },
    ],
    status: PresenceUpdateStatus.Online,
  });
}
