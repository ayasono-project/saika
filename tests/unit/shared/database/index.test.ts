// tests/unit/shared/database/index.test.ts
describe("shared/database standalone repository getters", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("各スタンドアロンリポジトリのシングルトンゲッターが prisma 未指定で例外をスローすること", async () => {
    const { getGuildCoreRepository } = await import(
      "@/shared/database/repositories/guildCoreRepository"
    );
    const { getAfkSettingsRepository } = await import(
      "@/shared/database/repositories/afkSettingsRepository"
    );
    const { getBumpReminderSettingsRepository } = await import(
      "@/shared/database/repositories/bumpReminderSettingsRepository"
    );
    const { getVacSettingsRepository } = await import(
      "@/shared/database/repositories/vacSettingsRepository"
    );
    const { getMemberLogSettingsRepository } = await import(
      "@/shared/database/repositories/memberLogSettingsRepository"
    );
    const { getVcRecruitSettingsRepository } = await import(
      "@/shared/database/repositories/vcRecruitSettingsRepository"
    );

    expect(() => getGuildCoreRepository()).toThrow("not initialized");
    expect(() => getAfkSettingsRepository()).toThrow("not initialized");
    expect(() => getBumpReminderSettingsRepository()).toThrow(
      "not initialized",
    );
    expect(() => getVacSettingsRepository()).toThrow("not initialized");
    expect(() => getMemberLogSettingsRepository()).toThrow("not initialized");
    expect(() => getVcRecruitSettingsRepository()).toThrow("not initialized");
  });

  it("types モジュールから Bump リマインダー結果定数をエクスポートしていること", async () => {
    const typesModule = await import("@/shared/database/types");

    expect(typesModule.BUMP_REMINDER_MENTION_CLEAR_RESULT).toBeDefined();
    expect(typesModule.BUMP_REMINDER_MENTION_ROLE_RESULT).toBeDefined();
    expect(typesModule.BUMP_REMINDER_MENTION_USER_ADD_RESULT).toBeDefined();
    expect(typesModule.BUMP_REMINDER_MENTION_USER_REMOVE_RESULT).toBeDefined();
    expect(typesModule.BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT).toBeDefined();
  });
});
