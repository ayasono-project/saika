// tests/unit/bot/features/sticky-message/handlers/ui/stickyMessageRemoveSelectHandler.test.ts

vi.mock("@/bot/services/botCompositionRoot", () => ({
  tInteraction: vi.fn((_l: string, k: string) => k),
}));
vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: vi.fn((_l: string, k: string) => k),
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
}));

// stickyMessageRemoveSelectHandler のテスト
describe("bot/features/sticky-message/handlers/ui/stickyMessageRemoveSelectHandler", () => {
  // 各テストでモック呼び出し記録をリセットし、テスト間の副作用を排除する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("REMOVE_SELECT_CUSTOM_ID に完全一致する customId を正しく識別する", async () => {
    const { stickyMessageRemoveSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveSelectHandler"
    );
    expect(
      stickyMessageRemoveSelectHandler.matches("sticky-message:remove-select"),
    ).toBe(true);
    expect(
      stickyMessageRemoveSelectHandler.matches("sticky-message:view-select"),
    ).toBe(false);
  });

  it("選択値を一時保存し deferUpdate を呼ぶ", async () => {
    const { stickyMessageRemoveSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveSelectHandler"
    );
    const { stickyMessageRemoveSelections } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageRemoveState"
    );
    const deferUpdateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = {
      guildId: "guild-1",
      user: { id: "user-1" },
      values: ["ch-1", "ch-2"],
      deferUpdate: deferUpdateMock,
    };

    await stickyMessageRemoveSelectHandler.execute(interaction as never);

    expect(deferUpdateMock).toHaveBeenCalled();
    expect(stickyMessageRemoveSelections.get("guild-1:user-1")).toEqual([
      "ch-1",
      "ch-2",
    ]);

    // クリーンアップ
    stickyMessageRemoveSelections.delete("guild-1:user-1");
  });
});
