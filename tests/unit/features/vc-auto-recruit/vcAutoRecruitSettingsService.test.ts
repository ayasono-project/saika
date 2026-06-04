// tests/unit/features/vc-auto-recruit/vcAutoRecruitSettingsService.test.ts
// VcAutoRecruitSettingsService のデータ取得・保存・追跡管理・シングルトンを検証

describe("features/vc-auto-recruit/vcAutoRecruitSettingsService", () => {
  /** テスト用 repository モックを生成する */
  const createRepositoryMock = () => ({
    getVcAutoRecruitSettings: vi.fn(),
    updateVcAutoRecruitSettings: vi.fn(),
  });

  // vi.resetModules() で ESM キャッシュを破棄し、各テストで独立スコープを使う
  const loadModule = async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const getVcAutoRecruitSettingsRepositoryMock = vi.fn();
    vi.doMock(
      "@/features/vc-auto-recruit/vcAutoRecruitSettingsRepository",
      () => ({
        getVcAutoRecruitSettingsRepository:
          getVcAutoRecruitSettingsRepositoryMock,
      }),
    );

    const module = await import(
      "@/features/vc-auto-recruit/vcAutoRecruitSettingsService"
    );
    return { module, getVcAutoRecruitSettingsRepositoryMock };
  };

  const baseConfig = () => ({
    enabled: true,
    channelId: "ch-1",
    embedEnabled: true,
    enabledCategoryIds: [],
    activeInvites: [],
  });

  describe("VcAutoRecruitSettingsService", () => {
    it("repository に設定がない場合は getVcAutoRecruitSettings が null を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce(null);

      expect(await service.getVcAutoRecruitSettings("g-1")).toBeNull();
    });

    it("getVcAutoRecruitSettingsOrDefault が未設定時にデフォルトを返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce(null);

      expect(await service.getVcAutoRecruitSettingsOrDefault("g-1")).toEqual({
        enabled: false,
        embedEnabled: true,
        enabledCategoryIds: [],
        activeInvites: [],
      });
    });

    it("setChannelId が現在設定へ channelId をマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce({
        enabled: false,
        embedEnabled: true,
        enabledCategoryIds: [],
        activeInvites: [],
      });

      await service.setChannelId("g-1", "ch-new");

      expect(repository.updateVcAutoRecruitSettings).toHaveBeenCalledWith(
        "g-1",
        {
          enabled: false,
          embedEnabled: true,
          enabledCategoryIds: [],
          activeInvites: [],
          channelId: "ch-new",
        },
      );
    });

    it("setEmbedEnabled が embedEnabled をマージして保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce(baseConfig());

      await service.setEmbedEnabled("g-1", false);

      expect(repository.updateVcAutoRecruitSettings).toHaveBeenCalledWith(
        "g-1",
        expect.objectContaining({ embedEnabled: false }),
      );
    });

    it("clearMessage が message を undefined にして他を保持すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce({
        ...baseConfig(),
        message: "hi",
      });

      await service.clearMessage("g-1");

      expect(repository.updateVcAutoRecruitSettings).toHaveBeenCalledWith(
        "g-1",
        expect.objectContaining({ message: undefined, channelId: "ch-1" }),
      );
    });

    it("disableAndClearChannel が channelId 解除・無効化すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce(baseConfig());

      await service.disableAndClearChannel("g-1");

      expect(repository.updateVcAutoRecruitSettings).toHaveBeenCalledWith(
        "g-1",
        expect.objectContaining({ enabled: false, channelId: undefined }),
      );
    });

    it("resetToDefault がデフォルト状態で上書きすること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );

      await service.resetToDefault("g-1");

      expect(repository.updateVcAutoRecruitSettings).toHaveBeenCalledWith(
        "g-1",
        {
          enabled: false,
          embedEnabled: true,
          enabledCategoryIds: [],
          activeInvites: [],
        },
      );
    });

    it("addActiveInvite が同一 VC の旧参照を置き換えて追加すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce({
        ...baseConfig(),
        activeInvites: [
          {
            voiceChannelId: "vc-1",
            postChannelId: "ch-1",
            messageId: "old",
            createdAt: 1,
          },
        ],
      });
      const ref = {
        voiceChannelId: "vc-1",
        postChannelId: "ch-1",
        messageId: "new",
        createdAt: 2,
      };

      await service.addActiveInvite("g-1", ref);

      expect(repository.updateVcAutoRecruitSettings).toHaveBeenCalledWith(
        "g-1",
        expect.objectContaining({ activeInvites: [ref] }),
      );
    });

    it("getActiveInvite が対象 VC の参照を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      const ref = {
        voiceChannelId: "vc-1",
        postChannelId: "ch-1",
        messageId: "m-1",
        createdAt: 1,
      };
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce({
        ...baseConfig(),
        activeInvites: [ref],
      });

      expect(await service.getActiveInvite("g-1", "vc-1")).toEqual(ref);
    });

    it("removeActiveInvite が対象 VC の参照を除去して保存すること", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValue({
        ...baseConfig(),
        activeInvites: [
          {
            voiceChannelId: "vc-1",
            postChannelId: "ch-1",
            messageId: "m-1",
            createdAt: 1,
          },
        ],
      });

      await service.removeActiveInvite("g-1", "vc-1");

      expect(repository.updateVcAutoRecruitSettings).toHaveBeenCalledWith(
        "g-1",
        expect.objectContaining({ activeInvites: [] }),
      );
    });

    it("removeActiveInvite は対象が無ければ保存しないこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValue(baseConfig());

      await service.removeActiveInvite("g-1", "vc-x");

      expect(repository.updateVcAutoRecruitSettings).not.toHaveBeenCalled();
    });

    it("addEnabledCategory が新規カテゴリを追加して true を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce(baseConfig());

      const result = await service.addEnabledCategory("g-1", "cat-1");

      expect(result).toBe(true);
      expect(repository.updateVcAutoRecruitSettings).toHaveBeenCalledWith(
        "g-1",
        expect.objectContaining({ enabledCategoryIds: ["cat-1"] }),
      );
    });

    it("addEnabledCategory は既に有効なら保存せず false を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce({
        ...baseConfig(),
        enabledCategoryIds: ["cat-1"],
      });

      const result = await service.addEnabledCategory("g-1", "cat-1");

      expect(result).toBe(false);
      expect(repository.updateVcAutoRecruitSettings).not.toHaveBeenCalled();
    });

    it("removeEnabledCategory が対象を除去して true を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce({
        ...baseConfig(),
        enabledCategoryIds: ["cat-1", "TOP"],
      });

      const result = await service.removeEnabledCategory("g-1", "cat-1");

      expect(result).toBe(true);
      expect(repository.updateVcAutoRecruitSettings).toHaveBeenCalledWith(
        "g-1",
        expect.objectContaining({ enabledCategoryIds: ["TOP"] }),
      );
    });

    it("removeEnabledCategory は未登録なら保存せず false を返すこと", async () => {
      const { module } = await loadModule();
      const repository = createRepositoryMock();
      const service = new module.VcAutoRecruitSettingsService(
        repository as never,
      );
      repository.getVcAutoRecruitSettings.mockResolvedValueOnce(baseConfig());

      const result = await service.removeEnabledCategory("g-1", "cat-x");

      expect(result).toBe(false);
      expect(repository.updateVcAutoRecruitSettings).not.toHaveBeenCalled();
    });
  });

  describe("getVcAutoRecruitSettingsService", () => {
    it("同じ repository では同一シングルトンを返すこと", async () => {
      const { module, getVcAutoRecruitSettingsRepositoryMock } =
        await loadModule();
      const repository = createRepositoryMock();
      getVcAutoRecruitSettingsRepositoryMock.mockReturnValue(repository);

      expect(module.getVcAutoRecruitSettingsService()).toBe(
        module.getVcAutoRecruitSettingsService(),
      );
    });
  });
});
