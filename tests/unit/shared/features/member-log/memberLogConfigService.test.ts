// tests/unit/shared/features/member-log/memberLogConfigService.test.ts
// MemberLogConfigService のデータ取得・保存・シングルトン管理を検証
describe("shared/features/member-log/memberLogConfigService", () => {
  /** テスト用 repository モックを生成する */
  const createRepositoryMock = () => ({
    getMemberLogConfig: vi.fn(),
    updateMemberLogConfig: vi.fn(),
  });

  // vi.resetModules() で ESM キャッシュを破棄し、各テストで独立したモジュールスコープを使用するためのヘルパー
  const loadModule = async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const getMemberLogConfigRepositoryMock = vi.fn();
    vi.doMock(
      "@/shared/database/repositories/memberLogConfigRepository",
      () => ({
        getMemberLogConfigRepository: getMemberLogConfigRepositoryMock,
      }),
    );

    const module = await import(
      "@/shared/features/member-log/memberLogConfigService"
    );

    return { module, getMemberLogConfigRepositoryMock };
  };

  // getMemberLogConfig がリポジトリの値をそのまま返すことを確認
  describe("MemberLogConfigService", () => {
    it("repository に設定がない場合は getMemberLogConfig が null を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      repository.getMemberLogConfig.mockResolvedValueOnce(null);

      const result = await service.getMemberLogConfig("guild-1");

      expect(result).toBeNull();
      expect(repository.getMemberLogConfig).toHaveBeenCalledWith("guild-1");
    });

    it("repository の値を getMemberLogConfig が返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      const config = { enabled: true, channelId: "ch-1" };
      repository.getMemberLogConfig.mockResolvedValueOnce(config);

      const result = await service.getMemberLogConfig("guild-1");

      expect(result).toEqual(config);
    });

    it("設定が null の場合は getMemberLogConfigOrDefault がデフォルト値を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      repository.getMemberLogConfig.mockResolvedValueOnce(null);

      const result = await service.getMemberLogConfigOrDefault("guild-1");

      expect(result).toEqual({ enabled: false });
    });

    it("getMemberLogConfigOrDefault が呼び出しごとに別インスタンスを返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      repository.getMemberLogConfig.mockResolvedValue(null);

      const first = await service.getMemberLogConfigOrDefault("guild-1");
      const second = await service.getMemberLogConfigOrDefault("guild-1");

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });

    it("setChannelId が現在の設定を読み込んで channelId をマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      const current = { enabled: true };
      repository.getMemberLogConfig.mockResolvedValueOnce(current);
      repository.updateMemberLogConfig.mockResolvedValueOnce(undefined);

      await service.setChannelId("guild-1", "ch-new");

      expect(repository.updateMemberLogConfig).toHaveBeenCalledWith("guild-1", {
        enabled: true,
        channelId: "ch-new",
      });
    });

    it("setEnabled が現在の設定を読み込んで enabled フラグをマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      repository.getMemberLogConfig.mockResolvedValueOnce({
        enabled: false,
        channelId: "ch-1",
      });
      repository.updateMemberLogConfig.mockResolvedValueOnce(undefined);

      await service.setEnabled("guild-1", true);

      expect(repository.updateMemberLogConfig).toHaveBeenCalledWith("guild-1", {
        enabled: true,
        channelId: "ch-1",
      });
    });

    it("setJoinMessage が現在の設定を読み込んで joinMessage をマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      repository.getMemberLogConfig.mockResolvedValueOnce({ enabled: true });
      repository.updateMemberLogConfig.mockResolvedValueOnce(undefined);

      await service.setJoinMessage("guild-1", "ようこそ!");

      expect(repository.updateMemberLogConfig).toHaveBeenCalledWith("guild-1", {
        enabled: true,
        joinMessage: "ようこそ!",
      });
    });

    it("setLeaveMessage が現在の設定を読み込んで leaveMessage をマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      repository.getMemberLogConfig.mockResolvedValueOnce({ enabled: true });
      repository.updateMemberLogConfig.mockResolvedValueOnce(undefined);

      await service.setLeaveMessage("guild-1", "さようなら!");

      expect(repository.updateMemberLogConfig).toHaveBeenCalledWith("guild-1", {
        enabled: true,
        leaveMessage: "さようなら!",
      });
    });

    it("clearJoinMessage が joinMessage を undefined に上書きして他のフィールドを保持すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      repository.getMemberLogConfig.mockResolvedValueOnce({
        enabled: true,
        channelId: "ch-1",
        joinMessage: "ようこそ!",
        leaveMessage: "さようなら!",
      });
      repository.updateMemberLogConfig.mockResolvedValueOnce(undefined);

      await service.clearJoinMessage("guild-1");

      expect(repository.updateMemberLogConfig).toHaveBeenCalledWith("guild-1", {
        enabled: true,
        channelId: "ch-1",
        joinMessage: undefined,
        leaveMessage: "さようなら!",
      });
    });

    it("clearLeaveMessage が leaveMessage を undefined に上書きして他のフィールドを保持すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      repository.getMemberLogConfig.mockResolvedValueOnce({
        enabled: true,
        channelId: "ch-1",
        joinMessage: "ようこそ!",
        leaveMessage: "さようなら!",
      });
      repository.updateMemberLogConfig.mockResolvedValueOnce(undefined);

      await service.clearLeaveMessage("guild-1");

      expect(repository.updateMemberLogConfig).toHaveBeenCalledWith("guild-1", {
        enabled: true,
        channelId: "ch-1",
        joinMessage: "ようこそ!",
        leaveMessage: undefined,
      });
    });

    it("disableAndClearChannel が channelId を undefined・enabled を false にマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogConfigService(repository as never);
      repository.getMemberLogConfig.mockResolvedValueOnce({
        enabled: true,
        channelId: "ch-1",
        joinMessage: "ようこそ!",
      });
      repository.updateMemberLogConfig.mockResolvedValueOnce(undefined);

      await service.disableAndClearChannel("guild-1");

      expect(repository.updateMemberLogConfig).toHaveBeenCalledWith("guild-1", {
        enabled: false,
        channelId: undefined,
        joinMessage: "ようこそ!",
      });
    });
  });

  // createMemberLogConfigService が新しいインスタンスを返すことを検証
  describe("createMemberLogConfigService", () => {
    it("createMemberLogConfigService が新しい MemberLogConfigService インスタンスを生成すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();

      const service = module.createMemberLogConfigService(repository as never);

      expect(service).toBeInstanceOf(module.MemberLogConfigService);
    });
  });

  // getMemberLogConfigService のシングルトン動作を検証
  describe("getMemberLogConfigService", () => {
    it("同じ repository で呼び出すと同一のシングルトンを返すこと", async () => {
      const { module, getMemberLogConfigRepositoryMock } = await loadModule();
      const repository = createRepositoryMock();
      getMemberLogConfigRepositoryMock.mockReturnValue(repository);

      const first = module.getMemberLogConfigService();
      const second = module.getMemberLogConfigService();

      expect(first).toBe(second);
    });

    it("異なる repository で呼び出すと新しいインスタンスを生成すること", async () => {
      const { module } = await loadModule();
      const repo1 = createRepositoryMock();
      const repo2 = createRepositoryMock();

      const first = module.getMemberLogConfigService(repo1 as never);
      const second = module.getMemberLogConfigService(repo2 as never);

      expect(first).not.toBe(second);
    });

    it("repository が指定されない場合は getGuildConfigRepository をデフォルトとして使用すること", async () => {
      const { module, getMemberLogConfigRepositoryMock } = await loadModule();
      const repository = createRepositoryMock();
      getMemberLogConfigRepositoryMock.mockReturnValue(repository);

      const service = module.getMemberLogConfigService();
      repository.getMemberLogConfig.mockResolvedValueOnce(null);
      await service.getMemberLogConfig("guild-1");

      expect(repository.getMemberLogConfig).toHaveBeenCalledWith("guild-1");
      expect(getMemberLogConfigRepositoryMock).toHaveBeenCalled();
    });
  });
});
