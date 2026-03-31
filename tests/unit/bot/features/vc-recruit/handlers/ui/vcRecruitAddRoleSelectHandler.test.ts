// tests/unit/bot/features/vc-recruit/handlers/ui/vcRecruitAddRoleSelectHandler.test.ts

import { VC_RECRUIT_ROLE_CUSTOM_ID } from "@/bot/features/vc-recruit/commands/vcRecruitConfigCommand.constants";
import { vcRecruitAddRoleSelectHandler } from "@/bot/features/vc-recruit/handlers/ui/vcRecruitAddRoleSelectHandler";
import { vcRecruitAddRoleSelections } from "@/bot/features/vc-recruit/handlers/ui/vcRecruitRoleState";

// vcRecruitAddRoleSelectHandler の matches 判定と選択ロールの状態保存を検証
describe("vcRecruitAddRoleSelectHandler", () => {
  // 各テストケースで共有状態をクリアする
  beforeEach(() => {
    vcRecruitAddRoleSelections.clear();
  });

  it("matches は add-role select プレフィックスに一致する", () => {
    expect(
      vcRecruitAddRoleSelectHandler.matches(
        `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_SELECT_PREFIX}session-1`,
      ),
    ).toBe(true);
    expect(vcRecruitAddRoleSelectHandler.matches("other-prefix:123")).toBe(
      false,
    );
  });

  it("選択されたロール ID を状態に保存し deferUpdate を呼ぶ", async () => {
    const sessionId = "session-1";
    const interaction = {
      customId: `${VC_RECRUIT_ROLE_CUSTOM_ID.ADD_ROLE_SELECT_PREFIX}${sessionId}`,
      values: ["role-1", "role-2"],
      deferUpdate: vi.fn().mockResolvedValue(undefined),
    };

    await vcRecruitAddRoleSelectHandler.execute(interaction as never);

    expect(vcRecruitAddRoleSelections.get(sessionId)).toEqual([
      "role-1",
      "role-2",
    ]);
    expect(interaction.deferUpdate).toHaveBeenCalledTimes(1);
  });
});
