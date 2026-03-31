// tests/unit/shared/database/index.test.ts
describe("shared/database standalone repository getters", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("各スタンドアロンリポジトリのシングルトンゲッターが prisma 未指定で例外をスローすること", async () => {
    const { getGuildCoreRepository } = await import(
      "@/shared/database/repositories/guildCoreRepository"
    );
    const { getAfkConfigRepository } = await import(
      "@/shared/database/repositories/afkConfigRepository"
    );
    const { getBumpReminderConfigRepository } = await import(
      "@/shared/database/repositories/bumpReminderConfigRepository"
    );
    const { getVacConfigRepository } = await import(
      "@/shared/database/repositories/vacConfigRepository"
    );
    const { getMemberLogConfigRepository } = await import(
      "@/shared/database/repositories/memberLogConfigRepository"
    );
    const { getVcRecruitConfigRepository } = await import(
      "@/shared/database/repositories/vcRecruitConfigRepository"
    );

    expect(() => getGuildCoreRepository()).toThrow("not initialized");
    expect(() => getAfkConfigRepository()).toThrow("not initialized");
    expect(() => getBumpReminderConfigRepository()).toThrow("not initialized");
    expect(() => getVacConfigRepository()).toThrow("not initialized");
    expect(() => getMemberLogConfigRepository()).toThrow("not initialized");
    expect(() => getVcRecruitConfigRepository()).toThrow("not initialized");
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
