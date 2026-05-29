// tests/unit/shared/features/member-log/memberLogSettingsService.test.ts
// MemberLogSettingsService のデータ取得・保存・シングルトン管理を検証
describe("shared/features/member-log/memberLogSettingsService", () => {
  /** テスト用 repository モックを生成する */
  const createRepositoryMock = () => ({
    getMemberLogSettings: vi.fn(),
    updateMemberLogSettings: vi.fn(),
  });

  // vi.resetModules() で ESM キャッシュを破棄し、各テストで独立したモジュールスコープを使用するためのヘルパー
  const loadModule = async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const getMemberLogSettingsRepositoryMock = vi.fn();
    vi.doMock("@/features/member-log/memberLogSettingsRepository", () => ({
      getMemberLogSettingsRepository: getMemberLogSettingsRepositoryMock,
    }));

    const module = await import(
      "@/features/member-log/memberLogSettingsService"
    );

    return { module, getMemberLogSettingsRepositoryMock };
  };

  // getMemberLogSettings がリポジトリの値をそのまま返すことを確認
  describe("MemberLogSettingsService", () => {
    it("repository に設定がない場合は getMemberLogSettings が null を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      repository.getMemberLogSettings.mockResolvedValueOnce(null);

      const result = await service.getMemberLogSettings("guild-1");

      expect(result).toBeNull();
      expect(repository.getMemberLogSettings).toHaveBeenCalledWith("guild-1");
    });

    it("repository の値を getMemberLogSettings が返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      const config = { enabled: true, channelId: "ch-1" };
      repository.getMemberLogSettings.mockResolvedValueOnce(config);

      const result = await service.getMemberLogSettings("guild-1");

      expect(result).toEqual(config);
    });

    it("設定が null の場合は getMemberLogSettingsOrDefault がデフォルト値を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      repository.getMemberLogSettings.mockResolvedValueOnce(null);

      const result = await service.getMemberLogSettingsOrDefault("guild-1");

      expect(result).toEqual({ enabled: false });
    });

    it("getMemberLogSettingsOrDefault が呼び出しごとに別インスタンスを返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      repository.getMemberLogSettings.mockResolvedValue(null);

      const first = await service.getMemberLogSettingsOrDefault("guild-1");
      const second = await service.getMemberLogSettingsOrDefault("guild-1");

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });

    it("setChannelId が現在の設定を読み込んで channelId をマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      const current = { enabled: true };
      repository.getMemberLogSettings.mockResolvedValueOnce(current);
      repository.updateMemberLogSettings.mockResolvedValueOnce(undefined);

      await service.setChannelId("guild-1", "ch-new");

      expect(repository.updateMemberLogSettings).toHaveBeenCalledWith(
        "guild-1",
        {
          enabled: true,
          channelId: "ch-new",
        },
      );
    });

    it("setEnabled が現在の設定を読み込んで enabled フラグをマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      repository.getMemberLogSettings.mockResolvedValueOnce({
        enabled: false,
        channelId: "ch-1",
      });
      repository.updateMemberLogSettings.mockResolvedValueOnce(undefined);

      await service.setEnabled("guild-1", true);

      expect(repository.updateMemberLogSettings).toHaveBeenCalledWith(
        "guild-1",
        {
          enabled: true,
          channelId: "ch-1",
        },
      );
    });

    it("setJoinMessage が現在の設定を読み込んで joinMessage をマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      repository.getMemberLogSettings.mockResolvedValueOnce({ enabled: true });
      repository.updateMemberLogSettings.mockResolvedValueOnce(undefined);

      await service.setJoinMessage("guild-1", "ようこそ!");

      expect(repository.updateMemberLogSettings).toHaveBeenCalledWith(
        "guild-1",
        {
          enabled: true,
          joinMessage: "ようこそ!",
        },
      );
    });

    it("setLeaveMessage が現在の設定を読み込んで leaveMessage をマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      repository.getMemberLogSettings.mockResolvedValueOnce({ enabled: true });
      repository.updateMemberLogSettings.mockResolvedValueOnce(undefined);

      await service.setLeaveMessage("guild-1", "さようなら!");

      expect(repository.updateMemberLogSettings).toHaveBeenCalledWith(
        "guild-1",
        {
          enabled: true,
          leaveMessage: "さようなら!",
        },
      );
    });

    it("clearJoinMessage が joinMessage を undefined に上書きして他のフィールドを保持すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      repository.getMemberLogSettings.mockResolvedValueOnce({
        enabled: true,
        channelId: "ch-1",
        joinMessage: "ようこそ!",
        leaveMessage: "さようなら!",
      });
      repository.updateMemberLogSettings.mockResolvedValueOnce(undefined);

      await service.clearJoinMessage("guild-1");

      expect(repository.updateMemberLogSettings).toHaveBeenCalledWith(
        "guild-1",
        {
          enabled: true,
          channelId: "ch-1",
          joinMessage: undefined,
          leaveMessage: "さようなら!",
        },
      );
    });

    it("clearLeaveMessage が leaveMessage を undefined に上書きして他のフィールドを保持すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      repository.getMemberLogSettings.mockResolvedValueOnce({
        enabled: true,
        channelId: "ch-1",
        joinMessage: "ようこそ!",
        leaveMessage: "さようなら!",
      });
      repository.updateMemberLogSettings.mockResolvedValueOnce(undefined);

      await service.clearLeaveMessage("guild-1");

      expect(repository.updateMemberLogSettings).toHaveBeenCalledWith(
        "guild-1",
        {
          enabled: true,
          channelId: "ch-1",
          joinMessage: "ようこそ!",
          leaveMessage: undefined,
        },
      );
    });

    it("disableAndClearChannel が channelId を undefined・enabled を false にマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.MemberLogSettingsService(repository as never);
      repository.getMemberLogSettings.mockResolvedValueOnce({
        enabled: true,
        channelId: "ch-1",
        joinMessage: "ようこそ!",
      });
      repository.updateMemberLogSettings.mockResolvedValueOnce(undefined);

      await service.disableAndClearChannel("guild-1");

      expect(repository.updateMemberLogSettings).toHaveBeenCalledWith(
        "guild-1",
        {
          enabled: false,
          channelId: undefined,
          joinMessage: "ようこそ!",
        },
      );
    });
  });

  // createMemberLogSettingsService が新しいインスタンスを返すことを検証
  describe("createMemberLogSettingsService", () => {
    it("createMemberLogSettingsService が新しい MemberLogSettingsService インスタンスを生成すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();

      const service = module.createMemberLogSettingsService(
        repository as never,
      );

      expect(service).toBeInstanceOf(module.MemberLogSettingsService);
    });
  });

  // getMemberLogSettingsService のシングルトン動作を検証
  describe("getMemberLogSettingsService", () => {
    it("同じ repository で呼び出すと同一のシングルトンを返すこと", async () => {
      const { module, getMemberLogSettingsRepositoryMock } = await loadModule();
      const repository = createRepositoryMock();
      getMemberLogSettingsRepositoryMock.mockReturnValue(repository);

      const first = module.getMemberLogSettingsService();
      const second = module.getMemberLogSettingsService();

      expect(first).toBe(second);
    });

    it("異なる repository で呼び出すと新しいインスタンスを生成すること", async () => {
      const { module } = await loadModule();
      const repo1 = createRepositoryMock();
      const repo2 = createRepositoryMock();

      const first = module.getMemberLogSettingsService(repo1 as never);
      const second = module.getMemberLogSettingsService(repo2 as never);

      expect(first).not.toBe(second);
    });

    it("repository が指定されない場合は getGuildSettingsRepository をデフォルトとして使用すること", async () => {
      const { module, getMemberLogSettingsRepositoryMock } = await loadModule();
      const repository = createRepositoryMock();
      getMemberLogSettingsRepositoryMock.mockReturnValue(repository);

      const service = module.getMemberLogSettingsService();
      repository.getMemberLogSettings.mockResolvedValueOnce(null);
      await service.getMemberLogSettings("guild-1");

      expect(repository.getMemberLogSettings).toHaveBeenCalledWith("guild-1");
      expect(getMemberLogSettingsRepositoryMock).toHaveBeenCalled();
    });
  });
});
