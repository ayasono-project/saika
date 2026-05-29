// tests/unit/shared/features/bump-reminder/bumpReminderSettingsService.test.ts
// BumpReminderSettingsService のデータ取得・保存・シングルトン管理・トップレベル関数委譲の動作を検証
describe("shared/features/bump-reminder/bumpReminderSettingsService", () => {
  const CLEAR = "CLEAR";
  const ROLE = "ROLE";
  const ADD = "ADD";
  const REMOVE = "REMOVE";
  const USERS_CLEAR = "USERS_CLEAR";

  const createRepositoryMock = () => ({
    getBumpReminderSettings: vi.fn(),
    updateBumpReminderSettings: vi.fn(),
    setBumpReminderEnabled: vi.fn(),
    setBumpReminderMentionRole: vi.fn(),
    addBumpReminderMentionUser: vi.fn(),
    removeBumpReminderMentionUser: vi.fn(),
    clearBumpReminderMentionUsers: vi.fn(),
    clearBumpReminderMentions: vi.fn(),
  });

  // vi.resetModules() で ESM キャッシュを破棄し、各テストで独立したモジュールスコープ・定数マッピングを使用するためのヘルパー
  const loadModule = async () => {
    vi.resetModules();
    vi.clearAllMocks();

    const getBumpReminderSettingsRepositoryMock = vi.fn();
    vi.doMock("@/shared/database/types", () => ({
      BUMP_REMINDER_MENTION_CLEAR_RESULT: CLEAR,
      BUMP_REMINDER_MENTION_ROLE_RESULT: ROLE,
      BUMP_REMINDER_MENTION_USER_ADD_RESULT: ADD,
      BUMP_REMINDER_MENTION_USER_REMOVE_RESULT: REMOVE,
      BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT: USERS_CLEAR,
    }));
    vi.doMock(
      "@/shared/database/repositories/bumpReminderSettingsRepository",
      () => ({
        getBumpReminderSettingsRepository:
          getBumpReminderSettingsRepositoryMock,
      }),
    );

    const module = await import(
      "@/shared/features/bump-reminder/bumpReminderSettingsService"
    );

    return {
      module,
      getBumpReminderSettingsRepositoryMock,
    };
  };

  it("リマインダー結果定数を再エクスポートすること", async () => {
    const { module } = await loadModule();

    expect(module.BUMP_REMINDER_MENTION_CLEAR_RESULT).toBe(CLEAR);
    expect(module.BUMP_REMINDER_MENTION_ROLE_RESULT).toBe(ROLE);
    expect(module.BUMP_REMINDER_MENTION_USER_ADD_RESULT).toBe(ADD);
    expect(module.BUMP_REMINDER_MENTION_USER_REMOVE_RESULT).toBe(REMOVE);
    expect(module.BUMP_REMINDER_MENTION_USERS_CLEAR_RESULT).toBe(USERS_CLEAR);
  });

  it("repository に設定がない場合は null を返し、ある場合は正規化コピーを返すこと", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.BumpReminderSettingsService(repository as never);

    repository.getBumpReminderSettings.mockResolvedValueOnce(null);
    await expect(
      service.getBumpReminderSettings("guild-1"),
    ).resolves.toBeNull();

    const rawConfig = {
      enabled: true,
      channelId: "channel-1",
      mentionRoleId: "role-1",
      mentionUserIds: ["user-1"],
    };
    repository.getBumpReminderSettings.mockResolvedValueOnce(rawConfig);
    const config = await service.getBumpReminderSettings("guild-1");

    expect(config).toEqual(rawConfig);
    expect(config).not.toBe(rawConfig);
    expect(config?.mentionUserIds).not.toBe(rawConfig.mentionUserIds);
  });

  it("設定が未登録の場合はデフォルト値を返し、配列は呼び出しごとに別インスタンスになること", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.BumpReminderSettingsService(repository as never);
    repository.getBumpReminderSettings.mockResolvedValue(null);

    const first = await service.getBumpReminderSettingsOrDefault("guild-1");
    const second = await service.getBumpReminderSettingsOrDefault("guild-1");

    expect(first).toEqual(module.DEFAULT_BUMP_REMINDER_SETTINGS);
    expect(first.mentionUserIds).toEqual([]);
    expect(first.mentionUserIds).not.toBe(second.mentionUserIds);
  });

  it("設定が存在する場合は getBumpReminderSettingsOrDefault がその値を返すこと", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.BumpReminderSettingsService(repository as never);

    const existing = {
      enabled: true,
      channelId: "channel-x",
      mentionRoleId: "role-x",
      mentionUserIds: ["user-x"],
    };
    repository.getBumpReminderSettings.mockResolvedValueOnce(existing);

    await expect(
      service.getBumpReminderSettingsOrDefault("guild-1"),
    ).resolves.toEqual(existing);
  });

  it("保存時に正規化済みコピーが渡され、repository の各操作に委譲されること", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = new module.BumpReminderSettingsService(repository as never);

    const input = {
      enabled: true,
      channelId: "channel-1",
      mentionRoleId: "role-1",
      mentionUserIds: ["user-1"],
    };

    await service.saveBumpReminderSettings("guild-1", input);

    expect(repository.updateBumpReminderSettings).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({
        enabled: true,
        channelId: "channel-1",
        mentionRoleId: "role-1",
        mentionUserIds: ["user-1"],
      }),
    );

    const savedConfig = repository.updateBumpReminderSettings.mock
      .calls[0][1] as {
      mentionUserIds: string[];
    };
    expect(savedConfig).not.toBe(input);
    expect(savedConfig.mentionUserIds).not.toBe(input.mentionUserIds);

    repository.setBumpReminderEnabled.mockResolvedValue(undefined);
    await service.setBumpReminderEnabled("guild-1", true, "channel-2");
    expect(repository.setBumpReminderEnabled).toHaveBeenCalledWith(
      "guild-1",
      true,
      "channel-2",
    );

    repository.setBumpReminderMentionRole.mockResolvedValue(ROLE);
    await expect(
      service.setBumpReminderMentionRole("guild-1", "role-2"),
    ).resolves.toBe(ROLE);

    repository.addBumpReminderMentionUser.mockResolvedValue(ADD);
    await expect(
      service.addBumpReminderMentionUser("guild-1", "user-2"),
    ).resolves.toBe(ADD);

    repository.removeBumpReminderMentionUser.mockResolvedValue(REMOVE);
    await expect(
      service.removeBumpReminderMentionUser("guild-1", "user-2"),
    ).resolves.toBe(REMOVE);

    repository.clearBumpReminderMentionUsers.mockResolvedValue(USERS_CLEAR);
    await expect(
      service.clearBumpReminderMentionUsers("guild-1"),
    ).resolves.toBe(USERS_CLEAR);

    repository.clearBumpReminderMentions.mockResolvedValue(CLEAR);
    await expect(service.clearBumpReminderMentions("guild-1")).resolves.toBe(
      CLEAR,
    );
  });

  it("同一 repository ではシングルトンを返し、異なる repository では新しいインスタンスを生成すること", async () => {
    const { module } = await loadModule();
    const repositoryA = createRepositoryMock();
    const repositoryB = createRepositoryMock();

    const serviceA1 = module.getBumpReminderSettingsService(
      repositoryA as never,
    );
    const serviceA2 = module.getBumpReminderSettingsService(
      repositoryA as never,
    );
    const serviceB = module.getBumpReminderSettingsService(
      repositoryB as never,
    );

    expect(serviceA1).toBe(serviceA2);
    expect(serviceA1).not.toBe(serviceB);
  });

  it("サービスインスタンスの各 API が repository へ委譲すること", async () => {
    const { module } = await loadModule();
    const repository = createRepositoryMock();
    const service = module.getBumpReminderSettingsService(repository as never);

    repository.getBumpReminderSettings.mockResolvedValue({
      enabled: true,
      channelId: "channel-1",
      mentionRoleId: "role-1",
      mentionUserIds: ["user-1"],
    });
    await service.getBumpReminderSettings("guild-1");
    expect(repository.getBumpReminderSettings).toHaveBeenCalledWith("guild-1");

    repository.getBumpReminderSettings.mockResolvedValueOnce(null);
    await service.getBumpReminderSettingsOrDefault("guild-1");

    await service.saveBumpReminderSettings("guild-1", {
      enabled: false,
      mentionUserIds: ["u"],
    });
    expect(repository.updateBumpReminderSettings).toHaveBeenCalledWith(
      "guild-1",
      expect.objectContaining({ enabled: false, mentionUserIds: ["u"] }),
    );

    await service.setBumpReminderEnabled("guild-1", true, "channel-3");
    expect(repository.setBumpReminderEnabled).toHaveBeenCalledWith(
      "guild-1",
      true,
      "channel-3",
    );

    repository.setBumpReminderMentionRole.mockResolvedValue(ROLE);
    await expect(
      service.setBumpReminderMentionRole("guild-1", "role-2"),
    ).resolves.toBe(ROLE);

    repository.addBumpReminderMentionUser.mockResolvedValue(ADD);
    await expect(
      service.addBumpReminderMentionUser("guild-1", "user-2"),
    ).resolves.toBe(ADD);

    repository.removeBumpReminderMentionUser.mockResolvedValue(REMOVE);
    await expect(
      service.removeBumpReminderMentionUser("guild-1", "user-2"),
    ).resolves.toBe(REMOVE);

    repository.clearBumpReminderMentionUsers.mockResolvedValue(USERS_CLEAR);
    await expect(
      service.clearBumpReminderMentionUsers("guild-1"),
    ).resolves.toBe(USERS_CLEAR);

    repository.clearBumpReminderMentions.mockResolvedValue(CLEAR);
    await expect(service.clearBumpReminderMentions("guild-1")).resolves.toBe(
      CLEAR,
    );
  });
});
