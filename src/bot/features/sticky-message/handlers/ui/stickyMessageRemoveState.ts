// src/bot/features/sticky-message/handlers/ui/stickyMessageRemoveState.ts
// sticky-message remove の選択状態を保持する（セレクトメニュー → ボタン間の受け渡し用）

import { TtlMap } from "../../../../../shared/utils/ttlMap";

/** セッション有効期限（5分） */
const SESSION_TTL_MS = 5 * 60 * 1000;

/** key: `${guildId}:${userId}`, value: 選択されたチャンネル ID 配列 */
export const stickyMessageRemoveSelections: TtlMap<string[]> = new TtlMap<
  string[]
>(SESSION_TTL_MS);
