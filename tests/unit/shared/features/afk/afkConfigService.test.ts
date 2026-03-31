// tests/unit/shared/features/afk/afkConfigService.test.ts
// AfkConfigService クラスのメソッド動作・シングルトンキャッシュ挙動・モジュールレベル関数 API を検証するグループ
describe("shared/features/afk/afkConfigService", () => {
  const createRepositoryMock = () => ({
    getAfkConfig: vi.fn(),
    setAfkChannel: vi.fn(),
    updateAfkConfig: vi.fn(),
  });

  // シングルトンのキャッシュ状態が各テストに持ち越されないよう、毎回モジュールを再ロードする
  const loadModule = async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const getAfkConfigRepositoryMock = vi.fn();
    vi.doMock("@/shared/database/repositories/afkConfigRepository", () => ({
      getAfkConfigRepository: getAfkConfigRepositoryMock,
    }));

    const module = await import("@/shared/features/afk/afkConfigService");

    return {
      module,
      getAfkConfigRepositoryMock,
    };
  };

  it("リポジトリが null を返す場合は null、値がある場合は正規化コピーを返すこと", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.AfkConfigService(repository as never);

    repository.getAfkConfig.mockResolvedValueOnce(null);
    await expect(service.getAfkConfig("guild-1")).resolves.toBeNull();

    const rawConfig = { enabled: true, channelId: "channel-1" };
    repository.getAfkConfig.mockResolvedValueOnce(rawConfig);
    const config = await service.getAfkConfig("guild-1");

    expect(config).toEqual(rawConfig);
    expect(config).not.toBe(rawConfig);
  });

  it("設定が未登録の場合はデフォルト値を返し、呼び出しごとに別インスタンスになること", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.AfkConfigService(repository as never);
    repository.getAfkConfig.mockResolvedValue(null);

    const first = await service.getAfkConfigOrDefault("guild-1");
    const second = await service.getAfkConfigOrDefault("guild-1");

    expect(first).toEqual(module.DEFAULT_AFK_CONFIG);
    expect(first).not.toBe(second);
  });

  it("設定が存在する場合は getAfkConfigOrDefault がその値を返すこと", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.AfkConfigService(repository as never);

    const existing = { enabled: true, channelId: "channel-x" };
    repository.getAfkConfig.mockResolvedValueOnce(existing);

    await expect(service.getAfkConfigOrDefault("guild-1")).resolves.toEqual(
      existing,
    );
  });

  it("保存時に正規化済みコピーが渡され、repository の各操作に委譲されること", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.AfkConfigService(repository as never);

    const input = { enabled: true, channelId: "channel-1" };

    await service.saveAfkConfig("guild-1", input);

    expect(repository.updateAfkConfig).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({ enabled: true, channelId: "channel-1" }),
    );

    const savedConfig = repository.updateAfkConfig.mock.calls[0][1] as {
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

    const serviceA1 = module.getAfkConfigService(repositoryA as never);
    const serviceA2 = module.getAfkConfigService(repositoryA as never);
    const serviceB = module.getAfkConfigService(repositoryB as never);

    expect(serviceA1).toBe(serviceA2);
    expect(serviceA1).not.toBe(serviceB);
  });

  it("トップレベル関数 API がリポジトリファクトリ経由のシングルトンサービスに委譲すること", async () => {
    const { module, getAfkConfigRepositoryMock } = await loadModule();
    const repository = createRepositoryMock();
    getAfkConfigRepositoryMock.mockReturnValue(repository);

    repository.getAfkConfig.mockResolvedValue({
      enabled: true,
      channelId: "channel-1",
    });
    await module.getAfkConfig("guild-1");
    expect(repository.getAfkConfig).toHaveBeenCalledWith("guild-1");

    repository.getAfkConfig.mockResolvedValueOnce(null);
    await module.getAfkConfigOrDefault("guild-1");

    await module.saveAfkConfig("guild-1", { enabled: false });
    expect(repository.updateAfkConfig).toHaveBeenCalledWith(
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
