// src/bot/features/vc-recruit/handlers/ui/vcRecruitPanelState.ts
// VC募集セレクトステップの一時状態管理

/**
 * 「VC募集を作成」ボタン押下からモーダル確定までの一時セッション情報
 */
export interface VcRecruitSession {
  /** 操作したパネルチャンネルID */
  panelChannelId: string;
  /** 選択されたメンションロールID一覧（空配列 = なし） */
  mentionRoleIds: string[];
  /** 選択されたVC ID（"__new__" = 新規作成 / 既存VC ID） */
  selectedVcId: string;
  /** セッション作成時刻（タイムアウト管理用） */
  createdAt: number;
}

/** 新規VC作成を表す特殊値 */
export const NEW_VC_VALUE = "__new__" as const;

import { TtlMap } from "../../../../../shared/utils/ttlMap";
import { VC_RECRUIT_TIMEOUT } from "../../commands/vcRecruitConfigCommand.constants";

/** モーダル interactionId → VcRecruitSession のインメモリストア */
const sessions = new TtlMap<VcRecruitSession>(
  VC_RECRUIT_TIMEOUT.SESSION_TTL_MS,
);

/**
 * セッションを保存する
 * @param interactionId インタラクション ID
 * @param session 保存するセッション情報
 */
export function setVcRecruitSession(
  interactionId: string,
  session: VcRecruitSession,
): void {
  sessions.set(interactionId, session);
}

/**
 * セッションを取得する
 * @param interactionId インタラクション ID
 * @returns セッション情報（存在しない場合は undefined）
 */
export function getVcRecruitSession(
  interactionId: string,
): VcRecruitSession | undefined {
  return sessions.get(interactionId);
}

/**
 * セッションを削除する
 * @param interactionId インタラクション ID
 */
export function deleteVcRecruitSession(interactionId: string): void {
  sessions.delete(interactionId);
}

/**
 * セッションを部分更新する
 * @param interactionId インタラクション ID
 * @param updates 更新する部分フィールド
 */
export function updateVcRecruitSession(
  interactionId: string,
  updates: Partial<VcRecruitSession>,
): void {
  const existing = sessions.get(interactionId);
  if (existing) {
    sessions.set(interactionId, { ...existing, ...updates });
  }
}
