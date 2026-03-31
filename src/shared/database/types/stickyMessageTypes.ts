// src/shared/database/types/stickyMessageTypes.ts
// StickyMessage エンティティ（専用テーブル、GuildConfig とは別）

export interface StickyMessage {
  id: string;
  guildId: string;
  channelId: string;
  content: string;
  embedData: string | null; // JSON 文字列
  updatedBy: string | null; // 最終設定・更新者の Discord ユーザーID
  lastMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
