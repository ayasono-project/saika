// チケットのチャンネル削除検知ハンドラのテスト（チケットチャンネル・パネル設置チャンネル）

const mockConfigService = {
  findAllByGuild: vi.fn(),
  delete: vi.fn(),
};
const mockTicketRepository = {
  findByChannelId: vi.fn(),
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
  getBotTicketSettingsService: () => mockConfigService,
  getBotTicketRepository: () => mockTicketRepository,
}));
vi.mock("@/features/ticket/services/ticketAutoDeleteService", () => ({
  cancelTicketAutoDelete: vi.fn(),
}));

import { handleTicketChannelDelete } from "@/features/ticket/handlers/ticketChannelDeleteHandler";
import { cancelTicketAutoDelete } from "@/features/ticket/services/ticketAutoDeleteService";
import { logger } from "@/shared/utils/logger";

// チケットチャンネル・パネル設置チャンネル削除時の後始末を検証する
describe("bot/features/ticket/handlers/ticketChannelDeleteHandler", () => {
  // 各テストでモックをリセットし、既定ではチケットチャンネルではない状態にする
  beforeEach(() => {
    vi.clearAllMocks();
    mockTicketRepository.findByChannelId.mockResolvedValue(null);
    mockTicketRepository.delete.mockResolvedValue(undefined);
    mockConfigService.findAllByGuild.mockResolvedValue([]);
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

  // ── チケットチャンネルの削除 ──

  it("チケットのチャンネルが消されたら、そのチケットの記録と自動削除タイマーを消す", async () => {
    mockTicketRepository.findByChannelId.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      channelId: "ticket-ch-1",
    });

    const channel = { id: "ticket-ch-1", guildId: "guild-1" };
    await handleTicketChannelDelete(channel as never);

    expect(mockTicketRepository.findByChannelId).toHaveBeenCalledWith(
      "ticket-ch-1",
    );
    expect(cancelTicketAutoDelete).toHaveBeenCalledWith("ticket-1", "guild-1");
    expect(mockTicketRepository.delete).toHaveBeenCalledWith("ticket-1");
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("ticket:log.ticket_channel_deleted"),
    );
  });

  it("チケットのチャンネルでなければ、チケットの記録には触れない", async () => {
    const channel = { id: "other-ch", guildId: "guild-1" };
    await handleTicketChannelDelete(channel as never);

    expect(mockTicketRepository.delete).not.toHaveBeenCalled();
    expect(cancelTicketAutoDelete).not.toHaveBeenCalled();
  });

  it("チケットの記録の削除に失敗してもエラーログだけ出し、パネルの後始末は続ける", async () => {
    mockTicketRepository.findByChannelId.mockResolvedValue({
      id: "ticket-1",
      guildId: "guild-1",
      channelId: "ticket-ch-1",
    });
    mockTicketRepository.delete.mockRejectedValue(new Error("db error"));

    const channel = { id: "ticket-ch-1", guildId: "guild-1" };
    await handleTicketChannelDelete(channel as never);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining("ticket:log.ticket_channel_cleanup_failed"),
      expect.any(Error),
    );
    expect(mockConfigService.findAllByGuild).toHaveBeenCalledWith("guild-1");
  });
});
