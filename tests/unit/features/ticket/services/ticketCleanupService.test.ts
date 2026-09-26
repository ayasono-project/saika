// チケット設定の一括クリーンアップ（撤去）のテスト

vi.mock("@/features/ticket/services/ticketService", () => ({
  deleteTicket: vi.fn(),
}));

vi.mock("@/features/ticket/services/ticketAutoDeleteService", () => ({
  cancelTicketAutoDelete: vi.fn(),
}));

vi.mock("@/features/ticket/services/ticketChannelAccess", () => ({
  getTicketChannelAccess: vi.fn(),
}));

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (
    prefixKey: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) =>
    params
      ? `[${prefixKey}] ${messageKey}:${JSON.stringify(params)}`
      : `[${prefixKey}] ${messageKey}`,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { TICKET_CHANNEL_BOT_DELETE_PERMISSIONS } from "@/features/ticket/commands/ticketCommand.constants";
import { cancelTicketAutoDelete } from "@/features/ticket/services/ticketAutoDeleteService";
import { getTicketChannelAccess } from "@/features/ticket/services/ticketChannelAccess";
import { cleanupTicketSettings } from "@/features/ticket/services/ticketCleanupService";
import { deleteTicket } from "@/features/ticket/services/ticketService";
import { logger } from "@/shared/utils/logger";

/** 撤去するカテゴリの設定 */
const CONFIG = {
  guildId: "guild-1",
  categoryId: "cat-1",
  panelChannelId: "panel-ch",
  panelMessageId: "panel-msg",
};

/** オープン中のチケット（入れ直した後に作った、Bot が扱えるもの） */
const OPEN_TICKET = { id: "t-open", categoryId: "cat-1", channelId: "ch-open" };

/** クローズ済みのチケット（入れ直す前に作った、Bot が扱えないもの） */
const OLD_TICKET = { id: "t-old", categoryId: "cat-1", channelId: "ch-old" };

/**
 * 撤去に使うギルド・リポジトリ・設定サービスのモックを作る
 * @returns 各モック
 */
function createDeps() {
  return {
    guild: {
      id: "guild-1",
      channels: { fetch: vi.fn().mockResolvedValue(null) },
    },
    ticketRepository: {
      findAllClosedByGuild: vi.fn().mockResolvedValue([OLD_TICKET]),
      findOpenByCategory: vi.fn().mockResolvedValue([OPEN_TICKET]),
      deleteByCategory: vi.fn().mockResolvedValue(2),
    },
    settingsService: { delete: vi.fn().mockResolvedValue(undefined) },
  };
}

// Bot が扱えないチケットのチャンネルがあっても、撤去全体を止めないことを検証
describe("features/ticket/services/ticketCleanupService", () => {
  // 各テストでモックの呼び出し記録を初期化する
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["Bot が扱えない", "channel_permissions"],
    ["「チャンネルの管理」が無い", "manage_channels"],
  ] as const)(
    "%sチャンネルのチケットは削除を飛ばして warn を残し、残りのチケットと設定・記録の削除は続ける",
    async (_label, reason) => {
      vi.mocked(getTicketChannelAccess).mockImplementation(
        async (_guild, channelId) =>
          channelId === "ch-old"
            ? { status: "inaccessible", reason }
            : { status: "handleable", channel: {} as never },
      );
      const { guild, ticketRepository, settingsService } = createDeps();

      await cleanupTicketSettings(
        guild as never,
        [CONFIG] as never,
        settingsService as never,
        ticketRepository as never,
      );

      expect(deleteTicket).toHaveBeenCalledTimes(1);
      expect(deleteTicket).toHaveBeenCalledWith(
        OPEN_TICKET,
        guild,
        ticketRepository,
      );
      expect(cancelTicketAutoDelete).toHaveBeenCalledWith("t-old", "guild-1");
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'ticket:log.teardown_channel_inaccessible:{"guildId":"guild-1","channelId":"ch-old"}',
        ),
      );
      expect(ticketRepository.deleteByCategory).toHaveBeenCalledWith(
        "guild-1",
        "cat-1",
      );
      expect(settingsService.delete).toHaveBeenCalledWith("guild-1", "cat-1");
    },
  );

  it("消せるか（「チャンネルの管理」を含む削除の権限）を確かめてから削除する", async () => {
    vi.mocked(getTicketChannelAccess).mockResolvedValue({
      status: "handleable",
      channel: {} as never,
    });
    const { guild, ticketRepository, settingsService } = createDeps();

    await cleanupTicketSettings(
      guild as never,
      [CONFIG] as never,
      settingsService as never,
      ticketRepository as never,
    );

    expect(getTicketChannelAccess).toHaveBeenCalledWith(
      guild,
      "ch-open",
      TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
    );
    expect(getTicketChannelAccess).toHaveBeenCalledWith(
      guild,
      "ch-old",
      TICKET_CHANNEL_BOT_DELETE_PERMISSIONS,
    );
    expect(deleteTicket).toHaveBeenCalledTimes(2);
  });
});
