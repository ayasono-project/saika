// tests/unit/bot/features/ticket/handlers/ticketChannelDeleteHandler.test.ts
// パネル設置チャンネル削除検知ハンドラのテスト

const mockConfigService = {
  findAllByGuild: vi.fn(),
  delete: vi.fn(),
};

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
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: () => mockConfigService,
}));

import { handleTicketChannelDelete } from "@/bot/features/ticket/handlers/ticketChannelDeleteHandler";
import { logger } from "@/shared/utils/logger";

// パネル設置チャンネル削除時の設定クリーンアップ動作を検証する
describe("bot/features/ticket/handlers/ticketChannelDeleteHandler", () => {
  // 各テストでモックをリセットしてテスト間の干渉を防ぐ
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guildId がないチャンネルの場合は何もしない", async () => {
    const channel = { id: "ch-1" };
    await handleTicketChannelDelete(channel as never);
    expect(mockConfigService.findAllByGuild).not.toHaveBeenCalled();
  });

  it("panelChannelId と一致しない場合は削除しない", async () => {
    mockConfigService.findAllByGuild.mockResolvedValue([
      {
        guildId: "guild-1",
        categoryId: "cat-1",
        panelChannelId: "other-ch",
      },
    ]);

    const channel = { id: "ch-1", guildId: "guild-1" };
    await handleTicketChannelDelete(channel as never);

    expect(mockConfigService.delete).not.toHaveBeenCalled();
  });

  it("panelChannelId と一致した場合に設定を削除しログ出力する", async () => {
    mockConfigService.findAllByGuild.mockResolvedValue([
      {
        guildId: "guild-1",
        categoryId: "cat-1",
        panelChannelId: "panel-ch-1",
      },
    ]);
    mockConfigService.delete.mockResolvedValue(undefined);

    const channel = { id: "panel-ch-1", guildId: "guild-1" };
    await handleTicketChannelDelete(channel as never);

    expect(mockConfigService.delete).toHaveBeenCalledWith("guild-1", "cat-1");
    expect(logger.info).toHaveBeenCalled();
  });

  it("同一チャンネルに複数設定がある場合はすべて削除する", async () => {
    mockConfigService.findAllByGuild.mockResolvedValue([
      {
        guildId: "guild-1",
        categoryId: "cat-1",
        panelChannelId: "panel-ch-1",
      },
      {
        guildId: "guild-1",
        categoryId: "cat-2",
        panelChannelId: "panel-ch-1",
      },
    ]);
    mockConfigService.delete.mockResolvedValue(undefined);

    const channel = { id: "panel-ch-1", guildId: "guild-1" };
    await handleTicketChannelDelete(channel as never);

    expect(mockConfigService.delete).toHaveBeenCalledTimes(2);
    expect(mockConfigService.delete).toHaveBeenCalledWith("guild-1", "cat-1");
    expect(mockConfigService.delete).toHaveBeenCalledWith("guild-1", "cat-2");
  });

  it("findAllByGuild がエラーを投げた場合はエラーログを出力する", async () => {
    mockConfigService.findAllByGuild.mockRejectedValue(new Error("db error"));

    const channel = { id: "ch-1", guildId: "guild-1" };
    await handleTicketChannelDelete(channel as never);

    expect(logger.error).toHaveBeenCalled();
  });

  it("設定が空配列の場合は何もしない", async () => {
    mockConfigService.findAllByGuild.mockResolvedValue([]);

    const channel = { id: "ch-1", guildId: "guild-1" };
    await handleTicketChannelDelete(channel as never);

    expect(mockConfigService.delete).not.toHaveBeenCalled();
  });
});
