// src/bot/features/vc-recruit/handlers/ui/vcRecruitTeardownState.ts
// VC募集 teardown のセレクト確認ステップ用一時状態管理

/** 確認パネルに表示するセットアップ情報 */
export interface TeardownSetupEntry {
  /** パネルチャンネルID（teardown の対象キー） */
  panelChannelId: string;
  /** 表示用カテゴリーラベル */
  categoryLabel: string;
}

/** セレクトメニュー選択後・確認ボタン押下前の一時セッション */
export interface TeardownConfirmSession {
  /** ギルドID */
  guildId: string;
  /** 選択されたセットアップ一覧 */
  selectedSetups: TeardownSetupEntry[];
}

import { TtlMap } from "../../../../../shared/utils/ttlMap";
import { VC_RECRUIT_TIMEOUT } from "../../commands/vcRecruitConfigCommand.constants";

/** セレクトインタラクションID → TeardownConfirmSession のインメモリストア */
const sessions = new TtlMap<TeardownConfirmSession>(
  VC_RECRUIT_TIMEOUT.COMPONENT_DISABLE_MS,
);

/**
 * teardown 確認セッションを保存する
 * @param selectInteractionId セレクトインタラクションの ID
 * @param session 保存するセッション情報
 */
export function setTeardownConfirmSession(
  selectInteractionId: string,
  session: TeardownConfirmSession,
): void {
  sessions.set(selectInteractionId, session);
}

/**
 * teardown 確認セッションを取得する
 * @param selectInteractionId セレクトインタラクションの ID
 * @returns セッション情報（存在しない場合は undefined）
 */
export function getTeardownConfirmSession(
  selectInteractionId: string,
): TeardownConfirmSession | undefined {
  return sessions.get(selectInteractionId);
}

/**
 * teardown 確認セッションを削除する
 * @param selectInteractionId セレクトインタラクションの ID
 */
export function deleteTeardownConfirmSession(
  selectInteractionId: string,
): void {
  sessions.delete(selectInteractionId);
}
