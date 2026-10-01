import { DEFAULT_AFK_SETTINGS } from "@/features/afk/afkSettingsDefaults";
import { AfkSettingsService } from "@/features/afk/afkSettingsService";

// AfkSettingsService クラスのメソッド動作を検証するグループ
describe("shared/features/afk/afkSettingsService", () => {
  const createRepositoryMock = () => ({
    getAfkSettings: vi.fn(),
    setAfkChannel: vi.fn(),
    updateAfkSettings: vi.fn(),
  });

  it("リポジトリが null を返す場合は null、値がある場合は正規化コピーを返すこと", async () => {
    const repository = createRepositoryMock();
    const service = new AfkSettingsService(repository as never);

    repository.getAfkSettings.mockResolvedValueOnce(null);
    await expect(service.getAfkSettings("guild-1")).resolves.toBeNull();

    const rawConfig = { enabled: true, channelId: "channel-1" };
    repository.getAfkSettings.mockResolvedValueOnce(rawConfig);
    const config = await service.getAfkSettings("guild-1");

    expect(config).toEqual(rawConfig);
    expect(config).not.toBe(rawConfig);
  });

  it("設定が未登録の場合はデフォルト値を返し、呼び出しごとに別インスタンスになること", async () => {
    const repository = createRepositoryMock();
    const service = new AfkSettingsService(repository as never);
    repository.getAfkSettings.mockResolvedValue(null);

    const first = await service.getAfkSettingsOrDefault("guild-1");
    const second = await service.getAfkSettingsOrDefault("guild-1");

    expect(first).toEqual(DEFAULT_AFK_SETTINGS);
    expect(first).not.toBe(second);
  });

  it("設定が存在する場合は getAfkSettingsOrDefault がその値を返すこと", async () => {
    const repository = createRepositoryMock();
    const service = new AfkSettingsService(repository as never);

    const existing = { enabled: true, channelId: "channel-x" };
    repository.getAfkSettings.mockResolvedValueOnce(existing);

    await expect(service.getAfkSettingsOrDefault("guild-1")).resolves.toEqual(
      existing,
    );
  });

  it("保存時に正規化済みコピーが渡され、repository の各操作に委譲されること", async () => {
    const repository = createRepositoryMock();
    const service = new AfkSettingsService(repository as never);

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
});
