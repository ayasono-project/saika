// tests/unit/bot/handlers/guildDeleteHandler.test.ts
// guildDelete ハンドラのテスト

const mockDeleteAllConfigs = vi.fn();
const mockFindAllClosedByGuild = vi.fn();

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
    sub?: string,
  ) => {
    const p = `${prefixKey}`;
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return sub ? `[${p}:${sub}] ${m}` : `[${p}] ${m}`;
  },
  tDefault: vi.fn((key: string) => key),
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: {
    hasJob: vi.fn(),
    removeJob: vi.fn(),
  },
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildConfigService: () => ({
    deleteAllConfig: mockDeleteAllConfigs,
  }),
  getBotTicketRepository: () => ({
    findAllClosedByGuild: mockFindAllClosedByGuild,
  }),
}));

import { handleGuildDelete } from "@/bot/handlers/guildDeleteHandler";
import { jobScheduler } from "@/shared/scheduler/jobScheduler";
import { logger } from "@/shared/utils/logger";

// Bot退出時の全設定クリーンアップ動作を検証する
describe("bot/handlers/guildDeleteHandler", () => {
  // 各テストでモックをリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindAllClosedByGuild.mockResolvedValue([]);
    mockDeleteAllConfigs.mockResolvedValue(undefined);
  });

  it("ギルドの全設定データを削除してログ出力すること", async () => {
    const guild = { id: "guild-1", name: "Test Guild" };

    await handleGuildDelete(guild as never);

    expect(mockDeleteAllConfigs).toHaveBeenCalledWith("guild-1");
    expect(logger.info).toHaveBeenCalledTimes(2);
  });

  it("クローズ済みチケットの自動削除タイマーをキャンセルすること", async () => {
    mockFindAllClosedByGuild.mockResolvedValue([
      { id: "ticket-1" },
      { id: "ticket-2" },
    ]);
    vi.mocked(jobScheduler.hasJob)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const guild = { id: "guild-1", name: "Test Guild" };
    await handleGuildDelete(guild as never);

    expect(jobScheduler.removeJob).toHaveBeenCalledWith(
      "ticket-auto-delete-ticket-1",
    );
    expect(jobScheduler.removeJob).toHaveBeenCalledTimes(1);
  });

  it("deleteAllConfigs がエラーを投げた場合はエラーログを出力すること", async () => {
    mockDeleteAllConfigs.mockRejectedValue(new Error("db error"));

    const guild = { id: "guild-1", name: "Test Guild" };
    await handleGuildDelete(guild as never);

    expect(logger.error).toHaveBeenCalled();
  });

  it("findAllClosedByGuild がエラーを投げた場合でも deleteAllConfigs は実行されること", async () => {
    mockFindAllClosedByGuild.mockRejectedValue(new Error("fetch error"));

    const guild = { id: "guild-1", name: "Test Guild" };
    await handleGuildDelete(guild as never);

    expect(mockDeleteAllConfigs).toHaveBeenCalledWith("guild-1");
  });
});
