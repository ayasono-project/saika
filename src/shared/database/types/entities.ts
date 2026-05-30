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

export interface InactiveKickSettings {
  // 機能有効フラグ
  enabled: boolean;
  // 最後に有効化した時刻（キック起算の下限・未有効化時 undefined）
  enabledAt?: Date;
  // 通知チャンネルID
  channelId?: string;
  // 非アクティブ判定日数（しきい値）
  thresholdDays: number;
  // カスタム事前通知メッセージ（{count}/{daysLeft}/{thresholdDays}/{serverName}/{markerRole} 置換可）
  warnMessage?: string;
  // カスタムキック通知メッセージ（{count}/{thresholdDays}/{serverName} 置換可）
  kickMessage?: string;
  // 警告対象へ自動付与する対象ロールID（通知メンション用・未設定時 undefined）
  markerRoleId?: string;
  // 除外ロールID一覧（ホワイトリスト）
  whitelistRoleIds: string[];
  // 除外ユーザーID一覧（ホワイトリスト）
  whitelistUserIds: string[];
}

export interface MemberActivity {
  // ギルドID
  guildId: string;
  // ユーザーID
  userId: string;
  // 最終活動時刻
  lastActivityAt: Date;
  // 事前通知の進行段階（0=未通知, 1=1週間前済, 2=最終警告済）
  warnStage: number;
}
