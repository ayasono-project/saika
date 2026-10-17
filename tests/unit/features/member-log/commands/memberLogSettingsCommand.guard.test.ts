import { PermissionError } from "@ayasono/shared/core";
import { ensureMemberLogManageGuildPermission } from "@/features/member-log/commands/memberLogSettingsCommand.guard";

// ---- モック定義 ----
vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: vi.fn((_locale: string, key: string) => key),
}));

// ---- ヘルパー ----

/** テスト用 interaction モックを生成する */
function makeInteraction(hasPermission: boolean | null) {
  return {
    memberPermissions:
      hasPermission === null ? null : { has: vi.fn(() => hasPermission) },
  };
}

// ensureMemberLogManageGuildPermission の権限チェック動作を検証
describe("bot/features/member-log/commands/memberLogSettingsCommand.guard", () => {
  // 各テストでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ManageGuild 権限がある場合は正常終了することを確認", async () => {
    const interaction = makeInteraction(true);

    await expect(
      ensureMemberLogManageGuildPermission(interaction as never),
    ).resolves.toBeUndefined();
  });

  it("ManageGuild 権限がない場合に PermissionError を投げることを確認", async () => {
    const interaction = makeInteraction(false);

    await expect(
      ensureMemberLogManageGuildPermission(interaction as never),
    ).rejects.toBeInstanceOf(PermissionError);
  });

  it("memberPermissions が null の場合に PermissionError を投げることを確認", async () => {
    const interaction = makeInteraction(null);

    await expect(
      ensureMemberLogManageGuildPermission(interaction as never),
    ).rejects.toBeInstanceOf(PermissionError);
  });
});
