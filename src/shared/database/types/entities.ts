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

/**
 * 在籍階層1件（在籍N日以上でこのしきい値日数を適用）。
 * 活動種別のトラッキング可否・アクティブ条件（累積回数の下限）は階層ごとに個別設定する。
 */
export interface InactiveKickTier {
  // この階層が適用される在籍日数の下限（0 = 新規メンバーから適用）
  tenureDays: number;
  // 非アクティブ判定日数（しきい値）
  thresholdDays: number;
  // この階層適用中にテキストメッセージを活動（非アクティブクロックのリセット対象）として扱うか
  trackMessage: boolean;
  // この階層適用中にVC参加を活動として扱うか
  trackVoice: boolean;
  // この階層適用中に絵文字リアクションを活動として扱うか
  trackReaction: boolean;
  // アクティブ条件（メッセージ累積回数の下限）。未設定ならこの種別は対象外
  minMessageCount?: number;
  // アクティブ条件（VC参加累積回数の下限）
  minVoiceCount?: number;
  // アクティブ条件（リアクション累積回数の下限）
  minReactionCount?: number;
  // true: thresholdDays を在籍日数の締め切りとして扱う（アクティブ条件未達なら在籍N日目でキック・
  //       達していれば以後恒久的に対象外）。false/未設定: 従来通り非アクティブ日数で判定
  //       （アクティブ条件はOR安全弁として働く）
  tenureDeadline?: boolean;
}

export interface InactiveKickSettings {
  // 機能有効フラグ
  enabled: boolean;
  // 最後に有効化した時刻（キック起算の下限・未有効化時 undefined）
  enabledAt?: Date;
  // 通知チャンネルID
  channelId?: string;
  // 在籍階層一覧（tenureDays 昇順・最低1件）
  tiers: InactiveKickTier[];
  // カスタム事前通知メッセージ: 1週間前（{count}/{thresholdDays}/{serverName} 置換可）
  weekWarnMessage?: string;
  // カスタム事前通知メッセージ: 最終警告（3日前・同上の変数）
  finalWarnMessage?: string;
  // カスタムキック通知メッセージ（{count}/{thresholdDays}/{serverName} 置換可）
  kickMessage?: string;
  // 警告対象へ自動付与する対象ロールID（通知メンション用・未設定時 undefined）
  markerRoleId?: string;
  // 除外ロールID一覧（ホワイトリスト）
  whitelistRoleIds: string[];
  // 除外ユーザーID一覧（ホワイトリスト）
  whitelistUserIds: string[];
  // IANA タイムゾーン名（例: "Asia/Tokyo"）
  timezone: string;
  // 実行時刻（0〜23）
  runHour: number;
  // 同日2回実行ガード（"YYYY-MM-DD" 形式・未実行時 undefined）
  lastRunDate?: string;
  // 個別ユーザーメンション通知の有無
  mentionEnabled: boolean;
}

export interface UnverifiedKickSettings {
  // 機能有効フラグ
  enabled: boolean;
  // 最後に有効化した時刻（キック起算の下限・未有効化時 undefined）
  enabledAt?: Date;
  // 認証ロールID（保持していればキック対象外・未設定時 undefined）
  verifiedRoleId?: string;
  // 参加からキックまでの猶予日数
  graceDays: number;
  // 事前警告を送る参加経過日数（undefined = 警告無効）
  warnDays?: number;
  // キック予告（メンバー/スタッフ向け）チャンネルID
  notifyChannelId?: string;
  // 監査ログ（キック実行・自動無効化）チャンネルID
  logChannelId?: string;
  // 警告対象へ自動付与する対象ロールID（通知メンション用・未設定時 undefined）
  markerRoleId?: string;
  // カスタム警告DM本文（{serverName}/{graceDays}/{warnDays}/{remainingDays} 置換可）
  dmTemplate?: string;
  // カスタムキック予告本文（通知チャンネル・{count}/{serverName}/{graceDays}/{warnDays}/{remainingDays} 置換可）
  notifyTemplate?: string;
  // 除外ロールID一覧
  exemptRoleIds: string[];
  // IANA タイムゾーン名（例: "Asia/Tokyo"）
  timezone: string;
  // 実行時刻（0〜23）
  runHour: number;
  // 同日2回実行ガード（"YYYY-MM-DD" 形式・未実行時 undefined）
  lastRunDate?: string;
  // 個別ユーザーメンション通知の有無
  mentionEnabled: boolean;
}

export interface VcAutoRecruitSettings {
  // 機能有効フラグ
  enabled: boolean;
  // 募集メッセージ投稿先（固定の通知チャンネル）
  channelId?: string;
  // カスタム募集メッセージ（{userMention}/{userName}/{channelMention}/{channelName}/{serverName} 置換可・content として送信）
  message?: string;
  // 募集 Embed を投稿に含めるか
  embedEnabled: boolean;
  // 募集を投稿する対象カテゴリ ID の allowlist（ルート直下は sentinel "TOP"・空＝どこにも投稿しない）移行期間中保持
  enabledCategoryIds: string[];
  // 募集を投稿する対象 VC チャンネル ID の allowlist（空＝どこにも投稿しない）
  enabledChannelIds: string[];
  // 投稿済みで「募集中」状態の募集メッセージ参照（募集終了処理で参照・編集後に除去）
  activeInvites: VcAutoRecruitRef[];
}

export interface VcAutoRecruitRef {
  // 募集対象のボイスチャンネルID
  voiceChannelId: string;
  // 募集メッセージを投稿したテキストチャンネルID
  postChannelId: string;
  // 投稿した募集メッセージID（募集終了時にこのメッセージを編集）
  messageId: string;
  // 投稿時刻（epoch ms）
  createdAt: number;
}

/** アクティビティ記録トリガーの種別 */
export type ActivityTrigger = "message" | "voice" | "reaction";

export interface MemberActivity {
  // ギルドID
  guildId: string;
  // ユーザーID
  userId: string;
  // 最終活動時刻
  lastActivityAt: Date;
  // 事前通知の進行段階（0=未通知, 1=1週間前済, 2=最終警告済）
  warnStage: number;
  // 累積メッセージ送信回数（アクティブ条件判定用）
  messageCount: number;
  // 累積VC参加回数
  voiceCount: number;
  // 累積リアクション回数
  reactionCount: number;
}
