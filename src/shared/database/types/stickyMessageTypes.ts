// src/shared/database/types/stickyMessageTypes.ts
// StickyMessage エンティティ（専用テーブル、GuildSettings とは別）

/** Embed データの型（embed_data jsonb カラムの構造） */
export interface StickyEmbedData {
  title?: string;
  description?: string;
  color?: number;
}

export interface StickyMessage {
  id: string;
  guildId: string;
  channelId: string;
  content: string;
  embedData: StickyEmbedData | null; // jsonb
  updatedBy: string | null; // 最終設定・更新者の Discord ユーザーID
  lastMessageId: string | null;
  createdAt: Date;
  updatedAt: Date;
}
