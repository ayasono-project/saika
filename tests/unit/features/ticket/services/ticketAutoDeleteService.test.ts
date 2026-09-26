vi.mock("@/shared/scheduler/jobScheduler", () => ({
  jobScheduler: {
    addOneTimeJob: vi.fn(),
    removeJob: vi.fn(),
    hasJob: vi.fn(),
  },
}));

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketSettingsService: vi.fn(),
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
  getBotTicketRepository,
  getBotTicketSettingsService,
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
        "@/features/ticket/services/ticketAutoDeleteService"
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

    it("予約できたときだけ「予約した」ログを出す", async () => {
      const { scheduleTicketAutoDelete } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );
      vi.mocked(jobScheduler.hasJob).mockReturnValue(true);

      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        60000,
        {} as never,
      );

      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.auto_delete_scheduled"),
      );
    });

    it("replaceExisting を指定すると、既存の予約の置き換えを想定どおりとして warn を抑える（quiet）で予約する", async () => {
      const { scheduleTicketAutoDelete } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );

      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        60000,
        {} as never,
        { replaceExisting: true },
      );

      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-ticket-1",
        60000,
        expect.any(Function),
        { quiet: true },
      );
    });

    it("スケジューラーが遅延を拒否したとき（NaN 等）は「予約した」ログを出さない", async () => {
      const { scheduleTicketAutoDelete } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );
      vi.mocked(jobScheduler.hasJob).mockReturnValue(false);

      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        Number.NaN,
        {} as never,
      );

      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.auto_delete_scheduled"),
      );
    });
  });

  describe("cancelTicketAutoDelete", () => {
    it("ジョブが存在する場合は jobScheduler.removeJob を呼び出す", async () => {
      const { cancelTicketAutoDelete } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );

      vi.mocked(jobScheduler.hasJob).mockReturnValue(true);

      cancelTicketAutoDelete("ticket-1", "guild-1");

      expect(jobScheduler.removeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-ticket-1",
      );
    });

    it("ジョブが存在しない場合は何もしない", async () => {
      const { cancelTicketAutoDelete } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );

      vi.mocked(jobScheduler.hasJob).mockReturnValue(false);

      cancelTicketAutoDelete("ticket-2", "guild-1");

      expect(jobScheduler.removeJob).not.toHaveBeenCalled();
    });
  });

  describe("restoreAutoDeleteTimers", () => {
    it("クローズ済みチケットのタイマーを復元する", async () => {
      const { restoreAutoDeleteTimers } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
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
          staffRoleIds: [],
        }),
      };

      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
        "@/features/ticket/services/ticketAutoDeleteService"
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
        "@/features/ticket/services/ticketAutoDeleteService"
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

      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
        "@/features/ticket/services/ticketAutoDeleteService"
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
          staffRoleIds: [],
        }),
      };

      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
        "@/features/ticket/services/ticketAutoDeleteService"
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
        "@/features/ticket/services/ticketAutoDeleteService"
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

      vi.mocked(getBotTicketSettingsService).mockReturnValue(
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
        "@/features/ticket/services/ticketAutoDeleteService"
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
          staffRoleIds: [],
        }),
      };

      vi.mocked(getBotTicketSettingsService).mockReturnValue(
        mockConfigSvc as never,
      );

      await restoreAutoDeleteTimers(
        mockClient as never,
        mockTicketRepo as never,
      );

      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledTimes(2);
    });
  });

  // 再導入時に1ギルド分だけ組み直す経路を検証
  describe("restoreAutoDeleteTimersForGuild", () => {
    it("指定したギルドのクローズ済みチケットだけタイマーを組み直し、件数を返す", async () => {
      const { restoreAutoDeleteTimersForGuild } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );
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
      vi.mocked(getBotTicketSettingsService).mockReturnValue({
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ autoDeleteDays: 7, staffRoleIds: [] }),
      } as never);

      const count = await restoreAutoDeleteTimersForGuild(
        "guild-1",
        {} as never,
        mockTicketRepository as never,
      );

      expect(count).toBe(1);
      expect(mockTicketRepository.findAllClosedByGuild).toHaveBeenCalledTimes(
        1,
      );
      expect(mockTicketRepository.findAllClosedByGuild).toHaveBeenCalledWith(
        "guild-1",
      );
      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-ticket-1",
        expect.any(Number),
        expect.any(Function),
      );
    });
  });

  // 既に予約があるチケット・カテゴリ指定・残り時間の計算を検証（再接続やパネル再設置で繰り返し呼ばれるため）
  describe("restoreAutoDeleteTimersForGuild（繰り返し呼ばれる経路）", () => {
    // 時刻に依存する残り時間を固定するため、システム時刻を固定する
    beforeEach(() => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
      vi.mocked(jobScheduler.hasJob).mockReturnValue(false);
    });

    // 他のテストへ時刻の固定を持ち越さない
    afterEach(() => {
      vi.useRealTimers();
    });

    it("既に予約があるチケットは組み直さず、件数にも数えない（再接続のたびに同じ予約を張り直さない）", async () => {
      const { restoreAutoDeleteTimersForGuild } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );
      const repository = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([
          {
            id: "t-scheduled",
            channelId: "ch-1",
            guildId: "guild-1",
            categoryId: "cat-1",
            status: "closed",
            elapsedDeleteMs: 0,
            closedAt: new Date(),
          },
        ]),
      };
      vi.mocked(jobScheduler.hasJob).mockImplementation(
        (jobId: string) => jobId === "ticket-auto-delete-t-scheduled",
      );
      vi.mocked(getBotTicketSettingsService).mockReturnValue({
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ autoDeleteDays: 7 }),
      } as never);

      const count = await restoreAutoDeleteTimersForGuild(
        "guild-1",
        {} as never,
        repository as never,
      );

      expect(count).toBe(0);
      expect(jobScheduler.addOneTimeJob).not.toHaveBeenCalled();
    });

    it("カテゴリを指定すると、そのカテゴリのチケットだけを組み直す", async () => {
      const { restoreAutoDeleteTimersForGuild } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );
      const base = {
        guildId: "guild-1",
        status: "closed",
        elapsedDeleteMs: 0,
        closedAt: new Date(),
      };
      const repository = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([
          { ...base, id: "t-a", channelId: "ch-a", categoryId: "cat-a" },
          { ...base, id: "t-b", channelId: "ch-b", categoryId: "cat-b" },
        ]),
      };
      vi.mocked(getBotTicketSettingsService).mockReturnValue({
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ autoDeleteDays: 7 }),
      } as never);

      const count = await restoreAutoDeleteTimersForGuild(
        "guild-1",
        {} as never,
        repository as never,
        { categoryId: "cat-b" },
      );

      expect(count).toBe(1);
      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledTimes(1);
      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-t-b",
        expect.any(Number),
        expect.any(Function),
      );
    });

    it("残り時間は、日数から累計のクローズ時間と今回クローズしてからの経過時間を引いた値になる", async () => {
      const { restoreAutoDeleteTimersForGuild } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );
      const repository = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([
          {
            id: "t-1",
            channelId: "ch-1",
            guildId: "guild-1",
            categoryId: "cat-1",
            status: "closed",
            elapsedDeleteMs: 1000,
            closedAt: new Date(Date.now() - 10_000),
          },
        ]),
      };
      vi.mocked(getBotTicketSettingsService).mockReturnValue({
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ autoDeleteDays: 7 }),
      } as never);

      await restoreAutoDeleteTimersForGuild(
        "guild-1",
        {} as never,
        repository as never,
      );

      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-t-1",
        7 * 24 * 60 * 60 * 1000 - 1000 - 10_000,
        expect.any(Function),
      );
    });
  });

  // パネルを作り直したカテゴリの自動削除の再開を検証
  describe("resumeAutoDeleteForCategory", () => {
    // 予約済みのジョブが無い状態から始める
    beforeEach(() => {
      vi.mocked(jobScheduler.hasJob).mockReturnValue(false);
    });

    it("そのカテゴリのクローズ済みチケットだけ予約し直し、件数をログに出す", async () => {
      const { resumeAutoDeleteForCategory } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );
      const base = {
        guildId: "guild-1",
        status: "closed",
        elapsedDeleteMs: 0,
        closedAt: new Date(),
      };
      const repository = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([
          { ...base, id: "t-a", channelId: "ch-a", categoryId: "cat-a" },
          { ...base, id: "t-b", channelId: "ch-b", categoryId: "cat-b" },
        ]),
      };
      vi.mocked(getBotTicketSettingsService).mockReturnValue({
        findByGuildAndCategory: vi
          .fn()
          .mockResolvedValue({ autoDeleteDays: 7 }),
      } as never);

      await resumeAutoDeleteForCategory(
        "guild-1",
        "cat-a",
        {} as never,
        repository as never,
      );

      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledTimes(1);
      expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
        "ticket-auto-delete-t-a",
        expect.any(Number),
        expect.any(Function),
        { quiet: true },
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining(
          'ticket:log.auto_delete_resumed:{"guildId":"guild-1","categoryId":"cat-a","count":"1"}',
        ),
      );
    });

    // 設定が無い間に発火していない古い予約が残っている場合の組み直しを検証（残すと作り直す前の日数で消える）
    describe("予約が残っているチケット", () => {
      const DAY_MS = 24 * 60 * 60 * 1000;

      // 残り時間を固定するためシステム時刻を固定し、どのチケットにも古い予約が残っている状態にする
      beforeEach(() => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
        vi.mocked(jobScheduler.hasJob).mockReturnValue(true);
      });

      // 他のテストへ時刻の固定を持ち越さない
      afterEach(() => {
        vi.useRealTimers();
      });

      /**
       * cat-a のクローズ済みチケット1件を返すリポジトリのモックを作る
       * @param closedDaysAgo 何日前にクローズしたか
       * @returns リポジトリのモック
       */
      function createRepository(closedDaysAgo: number) {
        return {
          findAllClosedByGuild: vi.fn().mockResolvedValue([
            {
              id: "t-a",
              channelId: "ch-a",
              guildId: "guild-1",
              categoryId: "cat-a",
              status: "closed",
              elapsedDeleteMs: 0,
              closedAt: new Date(Date.now() - closedDaysAgo * DAY_MS),
            },
          ]),
        };
      }

      it("作り直した設定の日数と closedAt から組み直して置き換え、置き換えの warn は出さない（quiet）", async () => {
        const { resumeAutoDeleteForCategory } = await import(
          "@/features/ticket/services/ticketAutoDeleteService"
        );
        vi.mocked(getBotTicketSettingsService).mockReturnValue({
          findByGuildAndCategory: vi
            .fn()
            .mockResolvedValue({ autoDeleteDays: 30 }),
        } as never);

        await resumeAutoDeleteForCategory(
          "guild-1",
          "cat-a",
          {} as never,
          createRepository(3) as never,
        );

        expect(jobScheduler.addOneTimeJob).toHaveBeenCalledTimes(1);
        expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
          "ticket-auto-delete-t-a",
          30 * DAY_MS - 3 * DAY_MS,
          expect.any(Function),
          { quiet: true },
        );
        expect(logger.info).toHaveBeenCalledWith(
          expect.stringContaining(
            'ticket:log.auto_delete_resumed:{"guildId":"guild-1","categoryId":"cat-a","count":"1"}',
          ),
        );
      });

      it("作り直した設定の日数を既に過ぎていれば、残っている予約を待たずにすぐ削除する予約（残り0以下）に置き換える", async () => {
        const { resumeAutoDeleteForCategory } = await import(
          "@/features/ticket/services/ticketAutoDeleteService"
        );
        vi.mocked(getBotTicketSettingsService).mockReturnValue({
          findByGuildAndCategory: vi
            .fn()
            .mockResolvedValue({ autoDeleteDays: 7 }),
        } as never);

        await resumeAutoDeleteForCategory(
          "guild-1",
          "cat-a",
          {} as never,
          createRepository(10) as never,
        );

        expect(jobScheduler.addOneTimeJob).toHaveBeenCalledWith(
          "ticket-auto-delete-t-a",
          7 * DAY_MS - 10 * DAY_MS,
          expect.any(Function),
          { quiet: true },
        );
      });
    });

    it("途中で例外が出てもログに残すだけで投げない（パネルの設置を妨げない）", async () => {
      const { resumeAutoDeleteForCategory } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );
      const repository = {
        findAllClosedByGuild: vi.fn().mockResolvedValue([
          {
            id: "t-a",
            channelId: "ch-a",
            guildId: "guild-1",
            categoryId: "cat-a",
            status: "closed",
            elapsedDeleteMs: 0,
            closedAt: new Date(),
          },
        ]),
      };
      vi.mocked(getBotTicketSettingsService).mockImplementation(() => {
        throw new Error("not initialized");
      });

      await expect(
        resumeAutoDeleteForCategory(
          "guild-1",
          "cat-a",
          {} as never,
          repository as never,
        ),
      ).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.auto_delete_resume_failed"),
        expect.any(Error),
      );
    });
  });

  // 発火時に記録と設定を読み直してから消すことを検証
  describe("executeAutoDelete (via scheduleTicketAutoDelete callback)", () => {
    const CLOSED_TICKET = {
      id: "ticket-1",
      guildId: "guild-1",
      categoryId: "cat-1",
      channelId: "channel-1",
      status: "closed",
    };

    /**
     * 自動削除を予約し、登録されたコールバックを取り出す
     * @param client Discord クライアントのモック
     * @returns 発火時に実行されるコールバック
     */
    async function scheduleAndGetCallback(
      client: unknown,
    ): Promise<() => Promise<void> | void> {
      const { scheduleTicketAutoDelete } = await import(
        "@/features/ticket/services/ticketAutoDeleteService"
      );
      scheduleTicketAutoDelete(
        "ticket-1",
        "channel-1",
        "guild-1",
        60000,
        client as never,
      );
      return vi.mocked(jobScheduler.addOneTimeJob).mock.calls[0][2];
    }

    /**
     * 読み直し用の findById と、クローズ済みのときだけ消す deleteIfClosed を持つリポジトリのモックを登録する
     * @param ticket findById が返すチケット
     * @returns リポジトリのモック
     */
    function useTicketRepository(ticket: unknown) {
      const repository = {
        findById: vi.fn().mockResolvedValue(ticket),
        deleteIfClosed: vi.fn().mockResolvedValue(true),
      };
      vi.mocked(getBotTicketRepository).mockReturnValue(repository as never);
      return repository;
    }

    /**
     * カテゴリの設定を返す設定サービスのモックを登録する
     * @param config findByGuildAndCategory が返す設定
     */
    function useSettings(config: unknown): void {
      vi.mocked(getBotTicketSettingsService).mockReturnValue({
        findByGuildAndCategory: vi.fn().mockResolvedValue(config),
      } as never);
    }

    // 既定では設定があり、ギルドは見つからない状態にする
    beforeEach(() => {
      useSettings({ autoDeleteDays: 7 });
    });

    it("正常系: クローズ済みなら DB からチケットを削除しチャンネルを削除する", async () => {
      const mockChannel = { delete: vi.fn().mockResolvedValue(undefined) };
      const mockGuild = {
        channels: { fetch: vi.fn().mockResolvedValue(mockChannel) },
      };
      const repository = useTicketRepository(CLOSED_TICKET);
      const callback = await scheduleAndGetCallback({
        guilds: { fetch: vi.fn().mockResolvedValue(mockGuild) },
      });

      await callback();

      expect(repository.findById).toHaveBeenCalledWith("ticket-1");
      expect(repository.deleteIfClosed).toHaveBeenCalledWith("ticket-1");
      expect(mockGuild.channels.fetch).toHaveBeenCalledWith("channel-1");
      expect(mockChannel.delete).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_auto_deleted"),
      );
    });

    it("予約の後に再オープンされていたら（status が open）削除しない", async () => {
      const guildsFetch = vi.fn();
      const repository = useTicketRepository({
        ...CLOSED_TICKET,
        status: "open",
      });
      const callback = await scheduleAndGetCallback({
        guilds: { fetch: guildsFetch },
      });

      await callback();

      expect(repository.deleteIfClosed).not.toHaveBeenCalled();
      expect(guildsFetch).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.auto_delete_skipped_not_closed"),
      );
    });

    it("予約の後に記録が消えていたら何もしない", async () => {
      const guildsFetch = vi.fn();
      const repository = useTicketRepository(null);
      const callback = await scheduleAndGetCallback({
        guilds: { fetch: guildsFetch },
      });

      await callback();

      expect(repository.deleteIfClosed).not.toHaveBeenCalled();
      expect(guildsFetch).not.toHaveBeenCalled();
    });

    it("カテゴリの設定が無い（パネルが削除された）チケットは削除を保留する（再起動後の復元と扱いを揃える）", async () => {
      const guildsFetch = vi.fn();
      const repository = useTicketRepository(CLOSED_TICKET);
      useSettings(null);
      const callback = await scheduleAndGetCallback({
        guilds: { fetch: guildsFetch },
      });

      await callback();

      expect(repository.deleteIfClosed).not.toHaveBeenCalled();
      expect(guildsFetch).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.auto_delete_held_config_missing"),
      );
    });

    it("ギルドが見つからない場合でもDB削除は成功する", async () => {
      const repository = useTicketRepository(CLOSED_TICKET);
      const callback = await scheduleAndGetCallback({
        guilds: { fetch: vi.fn().mockResolvedValue(null) },
      });

      await callback();

      expect(repository.deleteIfClosed).toHaveBeenCalledWith("ticket-1");
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_auto_deleted"),
      );
    });

    it("チャンネルが見つからない場合でもDB削除は成功する", async () => {
      const repository = useTicketRepository(CLOSED_TICKET);
      const callback = await scheduleAndGetCallback({
        guilds: {
          fetch: vi.fn().mockResolvedValue({
            channels: { fetch: vi.fn().mockResolvedValue(null) },
          }),
        },
      });

      await callback();

      expect(repository.deleteIfClosed).toHaveBeenCalledWith("ticket-1");
    });

    it("読み直した後に再オープンされていた（クローズ済みのときだけ消す削除で消えなかった）ときは、チャンネルを消さない", async () => {
      const mockChannel = { delete: vi.fn().mockResolvedValue(undefined) };
      const mockGuild = {
        channels: { fetch: vi.fn().mockResolvedValue(mockChannel) },
      };
      const repository = useTicketRepository(CLOSED_TICKET);
      repository.deleteIfClosed.mockResolvedValue(false);
      const callback = await scheduleAndGetCallback({
        guilds: { fetch: vi.fn().mockResolvedValue(mockGuild) },
      });

      await callback();

      expect(mockChannel.delete).not.toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.auto_delete_skipped_not_closed"),
      );
    });

    it("ギルドfetchが例外をスローした場合でもDB削除は成功する", async () => {
      const repository = useTicketRepository(CLOSED_TICKET);
      const callback = await scheduleAndGetCallback({
        guilds: { fetch: vi.fn().mockRejectedValue(new Error("guild error")) },
      });

      await callback();

      expect(repository.deleteIfClosed).toHaveBeenCalledWith("ticket-1");
    });

    it("DB削除が失敗した場合は、成功とは別の失敗用のキーでエラーログを出す", async () => {
      const repository = useTicketRepository(CLOSED_TICKET);
      repository.deleteIfClosed.mockRejectedValue(new Error("db delete error"));
      const callback = await scheduleAndGetCallback({
        guilds: { fetch: vi.fn().mockResolvedValue(null) },
      });

      await callback();

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_auto_delete_failed"),
        expect.any(Error),
      );
      expect(logger.error).not.toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_auto_deleted"),
        expect.anything(),
      );
      expect(logger.info).not.toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_auto_deleted"),
      );
    });
  });
});
