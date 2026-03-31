// src/shared/database/types/vcRecruitTypes.ts
// VcRecruit（VC募集機能）関連の型・定数

export interface VcRecruitConfig {
  // 機能有効フラグ
  enabled: boolean;
  // モーダルのメンション選択肢に表示するロールID一覧（最大25）
  mentionRoleIds: string[];
  // セットアップ済みの募集チャンネルセット一覧
  setups: VcRecruitSetup[];
}

export interface VcRecruitSetup {
  // セットアップしたカテゴリーID。TOP レベルの場合は null
  categoryId: string | null;
  // 募集作成チャンネル（vc-recruit）
  panelChannelId: string;
  // 募集投稿チャンネル（vc-recruit-board）
  postChannelId: string;
  // パネルメッセージID
  panelMessageId: string;
  // 募集スレッドの自動アーカイブ時間（分）
  // Discord 許容値: 60 / 1440 / 4320 / 10080
  threadArchiveDuration: 60 | 1440 | 4320 | 10080;
  // 「新規VC作成」で作成したVCのID一覧
  createdVoiceChannelIds: string[];
}

export const VC_RECRUIT_MENTION_ROLE_ADD_RESULT = {
  ADDED: "added",
  ALREADY_EXISTS: "already_exists",
  LIMIT_EXCEEDED: "limit_exceeded",
} as const;

export type VcRecruitMentionRoleAddResult =
  (typeof VC_RECRUIT_MENTION_ROLE_ADD_RESULT)[keyof typeof VC_RECRUIT_MENTION_ROLE_ADD_RESULT];

export const VC_RECRUIT_MENTION_ROLE_REMOVE_RESULT = {
  REMOVED: "removed",
  NOT_FOUND: "not_found",
} as const;

export type VcRecruitMentionRoleRemoveResult =
  (typeof VC_RECRUIT_MENTION_ROLE_REMOVE_RESULT)[keyof typeof VC_RECRUIT_MENTION_ROLE_REMOVE_RESULT];
