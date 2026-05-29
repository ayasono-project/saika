// src/bot/features/member-log/handlers/inviteTracker.ts
// メンバー参加時の招待リンク追跡ユーティリティ
//
// 仕組み:
//  1. Bot起動時に全サーバーの招待リンク（コード→使用回数）をメモリにキャッシュ
//  2. メンバー参加時に現在の招待一覧と比較し、使用回数が増えたリンクを特定
//  3. キャッシュを最新状態へ更新する

import type { Guild, Invite } from "discord.js";

/** guildId → (inviteCode → uses) のインメモリキャッシュ */
const inviteCache = new Map<string, Map<string, number>>();

/**
 * 指定ギルドの招待リンク一覧をキャッシュに格納する
 * ManageGuild 権限がない場合は静かにスキップする
 * @param guild 対象ギルド
 */
export async function initGuildInviteCache(guild: Guild): Promise<void> {
  try {
    const invites = await guild.invites.fetch();
    const codeMap = new Map<string, number>();
    for (const invite of invites.values()) {
      codeMap.set(invite.code, invite.uses ?? 0);
    }
    inviteCache.set(guild.id, codeMap);
  } catch {
    // 権限不足などで取得できない場合は無視
  }
}

/**
 * メンバー参加直後に使用された招待リンクを特定する
 * 参加後の招待一覧とキャッシュを比較し、使用回数が増えたリンクを返す
 * キャッシュは最新状態へ更新する
 * @param guild 対象ギルド
 * @returns 使用された招待リンク。特定できない場合は null
 */
export async function findUsedInvite(guild: Guild): Promise<Invite | null> {
  const cached = inviteCache.get(guild.id) ?? new Map<string, number>();

  try {
    const currentInvites = await guild.invites.fetch();
    const newCache = new Map<string, number>();
    let usedInvite: Invite | null = null;

    for (const invite of currentInvites.values()) {
      const currentUses = invite.uses ?? 0;
      newCache.set(invite.code, currentUses);

      const cachedUses = cached.get(invite.code) ?? 0;
      if (currentUses > cachedUses) {
        usedInvite = invite;
      }
    }

    // キャッシュを最新状態に更新
    inviteCache.set(guild.id, newCache);
    return usedInvite;
  } catch {
    // 権限不足などで取得できない場合はキャッシュを更新せず null を返す
    return null;
  }
}

/**
 * テスト用にキャッシュをクリアする
 * 本番コードでは呼び出さないこと
 */
export function clearInviteCacheForTest(): void {
  inviteCache.clear();
}
