// tests/unit/bot/features/bump-reminder/services/bumpReminderSettingsServiceResolver.test.ts
import type { Mock } from "vitest";

const createBumpReminderSettingsServiceMock: Mock = vi.fn();
const getBumpReminderSettingsServiceMock: Mock = vi.fn();

vi.mock("@/features/bump-reminder/bumpReminderSettingsService", () => ({
  createBumpReminderSettingsService: (...args: unknown[]) =>
    createBumpReminderSettingsServiceMock(...args),
  getBumpReminderSettingsService: (...args: unknown[]) =>
    getBumpReminderSettingsServiceMock(...args),
}));

describe("bot/features/bump-reminder/services/bumpReminderSettingsServiceResolver", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("注入されたリポジトリから feature config サービスを生成する", async () => {
    const service = { getBumpReminderSettings: vi.fn() };
    createBumpReminderSettingsServiceMock.mockReturnValue(service);

    const { createBumpReminderFeatureSettingsService } = await import(
      "@/features/bump-reminder/services/bumpReminderSettingsServiceResolver"
    );

    const repository = { getBumpReminderSettingsByGuildId: vi.fn() };
    const resolved = createBumpReminderFeatureSettingsService(
      repository as never,
    );

    expect(resolved).toBe(service);
    expect(createBumpReminderSettingsServiceMock).toHaveBeenCalledWith(
      repository,
    );
  });

  it("リポジトリ未指定の場合は共有シングルトンを返す", async () => {
    const shared = { getBumpReminderSettings: vi.fn() };
    getBumpReminderSettingsServiceMock.mockReturnValue(shared);

    const { getBumpReminderFeatureSettingsService } = await import(
      "@/features/bump-reminder/services/bumpReminderSettingsServiceResolver"
    );

    const resolved = getBumpReminderFeatureSettingsService();

    expect(resolved).toBe(shared);
    expect(getBumpReminderSettingsServiceMock).toHaveBeenCalledTimes(1);
  });

  it("リポジトリインスタンスごとにサービスをキャッシュする", async () => {
    const serviceA = { id: "service-a" };
    const serviceB = { id: "service-b" };
    createBumpReminderSettingsServiceMock
      .mockReturnValueOnce(serviceA)
      .mockReturnValueOnce(serviceB);

    const { getBumpReminderFeatureSettingsService } = await import(
      "@/features/bump-reminder/services/bumpReminderSettingsServiceResolver"
    );

    const repoA = { id: "repo-a" };
    const repoB = { id: "repo-b" };

    const a1 = getBumpReminderFeatureSettingsService(repoA as never);
    const a2 = getBumpReminderFeatureSettingsService(repoA as never);
    const b1 = getBumpReminderFeatureSettingsService(repoB as never);

    expect(a1).toBe(serviceA);
    expect(a2).toBe(serviceA);
    expect(b1).toBe(serviceB);
    expect(createBumpReminderSettingsServiceMock).toHaveBeenCalledTimes(2);
  });
});
