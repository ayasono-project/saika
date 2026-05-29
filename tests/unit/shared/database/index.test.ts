// tests/unit/shared/database/index.test.ts
describe("shared/database standalone repository getters", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("各スタンドアロンリポジトリのシングルトンゲッターが prisma 未指定で例外をスローすること", async () => {
    const { getGuildCoreRepository } = await import(
      "@/features/guild-settings/guildCoreRepository"
    );
    const { getAfkSettingsRepository } = await import(
      "@/features/afk/afkSettingsRepository"
    );
    const { getBumpReminderSettingsRepository } = await import(
      "@/features/bump-reminder/bumpReminderSettingsRepository"
    );
    const { getVacSettingsRepository } = await import(
      "@/features/vac/vacSettingsRepository"
    );
    const { getMemberLogSettingsRepository } = await import(
      "@/features/member-log/memberLogSettingsRepository"
    );
    const { getVcRecruitSettingsRepository } = await import(
      "@/features/vc-recruit/vcRecruitSettingsRepository"
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
