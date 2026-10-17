import type { Mock } from "vitest";

const createBumpReminderSettingsServiceMock: Mock = vi.fn();

vi.mock("@/features/bump-reminder/bumpReminderSettingsService", () => ({
  createBumpReminderSettingsService: (...args: unknown[]) =>
    createBumpReminderSettingsServiceMock(...args),
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
});
