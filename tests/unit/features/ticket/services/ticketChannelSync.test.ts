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

vi.mock("@/bot/shared/errorChannelNotifier", () => ({
  notifyWarnChannel: vi.fn(),
}));

// ギルドの言語の翻訳は、キーと埋め込む値をそのまま返す
vi.mock("@/shared/locale/helpers", () => ({
  getGuildTranslator: vi.fn(
    async () => (key: string, params?: Record<string, unknown>) =>
      params ? `${key}:${JSON.stringify(params)}` : key,
  ),
}));

import { PermissionsBitField, type PermissionsString } from "discord.js";
import { notifyWarnChannel } from "@/bot/shared/errorChannelNotifier";
import {
  cancelTicketAutoDelete,
  restoreAutoDeleteTimers,
  restoreAutoDeleteTimersForGuild,
} from "@/features/ticket/services/ticketAutoDeleteService";
import {
  buildInaccessibleTicketChannelsNotice,
  reconcileTicketChannels,
  syncGuildTickets,
  syncGuildTicketsOnAvailable,
  syncTicketsOnStartup,
} from "@/features/ticket/services/ticketChannelSync";
import type { GuildTFunction } from "@/shared/locale/helpers";
import { logger } from "@/shared/utils/logger";

/** 警告通知の詳細欄に載せられる文字数（Discord の Embed のフィールドの値の上限） */
const EMBED_FIELD_VALUE_MAX_LENGTH = 1024;

/** Bot がチケットのチャンネルを扱うのに要る権限（createTicketChannel が Bot 自身の上書きで許可するもの） */
const BOT_CHANNEL_PERMISSIONS: PermissionsString[] = [
  "ViewChannel",
  "SendMessages",
  "ReadMessageHistory",
  "EmbedLinks",
];

/**
 * Bot を外して入れ直した後の、それより前に作ったチケットのチャンネルでの Bot の権限
 * （Bot 自身への上書きが消え、@everyone の拒否で「チャンネルを見る」が無い）
 */
const PERMISSIONS_AFTER_REINVITE: PermissionsString[] = [
  "SendMessages",
  "ReadMessageHistory",
  "EmbedLinks",
];

/**
 * guild.channels.fetch() が channelIds を持つコレクションを返すギルドのモックを作る
 * @param guildId ギルドID
 * @param channelIds 実在するチャンネルID
 * @param inaccessibleChannelIds そのうち Bot が扱えない（上書きが消えた）チャンネルID
 * @returns ギルドのモック
 */
