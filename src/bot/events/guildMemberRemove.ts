// src/bot/events/guildMemberRemove.ts
// メンバー退出イベント（メンバーログ）

import { Events } from "discord.js";
import { handleBumpReminderMemberRemove } from "../features/bump-reminder/handlers/bumpReminderMemberRemoveHandler";
import { handleGuildMemberRemove } from "../features/member-log/handlers/guildMemberRemoveHandler";
import type { BotEvent } from "../types/discord";

export const guildMemberRemoveEvent: BotEvent<typeof Events.GuildMemberRemove> =
  {
    name: Events.GuildMemberRemove,
    // メンバー退出のたびに通知処理を実行
    once: false,

    /**
     * guildMemberRemove イベント発火時にメンバーログ通知・Bumpリマインダー通知ユーザー除去を実行する
     * @param member 退出したギルドメンバー（Partial の可能性あり）
     * @returns 実行完了を示す Promise
     */
    async execute(member) {
      // 退出通知はメンバーログ機能ハンドラへ委譲
      await handleGuildMemberRemove(member);
      // Bumpリマインダーの mentionUserIds から退出ユーザーを除去
      await handleBumpReminderMemberRemove(member);
    },
  };
