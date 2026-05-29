// tests/unit/shared/database/repositories/guildSettingsRepository.test.ts
// GuildCoreRepository が core usecases へ正しく委譲し、エラー変換も行うことを検証
describe("shared/database/repositories/guildCoreRepository", () => {
  const loadModule = async () => {
    vi.resetModules();

    const coreUsecases = {
      getGuildSettingsUsecase: vi.fn(),
      saveGuildSettingsUsecase: vi.fn(),
      updateGuildSettingsUsecase: vi.fn(),
      deleteGuildSettingsUsecase: vi.fn(),
      existsGuildSettingsUsecase: vi.fn(),
      getGuildLocaleUsecase: vi.fn(),
      updateGuildLocaleUsecase: vi.fn(),
    };

    vi.doMock(
      "@/features/guild-settings/usecases/guildSettingsCoreUsecases",
      () => coreUsecases,
    );

    const module = await import(
      "@/features/guild-settings/guildCoreRepository"
    );
    return { module, coreUsecases };
  };

  it("コア操作が deps 付きでコアユースケースへ委譲されること", async () => {
    const { module, coreUsecases } = await loadModule();
    const prisma = { guildSettings: {} };
    const repository = new module.GuildCoreRepository(prisma as never);

    coreUsecases.getGuildSettingsUsecase.mockResolvedValue({ guildId: "g1" });
    coreUsecases.existsGuildSettingsUsecase.mockResolvedValue(true);
    coreUsecases.getGuildLocaleUsecase.mockResolvedValue("ja");

    await expect(repository.getSettings("g1")).resolves.toEqual({
      guildId: "g1",
    });
    await repository.saveSettings({ guildId: "g1" } as never);
    await repository.updateSettings("g1", { locale: "en" } as never);
    await repository.deleteSettings("g1");
    await expect(repository.exists("g1")).resolves.toBe(true);
    await expect(repository.getLocale("g1")).resolves.toBe("ja");
    await repository.updateLocale("g1", "en");

    expect(coreUsecases.getGuildSettingsUsecase).toHaveBeenCalledWith(
      expect.objectContaining({
        prisma,
        defaultLocale: "ja",
        toDatabaseError: expect.any(Function),
      }),
      "g1",
    );
    expect(coreUsecases.saveGuildSettingsUsecase).toHaveBeenCalled();
    expect(coreUsecases.updateGuildSettingsUsecase).toHaveBeenCalled();
    expect(coreUsecases.deleteGuildSettingsUsecase).toHaveBeenCalled();
    expect(coreUsecases.existsGuildSettingsUsecase).toHaveBeenCalled();
    expect(coreUsecases.getGuildLocaleUsecase).toHaveBeenCalled();
    expect(coreUsecases.updateGuildLocaleUsecase).toHaveBeenCalled();
  });

  it("不明なエラーが toDatabaseError ヘルパーで DatabaseError に変換されること", async () => {
    const { module, coreUsecases } = await loadModule();
    const prisma = { guildSettings: {} };
    const repository = new module.GuildCoreRepository(prisma as never);

    coreUsecases.getGuildSettingsUsecase.mockImplementation(
      (deps: {
        toDatabaseError: (prefix: string, error: unknown) => Error;
      }) => {
        throw deps.toDatabaseError("read failed", "non-error");
      },
    );

    await expect(repository.getSettings("g1")).rejects.toMatchObject({
      name: "DatabaseError",
      message: "read failed: unknown error",
    });
  });

  it("updateErrorChannel が updateSettings に errorChannelId を委譲すること", async () => {
    const { module, coreUsecases } = await loadModule();
    const prisma = { guildSettings: {} };
    const repository = new module.GuildCoreRepository(prisma as never);

    await repository.updateErrorChannel("g1", "ch-1");

    expect(coreUsecases.updateGuildSettingsUsecase).toHaveBeenCalledWith(
      expect.objectContaining({ prisma }),
      "g1",
      { errorChannelId: "ch-1" },
    );
  });

  it("resetGuildSettings が locale をデフォルトに、errorChannelId を undefined にリセットすること", async () => {
    const { module, coreUsecases } = await loadModule();
    const prisma = { guildSettings: {} };
    const repository = new module.GuildCoreRepository(prisma as never);

    await repository.resetGuildSettings("g1");

    expect(coreUsecases.updateGuildSettingsUsecase).toHaveBeenCalledWith(
      expect.objectContaining({ prisma }),
      "g1",
      { locale: "ja", errorChannelId: undefined },
    );
  });

  it("getGuildCoreRepository がシングルトンインスタンスを返すこと", async () => {
    const { module } = await loadModule();
    const prisma = { guildSettings: {} };

    const repo1 = module.getGuildCoreRepository(prisma as never);
    const repo2 = module.getGuildCoreRepository();

    expect(repo1).toBe(repo2);
    expect(repo1).toBeInstanceOf(module.GuildCoreRepository);
  });
});
