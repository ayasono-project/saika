// tests/unit/shared/database/repositories/guildConfigRepository.test.ts
// GuildCoreRepository が core usecases へ正しく委譲し、エラー変換も行うことを検証
describe("shared/database/repositories/guildCoreRepository", () => {
  const loadModule = async () => {
    vi.resetModules();

    const coreUsecases = {
      getGuildConfigUsecase: vi.fn(),
      saveGuildConfigUsecase: vi.fn(),
      updateGuildConfigUsecase: vi.fn(),
      deleteGuildConfigUsecase: vi.fn(),
      existsGuildConfigUsecase: vi.fn(),
      getGuildLocaleUsecase: vi.fn(),
      updateGuildLocaleUsecase: vi.fn(),
    };

    vi.doMock(
      "@/shared/database/repositories/usecases/guildConfigCoreUsecases",
      () => coreUsecases,
    );

    const module = await import(
      "@/shared/database/repositories/guildCoreRepository"
    );
    return { module, coreUsecases };
  };

  it("コア操作が deps 付きでコアユースケースへ委譲されること", async () => {
    const { module, coreUsecases } = await loadModule();
    const prisma = { guildConfig: {} };
    const repository = new module.GuildCoreRepository(prisma as never);

    coreUsecases.getGuildConfigUsecase.mockResolvedValue({ guildId: "g1" });
    coreUsecases.existsGuildConfigUsecase.mockResolvedValue(true);
    coreUsecases.getGuildLocaleUsecase.mockResolvedValue("ja");

    await expect(repository.getConfig("g1")).resolves.toEqual({
      guildId: "g1",
    });
    await repository.saveConfig({ guildId: "g1" } as never);
    await repository.updateConfig("g1", { locale: "en" } as never);
    await repository.deleteConfig("g1");
    await expect(repository.exists("g1")).resolves.toBe(true);
    await expect(repository.getLocale("g1")).resolves.toBe("ja");
    await repository.updateLocale("g1", "en");

    expect(coreUsecases.getGuildConfigUsecase).toHaveBeenCalledWith(
      expect.objectContaining({
        prisma,
        defaultLocale: "ja",
        toDatabaseError: expect.any(Function),
      }),
      "g1",
    );
    expect(coreUsecases.saveGuildConfigUsecase).toHaveBeenCalled();
    expect(coreUsecases.updateGuildConfigUsecase).toHaveBeenCalled();
    expect(coreUsecases.deleteGuildConfigUsecase).toHaveBeenCalled();
    expect(coreUsecases.existsGuildConfigUsecase).toHaveBeenCalled();
    expect(coreUsecases.getGuildLocaleUsecase).toHaveBeenCalled();
    expect(coreUsecases.updateGuildLocaleUsecase).toHaveBeenCalled();
  });

  it("不明なエラーが toDatabaseError ヘルパーで DatabaseError に変換されること", async () => {
    const { module, coreUsecases } = await loadModule();
    const prisma = { guildConfig: {} };
    const repository = new module.GuildCoreRepository(prisma as never);

    coreUsecases.getGuildConfigUsecase.mockImplementation(
      (deps: {
        toDatabaseError: (prefix: string, error: unknown) => Error;
      }) => {
        throw deps.toDatabaseError("read failed", "non-error");
      },
    );

    await expect(repository.getConfig("g1")).rejects.toMatchObject({
      name: "DatabaseError",
      message: "read failed: unknown error",
    });
  });

  it("updateErrorChannel が updateConfig に errorChannelId を委譲すること", async () => {
    const { module, coreUsecases } = await loadModule();
    const prisma = { guildConfig: {} };
    const repository = new module.GuildCoreRepository(prisma as never);

    await repository.updateErrorChannel("g1", "ch-1");

    expect(coreUsecases.updateGuildConfigUsecase).toHaveBeenCalledWith(
      expect.objectContaining({ prisma }),
      "g1",
      { errorChannelId: "ch-1" },
    );
  });

  it("resetGuildSettings が locale をデフォルトに、errorChannelId を undefined にリセットすること", async () => {
    const { module, coreUsecases } = await loadModule();
    const prisma = { guildConfig: {} };
    const repository = new module.GuildCoreRepository(prisma as never);

    await repository.resetGuildSettings("g1");

    expect(coreUsecases.updateGuildConfigUsecase).toHaveBeenCalledWith(
      expect.objectContaining({ prisma }),
      "g1",
      { locale: "ja", errorChannelId: undefined },
    );
  });

  it("getGuildCoreRepository がシングルトンインスタンスを返すこと", async () => {
    const { module } = await loadModule();
    const prisma = { guildConfig: {} };

    const repo1 = module.getGuildCoreRepository(prisma as never);
    const repo2 = module.getGuildCoreRepository();

    expect(repo1).toBe(repo2);
    expect(repo1).toBeInstanceOf(module.GuildCoreRepository);
  });
});
