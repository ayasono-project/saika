// チケットの記録と Discord 上のチャンネルの突き合わせのテスト

vi.mock("@/features/ticket/services/ticketAutoDeleteService", () => ({
  cancelTicketAutoDelete: vi.fn(),
  restoreAutoDeleteTimers: vi.fn(),
  restoreAutoDeleteTimersForGuild: vi.fn(),
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

import {
  cancelTicketAutoDelete,
  restoreAutoDeleteTimers,
  restoreAutoDeleteTimersForGuild,
} from "@/features/ticket/services/ticketAutoDeleteService";
import {
  removeTicketsWithMissingChannels,
  syncGuildTickets,
  syncGuildTicketsOnAvailable,
  syncTicketsOnStartup,
} from "@/features/ticket/services/ticketChannelSync";
import { logger } from "@/shared/utils/logger";

/**
 * guild.channels.fetch() が channelIds を持つコレクションを返すギルドのモックを作る
 * @param guildId ギルドID
 * @param channelIds 実在するチャンネルID
 * @returns ギルドのモック
 */
function makeGuild(guildId: string, channelIds: string[]) {
  return {
    id: guildId,
    client: { id: "client" },
    channels: {
      fetch: vi
        .fn()
        .mockResolvedValue(new Map(channelIds.map((id) => [id, { id }]))),
    },
  };
}

/**
 * findAllByGuild / delete を持つチケットリポジトリのモックを作る
 * @param tickets findAllByGuild が返すチケット
 * @returns リポジトリのモック
 */
function makeRepository(tickets: { id: string; channelId: string }[]) {
  return {
    findAllByGuild: vi.fn().mockResolvedValue(tickets),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

// チャンネルが無いチケットの片付け・再導入時の同期・起動時の同期を検証
describe("features/ticket/services/ticketChannelSync", () => {
  // 各テストでモックの呼び出し記録と戻り値を初期化する
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(restoreAutoDeleteTimersForGuild).mockResolvedValue(0);
    vi.mocked(restoreAutoDeleteTimers).mockResolvedValue(undefined);
  });

  describe("removeTicketsWithMissingChannels", () => {
    it("チャンネルが無いチケットだけ記録とタイマーを消し、件数を返す", async () => {
      const guild = makeGuild("guild-1", ["ch-alive"]);
      const repository = makeRepository([
        { id: "t-alive", channelId: "ch-alive" },
        { id: "t-gone", channelId: "ch-gone" },
      ]);

      const count = await removeTicketsWithMissingChannels(
        guild as never,
        repository as never,
      );

      expect(count).toBe(1);
      expect(repository.delete).toHaveBeenCalledTimes(1);
      expect(repository.delete).toHaveBeenCalledWith("t-gone");
      expect(cancelTicketAutoDelete).toHaveBeenCalledWith("t-gone", "guild-1");
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.missing_channel_tickets_removed"),
      );
    });

    it("チケットが無いギルドではチャンネル一覧を取りに行かない", async () => {
      const guild = makeGuild("guild-1", []);
      const repository = makeRepository([]);

      const count = await removeTicketsWithMissingChannels(
        guild as never,
        repository as never,
      );

      expect(count).toBe(0);
      expect(guild.channels.fetch).not.toHaveBeenCalled();
    });

    it("チャンネル一覧の取得に失敗したら、存在しないと誤判定しないよう何も消さず warn を出す", async () => {
      const guild = makeGuild("guild-1", []);
      guild.channels.fetch.mockRejectedValue(new Error("Service Unavailable"));
      const repository = makeRepository([{ id: "t-1", channelId: "ch-1" }]);

      const count = await removeTicketsWithMissingChannels(
        guild as never,
        repository as never,
      );

      expect(count).toBe(0);
      expect(repository.delete).not.toHaveBeenCalled();
      expect(cancelTicketAutoDelete).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_channel_sync_failed"),
        expect.any(Error),
      );
    });

    it("チケットの取得に失敗したら何も消さず warn を出す", async () => {
      const guild = makeGuild("guild-1", []);
      const repository = makeRepository([]);
      repository.findAllByGuild.mockRejectedValue(new Error("db down"));

      const count = await removeTicketsWithMissingChannels(
        guild as never,
        repository as never,
      );

      expect(count).toBe(0);
      expect(repository.delete).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it("1件の削除に失敗しても残りは続行し、失敗は error を出す", async () => {
      const guild = makeGuild("guild-1", []);
      const repository = makeRepository([
        { id: "t-1", channelId: "ch-1" },
        { id: "t-2", channelId: "ch-2" },
      ]);
      repository.delete
        .mockRejectedValueOnce(new Error("delete failed"))
        .mockResolvedValueOnce(undefined);

      const count = await removeTicketsWithMissingChannels(
        guild as never,
        repository as never,
      );

      expect(count).toBe(1);
      expect(repository.delete).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.ticket_channel_cleanup_failed"),
        expect.any(Error),
      );
    });
  });

  describe("syncGuildTickets", () => {
    it("チャンネルの無いチケットを片付けてから、そのギルドのタイマーを組み直す", async () => {
      const guild = makeGuild("guild-1", []);
      const repository = makeRepository([
        { id: "t-gone", channelId: "ch-gone" },
      ]);
      vi.mocked(restoreAutoDeleteTimersForGuild).mockResolvedValue(2);

      await syncGuildTickets(guild as never, repository as never);

      expect(repository.delete).toHaveBeenCalledWith("t-gone");
      expect(restoreAutoDeleteTimersForGuild).toHaveBeenCalledWith(
        "guild-1",
        guild.client,
        repository,
      );
      expect(repository.delete.mock.invocationCallOrder[0]).toBeLessThan(
        vi.mocked(restoreAutoDeleteTimersForGuild).mock.invocationCallOrder[0],
      );
      expect(logger.info).toHaveBeenCalledWith(
        expect.stringContaining("ticket:log.auto_delete_restore_guild"),
      );
    });
  });

  // 再接続でギルドが戻ったとき（guildAvailable）の突き合わせを検証
  describe("syncGuildTicketsOnAvailable", () => {
    it("切断中に消されたチャンネルのチケットを片付け、そのギルドのタイマーを組み直す", async () => {
      const guild = makeGuild("guild-1", ["ch-alive"]);
      const repository = makeRepository([
        { id: "t-alive", channelId: "ch-alive" },
        { id: "t-gone", channelId: "ch-gone" },
      ]);

      await syncGuildTicketsOnAvailable(guild as never, repository as never);

      expect(repository.delete).toHaveBeenCalledTimes(1);
      expect(repository.delete).toHaveBeenCalledWith("t-gone");
      expect(restoreAutoDeleteTimersForGuild).toHaveBeenCalledWith(
        "guild-1",
        guild.client,
        repository,
      );
    });

    it("途中で例外が出てもログに残すだけで投げない（guildAvailable のリスナーから待たずに呼ぶため）", async () => {
      const guild = makeGuild("guild-1", []);
      const repository = makeRepository([]);
      vi.mocked(restoreAutoDeleteTimersForGuild).mockRejectedValue(
        new Error("restore failed"),
      );

      await expect(
        syncGuildTicketsOnAvailable(guild as never, repository as never),
      ).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'ticket:log.guild_resync_failed:{"guildId":"guild-1"}',
        ),
        expect.any(Error),
      );
    });
  });

  describe("syncTicketsOnStartup", () => {
    it("全ギルドのチャンネルの無いチケットを片付けてから、全ギルドのタイマーを復元する", async () => {
      const guild1 = makeGuild("guild-1", []);
      const guild2 = makeGuild("guild-2", []);
      const client = {
        guilds: {
          cache: new Map([
            ["guild-1", guild1],
            ["guild-2", guild2],
          ]),
        },
      };
      const repository = makeRepository([]);

      await syncTicketsOnStartup(client as never, repository as never);

      expect(repository.findAllByGuild).toHaveBeenCalledWith("guild-1");
      expect(repository.findAllByGuild).toHaveBeenCalledWith("guild-2");
      expect(restoreAutoDeleteTimers).toHaveBeenCalledWith(client, repository);
      expect(
        repository.findAllByGuild.mock.invocationCallOrder[1],
      ).toBeLessThan(
        vi.mocked(restoreAutoDeleteTimers).mock.invocationCallOrder[0],
      );
    });
  });
});
