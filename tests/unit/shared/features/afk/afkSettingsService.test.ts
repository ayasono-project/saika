// tests/unit/shared/features/afk/afkSettingsService.test.ts
// AfkSettingsService クラスのメソッド動作・シングルトンキャッシュ挙動・モジュールレベル関数 API を検証するグループ
describe("shared/features/afk/afkSettingsService", () => {
  const createRepositoryMock = () => ({
    getAfkSettings: vi.fn(),
    setAfkChannel: vi.fn(),
    updateAfkSettings: vi.fn(),
  });

  // シングルトンのキャッシュ状態が各テストに持ち越されないよう、毎回モジュールを再ロードする
  const loadModule = async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const getAfkSettingsRepositoryMock = vi.fn();
    vi.doMock("@/shared/database/repositories/afkSettingsRepository", () => ({
      getAfkSettingsRepository: getAfkSettingsRepositoryMock,
    }));

    const module = await import("@/shared/features/afk/afkSettingsService");

    return {
      module,
      getAfkSettingsRepositoryMock,
    };
  };

  it("リポジトリが null を返す場合は null、値がある場合は正規化コピーを返すこと", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.AfkSettingsService(repository as never);

    repository.getAfkSettings.mockResolvedValueOnce(null);
    await expect(service.getAfkSettings("guild-1")).resolves.toBeNull();

    const rawConfig = { enabled: true, channelId: "channel-1" };
    repository.getAfkSettings.mockResolvedValueOnce(rawConfig);
    const config = await service.getAfkSettings("guild-1");

    expect(config).toEqual(rawConfig);
    expect(config).not.toBe(rawConfig);
  });

  it("設定が未登録の場合はデフォルト値を返し、呼び出しごとに別インスタンスになること", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.AfkSettingsService(repository as never);
    repository.getAfkSettings.mockResolvedValue(null);

    const first = await service.getAfkSettingsOrDefault("guild-1");
    const second = await service.getAfkSettingsOrDefault("guild-1");

    expect(first).toEqual(module.DEFAULT_AFK_SETTINGS);
    expect(first).not.toBe(second);
  });

  it("設定が存在する場合は getAfkSettingsOrDefault がその値を返すこと", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.AfkSettingsService(repository as never);

    const existing = { enabled: true, channelId: "channel-x" };
    repository.getAfkSettings.mockResolvedValueOnce(existing);

    await expect(service.getAfkSettingsOrDefault("guild-1")).resolves.toEqual(
      existing,
    );
  });

  it("保存時に正規化済みコピーが渡され、repository の各操作に委譲されること", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.AfkSettingsService(repository as never);

    const input = { enabled: true, channelId: "channel-1" };

    await service.saveAfkSettings("guild-1", input);

    expect(repository.updateAfkSettings).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({ enabled: true, channelId: "channel-1" }),
    );

    const savedConfig = repository.updateAfkSettings.mock.calls[0][1] as {
      enabled: boolean;
      channelId?: string;
    };
    expect(savedConfig).not.toBe(input);

    repository.setAfkChannel.mockResolvedValue(undefined);
    await service.setAfkChannel("guild-1", "channel-2");
    expect(repository.setAfkChannel).toHaveBeenCalledWith(
      "guild-1",
      "channel-2",
    );
  });

  it("同一 repository ではシングルトンを返し、異なる repository では新しいインスタンスを生成すること", async () => {
    const { module } = await loadModule();
    const repositoryA = createRepositoryMock();
    const repositoryB = createRepositoryMock();

    const serviceA1 = module.getAfkSettingsService(repositoryA as never);
    const serviceA2 = module.getAfkSettingsService(repositoryA as never);
    const serviceB = module.getAfkSettingsService(repositoryB as never);

    expect(serviceA1).toBe(serviceA2);
    expect(serviceA1).not.toBe(serviceB);
  });

  it("トップレベル関数 API がリポジトリファクトリ経由のシングルトンサービスに委譲すること", async () => {
    const { module, getAfkSettingsRepositoryMock } = await loadModule();
    const repository = createRepositoryMock();
    getAfkSettingsRepositoryMock.mockReturnValue(repository);

    repository.getAfkSettings.mockResolvedValue({
      enabled: true,
      channelId: "channel-1",
    });
    await module.getAfkSettings("guild-1");
    expect(repository.getAfkSettings).toHaveBeenCalledWith("guild-1");

    repository.getAfkSettings.mockResolvedValueOnce(null);
    await module.getAfkSettingsOrDefault("guild-1");

    await module.saveAfkSettings("guild-1", { enabled: false });
    expect(repository.updateAfkSettings).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({ enabled: false }),
    );

    await module.setAfkChannel("guild-1", "channel-3");
    expect(repository.setAfkChannel).toHaveBeenCalledWith(
      "guild-1",
      "channel-3",
    );
  });
});