function makeGuild(
  guildId: string,
  channelIds: string[],
  inaccessibleChannelIds: string[] = [],
) {
  return {
    id: guildId,
    client: { id: "client" },
    channels: {
      fetch: vi.fn().mockResolvedValue(
        new Map(
          channelIds.map((id) => [
            id,
            {
              id,
              permissionsFor: vi.fn(
                () =>
                  new PermissionsBitField(
                    inaccessibleChannelIds.includes(id)
                      ? PERMISSIONS_AFTER_REINVITE
                      : BOT_CHANNEL_PERMISSIONS,
                  ),
              ),
            },
          ]),
        ),
      ),
    },
    members: {
      me: { id: "bot-user-1" } as unknown,
      fetchMe: vi.fn().mockRejectedValue(new Error("fetchMe failed")),
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
    vi.mocked(notifyWarnChannel).mockResolvedValue(true);
  });

  describe("reconcileTicketChannels", () => {
    it("チャンネルが無いチケットだけ記録とタイマーを消し、件数を返す", async () => {
      const guild = makeGuild("guild-1", ["ch-alive"]);
      const repository = makeRepository([
        { id: "t-alive", channelId: "ch-alive" },
        { id: "t-gone", channelId: "ch-gone" },
      ]);

      const { removedCount: count } = await reconcileTicketChannels(
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

      const { removedCount: count } = await reconcileTicketChannels(
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

      const { removedCount: count } = await reconcileTicketChannels(
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

      const { removedCount: count } = await reconcileTicketChannels(
        guild as never,
        repository as never,
      );

      expect(count).toBe(0);
      expect(repository.delete).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalled();
    });

    it("チャンネルはあるが Bot が扱えない（Bot を外して入れ直す前に作った）チケットは、記録を消さずに返し warn を出す", async () => {
      const guild = makeGuild("guild-1", ["ch-ok", "ch-old"], ["ch-old"]);
      const repository = makeRepository([
        { id: "t-ok", channelId: "ch-ok" },
        { id: "t-old", channelId: "ch-old" },
      ]);

      const result = await reconcileTicketChannels(
        guild as never,
        repository as never,
      );

      expect(result).toEqual({
        removedCount: 0,
        inaccessibleTickets: [{ id: "t-old", channelId: "ch-old" }],
      });
      expect(repository.delete).not.toHaveBeenCalled();
      expect(cancelTicketAutoDelete).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'ticket:log.inaccessible_ticket_channels_found:{"guildId":"guild-1","count":"1","channelIds":"ch-old"}',
        ),
      );
    });

    it("Bot 自身のメンバーを取れないときは、扱えないと誤って判定しない", async () => {
      const guild = makeGuild("guild-1", ["ch-old"], ["ch-old"]);
      guild.members.me = null;
      const repository = makeRepository([{ id: "t-old", channelId: "ch-old" }]);

      const result = await reconcileTicketChannels(
        guild as never,
        repository as never,
      );

      expect(result.inaccessibleTickets).toEqual([]);
      expect(logger.warn).not.toHaveBeenCalled();
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

      const { removedCount: count } = await reconcileTicketChannels(
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

    it("再導入の指定（notifyInaccessibleChannels）があれば、Bot が扱えないチケットのチャンネルをエラー通知チャンネルに1回まとめて知らせる", async () => {
      const guild = makeGuild(
        "guild-1",
        ["ch-ok", "ch-old-1", "ch-old-2"],
        ["ch-old-1", "ch-old-2"],
      );
      const repository = makeRepository([
        { id: "t-ok", channelId: "ch-ok" },
        { id: "t-old-1", channelId: "ch-old-1" },
        { id: "t-old-2", channelId: "ch-old-2" },
      ]);

      const result = await syncGuildTickets(
        guild as never,
        repository as never,
        { notifyInaccessibleChannels: true },
      );

      expect(result).toEqual({ inaccessibleCount: 2, notified: true });
      expect(notifyWarnChannel).toHaveBeenCalledTimes(1);
      expect(notifyWarnChannel).toHaveBeenCalledWith(
        guild,
        `ticket:embed.field.value.channel_access_missing_notice:${JSON.stringify(
          { count: 2, channels: "<#ch-old-1> <#ch-old-2>" },
        )}`,
        {
          feature: "ticket:embed.field.value.error_notification_feature",
          action: "ticket:embed.field.value.channel_access_missing_action",
        },
      );
      // 知らせても自動削除タイマーの組み直しは続ける（発火時に扱えなければ保留する）
      expect(restoreAutoDeleteTimersForGuild).toHaveBeenCalled();
    });

    it("知らせるチャンネルが多いときは、先頭の10件と残りの件数を載せる（通知の文字数の上限に収めるため）", async () => {
      const channelIds = Array.from({ length: 12 }, (_, i) => `ch-${i}`);
      const guild = makeGuild("guild-1", channelIds, channelIds);
      const repository = makeRepository(
        channelIds.map((channelId, i) => ({ id: `t-${i}`, channelId })),
      );

      await syncGuildTickets(guild as never, repository as never, {
        notifyInaccessibleChannels: true,
      });

      const message = vi.mocked(notifyWarnChannel).mock.calls[0]?.[1];
      expect(message).toContain('"count":12');
      expect(message).toContain("<#ch-9>");
      expect(message).not.toContain("<#ch-10>");
      // 翻訳のモックが埋め込む値を JSON で並べるため、残りの件数は内側で引用符がエスケープされる
      expect(message).toContain(
        'ticket:user-response.and_more:{\\"count\\":2}',
      );
    });

    it("エラー通知チャンネルへ届かなかった（Bot が入れない・未設定）ときは、届かなかったことを件数と一緒に返す（呼び出し側が DM で代わりに知らせる）", async () => {
      vi.mocked(notifyWarnChannel).mockResolvedValue(false);
      const guild = makeGuild("guild-1", ["ch-old"], ["ch-old"]);
      const repository = makeRepository([{ id: "t-old", channelId: "ch-old" }]);

      const result = await syncGuildTickets(
        guild as never,
        repository as never,
        { notifyInaccessibleChannels: true },
      );

      expect(notifyWarnChannel).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ inaccessibleCount: 1, notified: false });
    });

    it("指定が無ければ（再接続など）、Bot が扱えないチャンネルがあっても通知しない（ログのみ）", async () => {
      const guild = makeGuild("guild-1", ["ch-old"], ["ch-old"]);
      const repository = makeRepository([{ id: "t-old", channelId: "ch-old" }]);

      const result = await syncGuildTickets(
        guild as never,
        repository as never,
      );

      expect(result).toEqual({ inaccessibleCount: 1, notified: false });
      expect(notifyWarnChannel).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "ticket:log.inaccessible_ticket_channels_found",
        ),
      );
    });

    it("Bot が扱えないチャンネルが無ければ、指定があっても通知しない", async () => {
      const guild = makeGuild("guild-1", ["ch-ok"]);
      const repository = makeRepository([{ id: "t-ok", channelId: "ch-ok" }]);

      const result = await syncGuildTickets(
        guild as never,
        repository as never,
        { notifyInaccessibleChannels: true },
      );

      expect(result).toEqual({ inaccessibleCount: 0, notified: false });
      expect(notifyWarnChannel).not.toHaveBeenCalled();
    });
  });

  // 実際の文面（ja/en）で、エラー通知チャンネルへの通知が警告通知の詳細欄に収まることを検証
  describe("buildInaccessibleTicketChannelsNotice（実際の文面）", () => {
    let translators: Record<"ja" | "en", GuildTFunction>;

    // このファイルでは翻訳をモックしているので、本物のロケールを読み込んで使う
    beforeAll(async () => {
      const { localeManager } = await vi.importActual<
        typeof import("@/shared/locale/localeManager")
      >("@/shared/locale/localeManager");
      await localeManager.initialize();
      translators = {
        ja: localeManager.getFixedT("ja") as unknown as GuildTFunction,
        en: localeManager.getFixedT("en") as unknown as GuildTFunction,
      };
    });

    /**
     * 20桁（snowflake の最大桁数）のチャンネルIDを持つチケットを作る
     * @param count 作る件数
     * @returns チケット
     */
    function makeTicketsWithLongIds(count: number) {
      return Array.from({ length: count }, (_, i) => ({
        id: `t-${i}`,
        channelId: String(10n ** 19n + BigInt(i)),
      }));
    }

    it.each(["ja", "en"] as const)(
      "%s: 20桁のチャンネルID 10件と残りの件数を載せても、詳細欄の上限（1024文字）に収まる",
      (lang) => {
        const tickets = makeTicketsWithLongIds(1000);

        const notice = buildInaccessibleTicketChannelsNotice(
          translators[lang],
          tickets as never,
        );

        expect(notice).toContain(`<#${tickets[9]?.channelId}>`);
        expect(notice).not.toContain(`<#${tickets[10]?.channelId}>`);
        expect(notice).toContain(
          translators[lang]("ticket:user-response.and_more", { count: 990 }),
        );
        expect(notice.length).toBeLessThanOrEqual(EMBED_FIELD_VALUE_MAX_LENGTH);
      },
    );

    it("ログなど、Bot 用に権限を付けていた他の非公開チャンネルも付け直しが要ることを伝える（ja/en）", () => {
      const tickets = makeTicketsWithLongIds(1);

      expect(
        buildInaccessibleTicketChannelsNotice(translators.ja, tickets as never),
      ).toContain(
        "ログなど、Bot 用に権限を付けていた他の非公開チャンネルも、同じく付け直しが必要です。",
      );
      expect(
        buildInaccessibleTicketChannelsNotice(translators.en, tickets as never),
      ).toContain(
        "Other private channels where you had given the bot permissions, such as log channels, need them added back in the same way.",
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

    it("再接続のたびに通知すると騒がしいので、Bot が扱えないチャンネルがあっても通知しない", async () => {
      const guild = makeGuild("guild-1", ["ch-old"], ["ch-old"]);
      const repository = makeRepository([{ id: "t-old", channelId: "ch-old" }]);

      await syncGuildTicketsOnAvailable(guild as never, repository as never);

      expect(notifyWarnChannel).not.toHaveBeenCalled();
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

    it("起動のたびに通知すると騒がしいので、Bot が扱えないチャンネルがあってもログだけ出して通知しない", async () => {
      const guild = makeGuild("guild-1", ["ch-old"], ["ch-old"]);
      const client = { guilds: { cache: new Map([["guild-1", guild]]) } };
      const repository = makeRepository([{ id: "t-old", channelId: "ch-old" }]);

      await syncTicketsOnStartup(client as never, repository as never);

      expect(notifyWarnChannel).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          "ticket:log.inaccessible_ticket_channels_found",
        ),
      );
    });
  });
});
