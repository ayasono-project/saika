// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitRemoveRoleSelectHandler.test.ts

import { VC_RECRUIT_ROLE_CUSTOM_ID } from "@/bot/features/vc-recruit/commands/vcRecruitConfigCommand.constants";
import { vcRecruitRemoveRoleSelectHandler } from "@/bot/features/vc-recruit/handlers/ui/vcRecruitRemoveRoleSelectHandler";
import { vcRecruitRemoveRoleSelections } from "@/bot/features/vc-recruit/handlers/ui/vcRecruitRoleState";

// vcRecruitRemoveRoleSelectHandler の matches 判定と選択ロールの状態保存を検証
describe("vcRecruitRemoveRoleSelectHandler", () => {
  // 各テストケースで共有状態をクリアする
  beforeEach(() => {
    vcRecruitRemoveRoleSelections.clear();
  });

  it("matches は remove-role select プレフィックスに一致する", () => {
    expect(
      vcRecruitRemoveRoleSelectHandler.matches(
        `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_SELECT_PREFIX}session-1`,
      ),
    ).toBe(true);
    expect(vcRecruitRemoveRoleSelectHandler.matches("other-prefix:123")).toBe(
      false,
    );
  });

  it("選択されたロール ID を状態に保存し deferUpdate を呼ぶ", async () => {
    const sessionId = "session-1";
    const interaction = {
      customId: `${VC_RECRUIT_ROLE_CUSTOM_ID.REMOVE_ROLE_SELECT_PREFIX}${sessionId}`,
      values: ["role-1", "role-2"],
      deferUpdate: vi.fn().mockResolvedValue(undefined),
    };

    await vcRecruitRemoveRoleSelectHandler.execute(interaction as never);

    expect(vcRecruitRemoveRoleSelections.get(sessionId)).toEqual([
      "role-1",
      "role-2",
    ]);
    expect(interaction.deferUpdate).toHaveBeenCalledTimes(1);
  });
});
