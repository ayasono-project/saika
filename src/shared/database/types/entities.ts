// src/shared/database/types/entities.ts
// エンティティ型定義

export interface GuildSettings {
  // guild 単位の主キー
  guildId: string;
  // i18n の既定ロケール
  locale: string;
  // エラー通知チャンネルID
  errorChannelId?: string;
  // DB監査用タイムスタンプ
  createdAt: Date;
  updatedAt: Date;
}

export interface AfkSettings {
  enabled: boolean;
  channelId?: string;
}

export interface VacSettings {
  enabled: boolean;
  triggerChannelIds: string[];
  createdChannels: VacChannelPair[];
}

export interface VacChannelPair {
  // 作成済み VC の実チャンネルID
  voiceChannelId: string;
  // その VC のオーナーユーザーID
  ownerId: string;
  // 作成時刻（epoch ms）
  createdAt: number;
}

export interface BumpReminderSettings {
  enabled: boolean;
  channelId?: string;
  mentionRoleId?: string;
  mentionUserIds: string[];
}

export interface MemberLogSettings {
  // 機能有効フラグ
  enabled: boolean;
  // 参加/退出ログ送信先
  channelId?: string;
  // カスタム参加メッセージ（{userMention}/{userName}/{count} 置換可）
  joinMessage?: string;
  // カスタム退出メッセージ（{userMention}/{userName}/{count} 置換可）
  leaveMessage?: string;
}
