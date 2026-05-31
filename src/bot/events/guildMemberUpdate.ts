// src/bot/events/guildMemberUpdate.ts
// メンバー更新イベント（未承認自動キックの対象ロール解除）

import { Events } from "discord.js";
import { handleUnverifiedKickVerify } from "../../features/unverified-kick/handlers/unverifiedKickVerifyHandler";
import type { BotEvent } from "../types/discord";

export const guildMemberUpdateEvent: BotEvent<typeof Events.GuildMemberUpdate> =
  {
    name: Events.GuildMemberUpdate,
    // メンバー更新のたびに判定
    once: false,

    /**
     * guildMemberUpdate イベント発火時に、認証ロール取得に伴う対象ロール解除を実行する
     * @param oldMember 更新前のギルドメンバー（Partial の可能性あり）
     * @param newMember 更新後のギルドメンバー
     * @returns 実行完了を示す Promise
     */
    async execute(oldMember, newMember) {
      // 未承認自動キックの対象ロールを認証完了時に剥奪
      await handleUnverifiedKickVerify(oldMember, newMember);
    },
  };
