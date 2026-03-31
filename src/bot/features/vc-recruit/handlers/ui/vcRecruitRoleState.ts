// src/bot/features/vc-recruit/handlers/ui/vcRecruitRoleState.ts
// add-role / remove-role の RoleSelectMenu / StringSelectMenu 選択状態を保持する

import { TtlMap } from "../../../../../shared/utils/ttlMap";
import { VC_RECRUIT_TIMEOUT } from "../../commands/vcRecruitConfigCommand.constants";

/** key: sessionId, value: 選択されたロール ID 配列 */
export const vcRecruitAddRoleSelections: TtlMap<string[]> = new TtlMap<
  string[]
>(VC_RECRUIT_TIMEOUT.ROLE_SELECT_TIMEOUT_MS);

/** key: sessionId, value: 選択されたロール ID 配列 */
export const vcRecruitRemoveRoleSelections: TtlMap<string[]> = new TtlMap<
  string[]
>(VC_RECRUIT_TIMEOUT.ROLE_SELECT_TIMEOUT_MS);
