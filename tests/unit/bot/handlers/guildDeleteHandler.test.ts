// guildDelete ハンドラのテスト

const mockDeleteAllConfigs = vi.fn();
const mockFindAllClosedByGuild = vi.fn();
const mockCancelAllForGuild = vi.fn();
const mockApplyBotPresence = vi.fn();

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
vi.mock("@/bot/services/botPresence", () => ({
  applyBotPresence: (...args: unknown[]) => mockApplyBotPresence(...args),
}));
// deleteAllSettings は「呼ばれないこと」を検証するために用意する
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotGuildSettingsService: () => ({
    deleteAllSettings: mockDeleteAllConfigs,
  }),
  getBotTicketRepository: () => ({
    findAllClosedByGuild: mockFindAllClosedByGuild,
  }),
  getBotBumpReminderManager: () => ({
    cancelAllForGuild: mockCancelAllForGuild,
  }),
}));

import { handleGuildDelete } from "@/bot/handlers/guildDeleteHandler";
import { jobScheduler } from "@/shared/scheduler/jobScheduler";
import { logger } from "@/shared/utils/logger";

// Bot退出時にジョブだけを停止し、設定データを保持する動作を検証する
describe("bot/handlers/guildDeleteHandler", () => {
  // 各テストでモックをリセットする
  beforeEach(() => {
    vi.clearAllMocks();
    mockFindAllClosedByGuild.mockResolvedValue([]);
    mockDeleteAllConfigs.mockResolvedValue(undefined);
    mockCancelAllForGuild.mockResolvedValue(0);
  });

  it("設定データを削除しないこと（Bot を外しただけで設定が消えるのを防ぐ回帰ガード）", async () => {
    const guild = { id: "guild-1", name: "Test Guild" };

    await handleGuildDelete(guild as never);

    expect(mockDeleteAllConfigs).not.toHaveBeenCalled();
  });

  it("ジョブ停止の開始と完了をログ出力すること", async () => {
    const guild = { id: "guild-1", name: "Test Guild" };

    await handleGuildDelete(guild as never);

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

  it("Bump リマインダーのインメモリタイマーを解除すること", async () => {
    const guild = { id: "guild-1", name: "Test Guild" };

    await handleGuildDelete(guild as never);

    expect(mockCancelAllForGuild).toHaveBeenCalledWith("guild-1");
  });

  it("ジョブ停止がエラーを投げた場合はエラーログを出力すること", async () => {
    mockCancelAllForGuild.mockRejectedValue(new Error("scheduler error"));

    const guild = { id: "guild-1", name: "Test Guild" };
    await handleGuildDelete(guild as never);

    expect(logger.error).toHaveBeenCalled();
  });

  it("findAllClosedByGuild がエラーを投げても Bump の解除は実行されること", async () => {
    mockFindAllClosedByGuild.mockRejectedValue(new Error("fetch error"));

    const guild = { id: "guild-1", name: "Test Guild" };
    await handleGuildDelete(guild as never);

    expect(mockCancelAllForGuild).toHaveBeenCalledWith("guild-1");
  });

  it("プレゼンスを更新すること", async () => {
    const client = {};
    const guild = { id: "guild-1", name: "Test Guild", client };

    await handleGuildDelete(guild as never);

    expect(mockApplyBotPresence).toHaveBeenCalledWith(client);
  });

  it("ジョブ停止が失敗してもプレゼンスは更新されること", async () => {
    mockCancelAllForGuild.mockRejectedValue(new Error("scheduler error"));
    const client = {};
    const guild = { id: "guild-1", name: "Test Guild", client };

    await handleGuildDelete(guild as never);

    expect(mockApplyBotPresence).toHaveBeenCalledWith(client);
  });
});
