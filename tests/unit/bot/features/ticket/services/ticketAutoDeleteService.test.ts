// tests/unit/bot/features/ticket/services/ticketAutoDeleteService.test.ts

vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: {
    addOneTimeJob: vi.fn(),
    removeJob: vi.fn(),
    hasJob: vi.fn(),
  },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(),
  getBotTicketRepository: vi.fn(),
}));

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
  logCommand: (
    commandName: string,
    messageKey: string,
    params?: Record<string, unknown>,
  ) => {
    const m = params ? `${messageKey}:${JSON.stringify(params)}` : messageKey;
    return `[${commandName}] ${m}`;
  },
  tDefault: vi.fn((key: string) => key),
  tInteraction: (_locale: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import {
  getBotTicketConfigService,
  getBotTicketRepository,
} from "@/bot/services/botCompositionRoot";
import { jobScheduler } from "@/shared/scheduler/jobScheduler";
import { logger } from "@/shared/utils/logger";

describe("bot/features/ticket/services/ticketAutoDeleteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("scheduleTicketAutoDelete", () => {
    it("jobScheduler.addOneTimeJob を正しい jobId と delayMs で呼び出す", async () => {
      const { scheduleTicketAutoDelete } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = { guilds: { fetch: vi.fn() } };

      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        60000,
        mockClient as never,
      );

      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-ticket-1",
        60000,
        expect.any(Function),
      );
    });
  });

  describe("cancelTicketAutoDelete", () => {
    it("ジョブが存在する場合は jobScheduler.removeJob を呼び出す", async () => {
      const { cancelTicketAutoDelete } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      vi.mocked(jobScheduler.hasJob).mockReturnValue(true);

      cancelTicketAutoDelete("ticket-1", "guild-1");

      expect(jobScheduler.removeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-ticket-1",
      );
    });

    it("ジョブが存在しない場合は何もしない", async () => {
      const { cancelTicketAutoDelete } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      vi.mocked(jobScheduler.hasJob).mockReturnValue(false);

      cancelTicketAutoDelete("ticket-2", "guild-1");

      expect(jobScheduler.removeJob).not.toHaveBeenCalled();
    });
  });

  describe("restoreAutoDeleteTimers", () => {
    it("クローズ済みチケットのタイマーを復元する", async () => {
      const { restoreAutoDeleteTimers } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: {
          cache: new Map([["guild-1", { id: "guild-1" }]]),
        },
      };

      const closedTicket = {
        id: "ticket-1",
        channelId: "channel-1",
        guildId: "guild-1",
        categoryId: "category-1",
        status: "closed",
        elapsedDeleteMs: 0,
        closedAt: new Date(Date.now() - 10000),
      };

      const mockTicketRepository = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([closedTicket]),
      };

      const mockConfigService = {
        findByGuildAndCategory: vi.fn().mockResolvedValue({
          autoDeleteDays: 7,
          staffRoleIds: "[]",
        }),
      };

      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigService as never,
      );

      await restoreAutoDeleteTimers(
        mockClient as never,
        mockTicketRepository as never,
      );

      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-ticket-1",
        expect.any(Number),
        expect.any(Function),
      );
    });

    it("ギルドが空の場合も正常に処理する", async () => {
      const { restoreAutoDeleteTimers } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: {
          cache: new Map(),
        },
      };

      const mockTicketRepository = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([]),
      };

      await restoreAutoDeleteTimers(
        mockClient as never,
        mockTicketRepository as never,
      );

      expect(mockTicketRepository.findAllClosedByGuild).not.toHaveBeenCalled();
      expect(jobScheduler.addOneTimeJob).not.toHaveBeenCalled();
    });

    it("configが見つからないチケットはスキップする", async () => {
      const { restoreAutoDeleteTimers } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: {
          cache: new Map([["guild-1", { id: "guild-1" }]]),
        },
      };

      const closedTicket = {
        id: "ticket-1",
        channelId: "channel-1",
        guildId: "guild-1",
        categoryId: "category-1",
        status: "closed",
        elapsedDeleteMs: 0,
        closedAt: new Date(Date.now() - 10000),
      };

      const mockTicketRepo = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([closedTicket]),
      };

      const mockConfigSvc = {
        findByGuildAndCategory: vi.fn().mockResolvedValue(null),
      };

      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );

      await restoreAutoDeleteTimers(
        mockClient as never,
        mockTicketRepo as never,
      );

      expect(jobScheduler.addOneTimeJob).not.toHaveBeenCalled();
    });

    it("closedAtがnullのチケットでもタイマーを復元する", async () => {
      const { restoreAutoDeleteTimers } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: {
          cache: new Map([["guild-1", { id: "guild-1" }]]),
        },
      };

      const closedTicket = {
        id: "ticket-1",
        channelId: "channel-1",
        guildId: "guild-1",
        categoryId: "category-1",
        status: "closed",
        elapsedDeleteMs: 0,
        closedAt: null,
      };

      const mockTicketRepo = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([closedTicket]),
      };

      const mockConfigSvc = {
        findByGuildAndCategory: vi.fn().mockResolvedValue({
          autoDeleteDays: 7,
          staffRoleIds: "[]",
        }),
      };

      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );

      await restoreAutoDeleteTimers(
        mockClient as never,
        mockTicketRepo as never,
      );

      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-ticket-1",
        7 * 24 * 60 * 60 * 1000,
        expect.any(Function),
      );
    });

    it("findAllClosedByGuildが例外をスローした場合は空配列として扱う", async () => {
      const { restoreAutoDeleteTimers } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: {
          cache: new Map([["guild-1", { id: "guild-1" }]]),
        },
      };

      const mockTicketRepo = {
        findAllClosedByGuild: vi.fn().mockRejectedValue(new Error("db error")),
      };

      await restoreAutoDeleteTimers(
        mockClient as never,
        mockTicketRepo as never,
      );

      expect(jobScheduler.addOneTimeJob).not.toHaveBeenCalled();
    });

    it("findByGuildAndCategoryが例外をスローした場合はスキップする", async () => {
      const { restoreAutoDeleteTimers } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: {
          cache: new Map([["guild-1", { id: "guild-1" }]]),
        },
      };

      const closedTicket = {
        id: "ticket-1",
        channelId: "channel-1",
        guildId: "guild-1",
        categoryId: "category-1",
        status: "closed",
        elapsedDeleteMs: 0,
        closedAt: new Date(),
      };

      const mockTicketRepo = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([closedTicket]),
      };

      const mockConfigSvc = {
        findByGuildAndCategory: vi
          .fn()
          .mockRejectedValue(new Error("db error")),
      };

      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );

      await restoreAutoDeleteTimers(
        mockClient as never,
        mockTicketRepo as never,
      );

      expect(jobScheduler.addOneTimeJob).not.toHaveBeenCalled();
    });

    it("複数ギルドのクローズ済みチケットを復元する", async () => {
      const { restoreAutoDeleteTimers } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: {
          cache: new Map([
            ["guild-1", { id: "guild-1" }],
            ["guild-2", { id: "guild-2" }],
          ]),
        },
      };

      const closedTicket1 = {
        id: "ticket-1",
        channelId: "channel-1",
        guildId: "guild-1",
        categoryId: "category-1",
        status: "closed",
        elapsedDeleteMs: 0,
        closedAt: new Date(Date.now() - 10000),
      };
      const closedTicket2 = {
        id: "ticket-2",
        channelId: "channel-2",
        guildId: "guild-2",
        categoryId: "category-2",
        status: "closed",
        elapsedDeleteMs: 0,
        closedAt: new Date(Date.now() - 5000),
      };

      const mockTicketRepo = {
        findAllClosedByGuild: vi
          .fn()
          .mockResolvedValueOnce([closedTicket1])
          .mockResolvedValueOnce([closedTicket2]),
      };

      const mockConfigSvc = {
        findByGuildAndCategory: vi.fn().mockResolvedValue({
          autoDeleteDays: 7,
          staffRoleIds: "[]",
        }),
      };

      vi.mocked(getBotTicketConfigService).mockReturnValue(
        mockConfigSvc as never,
      );

      await restoreAutoDeleteTimers(
        mockClient as never,
        mockTicketRepo as never,
      );

      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledTimes(2);
    });
  });

  describe("executeAutoDelete (via scheduleTicketAutoDelete callback)", () => {
    it("正常系: DBからチケットを削除しチャンネルを削除する", async () => {
      const { scheduleTicketAutoDelete } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockChannel = { delete: vi.fn().mockResolvedValue(undefined) };
      const mockGuild = {
        channels: { fetch: vi.fn().mockResolvedValue(mockChannel) },
      };
      const mockClient = {
        guilds: { fetch: vi.fn().mockResolvedValue(mockGuild) },
      };

      const mockTicketRepo = {
        delete: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );

      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        60000,
        mockClient as never,
      );

      // addOneTimeJobに渡されたコールバックを取得して実行
      const callback = vi.mocked(jobScheduler.addOneTimeJob).mock.calls[0][2];
      await callback();

      expect(mockTicketRepo.delete).toHaveBeenCalledWith("ticket-1");
      expect(mockGuild.channels.fetch).toHaveBeenCalledWith("channel-1");
      expect(mockChannel.delete).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalled();
    });

    it("ギルドが見つからない場合でもDB削除は成功する", async () => {
      const { scheduleTicketAutoDelete } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: { fetch: vi.fn().mockResolvedValue(null) },
      };

      const mockTicketRepo = {
        delete: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );

      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        60000,
        mockClient as never,
      );

      const callback = vi.mocked(jobScheduler.addOneTimeJob).mock.calls[0][2];
      await callback();

      expect(mockTicketRepo.delete).toHaveBeenCalledWith("ticket-1");
      expect(logger.info).toHaveBeenCalled();
    });

    it("チャンネルが見つからない場合でもDB削除は成功する", async () => {
      const { scheduleTicketAutoDelete } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockGuild = {
        channels: { fetch: vi.fn().mockResolvedValue(null) },
      };
      const mockClient = {
        guilds: { fetch: vi.fn().mockResolvedValue(mockGuild) },
      };

      const mockTicketRepo = {
        delete: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );

      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        60000,
        mockClient as never,
      );

      const callback = vi.mocked(jobScheduler.addOneTimeJob).mock.calls[0][2];
      await callback();

      expect(mockTicketRepo.delete).toHaveBeenCalledWith("ticket-1");
      expect(logger.info).toHaveBeenCalled();
    });

    it("ギルドfetchが例外をスローした場合でもDB削除は成功する", async () => {
      const { scheduleTicketAutoDelete } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: { fetch: vi.fn().mockRejectedValue(new Error("guild error")) },
      };

      const mockTicketRepo = {
        delete: vi.fn().mockResolvedValue(undefined),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );

      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        60000,
        mockClient as never,
      );

      const callback = vi.mocked(jobScheduler.addOneTimeJob).mock.calls[0][2];
      await callback();

      // guilds.fetch catches error and returns null via .catch(() => null)
      expect(mockTicketRepo.delete).toHaveBeenCalledWith("ticket-1");
    });

    it("DB削除が例外をスローした場合はエラーログを出力する", async () => {
      const { scheduleTicketAutoDelete } = await import(
        "@/bot/features/ticket/services/ticketAutoDeleteService"
      );

      const mockClient = {
        guilds: { fetch: vi.fn().mockResolvedValue(null) },
      };

      const dbError = new Error("db delete error");
      const mockTicketRepo = {
        delete: vi.fn().mockRejectedValue(dbError),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(
        mockTicketRepo as never,
      );

      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        60000,
        mockClient as never,
      );

      const callback = vi.mocked(jobScheduler.addOneTimeJob).mock.calls[0][2];
      await callback();

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
