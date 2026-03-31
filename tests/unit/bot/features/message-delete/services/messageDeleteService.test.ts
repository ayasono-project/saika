// tests/unit/bot/features/message-delete/services/messageDeleteService.test.ts
// messageDeleteService の単体テスト（parseDateStr・scanMessages・deleteScannedMessages）

import { Collection } from "discord.js";
import type { Mock } from "vitest";

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
  tDefault: vi.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  ),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

/** Build a Discord.js-like Collection from an array of messages */
function makeCollection<T extends { id: string }>(msgs: T[]) {
  const col = new Collection<string, T>();
  for (const m of msgs) col.set(m.id, m);
  return col;
}

// messageDeleteService の parseDateStr・scanMessages・deleteScannedMessages を検証
describe("bot/features/message-delete/services/messageDeleteService", () => {
  async function loadModule() {
    return import(
      "@/bot/features/message-delete/services/messageDeleteService"
    );
  }

  // ─────────────────────────────────────────────────────────────
  // parseDateStr
  // ─────────────────────────────────────────────────────────────

  // 各日付フォーマット（YYYY-MM-DD / ISO / オフセット付き）のパースと無効入力を検証
  describe("parseDateStr", () => {
    it("endOfDay=false で YYYY-MM-DD 形式をパースする", async () => {
      const { parseDateStr } = await loadModule();
      const result = parseDateStr("2024-01-15", false, "+00:00");
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2024-01-15T00:00:00.000Z");
    });

    it("endOfDay=true で YYYY-MM-DD 形式をパースする", async () => {
      const { parseDateStr } = await loadModule();
      const result = parseDateStr("2024-01-15", true, "+00:00");
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2024-01-15T23:59:59.000Z");
    });

    it("YYYY-MM-DD 形式にタイムゾーンオフセットを適用する", async () => {
      const { parseDateStr } = await loadModule();
      const result = parseDateStr("2024-01-15", false, "+09:00");
      expect(result).toBeInstanceOf(Date);
      // 2024-01-15T00:00:00+09:00 = 2024-01-14T15:00:00Z
      expect(result?.toISOString()).toBe("2024-01-14T15:00:00.000Z");
    });

    it("オフセットなしの YYYY-MM-DDTHH:MM:SS 形式をパースする", async () => {
      const { parseDateStr } = await loadModule();
      const result = parseDateStr("2024-01-15T12:30:45", false, "+00:00");
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2024-01-15T12:30:45.000Z");
    });

    it("YYYY-MM-DDTHH:MM:SS+offset 形式をパースする", async () => {
      const { parseDateStr } = await loadModule();
      const result = parseDateStr("2024-01-15T12:30:45+09:00", false, "+00:00");
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2024-01-15T03:30:45.000Z");
    });

    it("YYYY-MM-DDTHH:MM:SSZ 形式をパースする", async () => {
      const { parseDateStr } = await loadModule();
      const result = parseDateStr("2024-01-15T12:30:45Z", false, "+00:00");
      expect(result).toBeInstanceOf(Date);
      expect(result?.toISOString()).toBe("2024-01-15T12:30:45.000Z");
    });

    it("無効な形式の場合は null を返す", async () => {
      const { parseDateStr } = await loadModule();
      expect(parseDateStr("not-a-date", false, "+00:00")).toBeNull();
      expect(parseDateStr("2024/01/15", false, "+00:00")).toBeNull();
      expect(parseDateStr("15-01-2024", false, "+00:00")).toBeNull();
    });

    it("日付が NaN の場合は null を返す", async () => {
      const { parseDateStr } = await loadModule();
      // A format that passes regex but produces NaN date
      // e.g. month 99
      expect(parseDateStr("2024-99-01", false, "+00:00")).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // scanMessages
  // ─────────────────────────────────────────────────────────────

  // チャンネルからのメッセージ収集・フィルタリング・上限・abort・進捗コールバックを検証
  describe("scanMessages", () => {
    function makeMessage(
      id: string,
      authorId: string,
      content: string,
      createdTimestamp: number,
      opts: { attachments?: number; embeds?: { title?: string }[] } = {},
    ) {
      return {
        id,
        author: { id: authorId, displayName: authorId },
        webhookId: null,
        content,
        createdTimestamp,
        createdAt: new Date(createdTimestamp),
        member: null,
        attachments: {
          size: opts.attachments ?? 0,
        },
        embeds: opts.embeds ?? [],
      };
    }

    function makeChannel(
      id: string,
      opts: { hasPermission?: boolean; meNull?: boolean } = {},
    ) {
      const hasPermission = opts.hasPermission ?? true;
      return {
        id,
        name: `channel-${id}`,
        guildId: "guild-1",
        guild: {
          members: {
            me: opts.meNull
              ? null
              : {
                  displayName: "Bot",
                },
          },
        },
        permissionsFor: vi.fn(() =>
          opts.meNull ? null : { has: vi.fn(() => hasPermission) },
        ),
        messages: {
          fetch: vi.fn().mockResolvedValue(makeCollection([])) as Mock,
        },
      };
    }

    it("チャンネルへの権限がない場合は空の配列を返す", async () => {
      const { scanMessages } = await loadModule();
      const channel = makeChannel("ch-1", { hasPermission: false });
      const result = await scanMessages([channel as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });
      expect(result).toEqual([]);
    });

    it("チャンネルからメッセージをスキャンする", async () => {
      const { scanMessages } = await loadModule();

      const now = Date.now();
      const msg1 = makeMessage("msg-1", "user-1", "hello", now - 1000);
      const msg2 = makeMessage("msg-2", "user-2", "world", now - 2000);

      const channel = makeChannel("ch-1");
      (channel.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection([msg1, msg2]))
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([channel as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(2);
    });

    it("targetUserIds でフィルタリングする", async () => {
      const { scanMessages } = await loadModule();

      const now = Date.now();
      const msg1 = makeMessage("msg-1", "user-1", "hello", now - 1000);
      const msg2 = makeMessage("msg-2", "user-2", "world", now - 2000);

      const channel = makeChannel("ch-1");
      (channel.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection([msg1, msg2]))
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([channel as never], {
        count: 10,
        targetUserIds: ["user-1"],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(1);
      expect(result[0].authorId).toBe("user-1");
    });

    it("keyword でフィルタリングする", async () => {
      const { scanMessages } = await loadModule();

      const now = Date.now();
      const msg1 = makeMessage("msg-1", "user-1", "hello world", now - 1000);
      const msg2 = makeMessage("msg-2", "user-2", "foo bar", now - 2000);

      const channel = makeChannel("ch-1");
      (channel.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection([msg1, msg2]))
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([channel as never], {
        count: 10,
        targetUserIds: [],
        keyword: "hello",
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(1);
    });

    it("count の上限に達した場合にスキャンを停止する", async () => {
      const { scanMessages } = await loadModule();

      const now = Date.now();
      const msgs = Array.from({ length: 5 }, (_, i) =>
        makeMessage(`msg-${i}`, "user-1", `msg ${i}`, now - i * 1000),
      );

      const channel = makeChannel("ch-1");
      (channel.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection(msgs))
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([channel as never], {
        count: 3,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(3);
    });

    it("既に中断済みの abort signal を尊重する", async () => {
      const { scanMessages } = await loadModule();

      const controller = new AbortController();
      const channel = makeChannel("ch-1");
      (channel.messages.fetch as Mock).mockResolvedValue(makeCollection([]));

      controller.abort();

      const result = await scanMessages([channel as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        signal: controller.signal,
        locale: "ja",
      });

      expect(result).toEqual([]);
    });

    it("添付ファイルがある場合の表示コンテンツを構築する", async () => {
      const { scanMessages } = await loadModule();

      const now = Date.now();
      const msg = makeMessage("msg-1", "user-1", "", now - 1000, {
        attachments: 2,
      });

      const channel = makeChannel("ch-1");
      (channel.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection([msg]))
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([channel as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(1);
    });

    it("embed（タイトルあり・なし）がある場合の表示コンテンツを構築する", async () => {
      const { scanMessages } = await loadModule();

      const now = Date.now();
      const msg = makeMessage("msg-1", "user-1", "", now - 1000, {
        embeds: [{ title: "My Title" }, {}],
      });

      const channel = makeChannel("ch-1");
      (channel.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection([msg]))
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([channel as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(1);
    });

    it("onProgress コールバックを呼び出す", async () => {
      const { scanMessages } = await loadModule();

      const onProgress = vi.fn().mockResolvedValue(undefined);
      const channel = makeChannel("ch-1");
      (channel.messages.fetch as Mock).mockResolvedValue(makeCollection([]));

      await scanMessages([channel as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        onProgress,
        locale: "ja",
      });

      expect(onProgress).toHaveBeenCalled();
    });

    it("me メンバーがいないチャンネル（権限チェックなし）を処理する", async () => {
      const { scanMessages } = await loadModule();

      const now = Date.now();
      const msg = makeMessage("msg-1", "user-1", "hello", now - 1000);

      const channel = makeChannel("ch-1", { meNull: true });
      (channel.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection([msg]))
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([channel as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(1);
    });

    it("長いコンテンツを最大文字数に切り詰める", async () => {
      const { scanMessages } = await loadModule();

      const now = Date.now();
      const longContent = "a".repeat(300);
      const msg = makeMessage("msg-1", "user-1", longContent, now - 1000);

      const channel = makeChannel("ch-1");
      (channel.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection([msg]))
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([channel as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result[0].content.length).toBeLessThanOrEqual(201); // 200 chars + "…"
      expect(result[0].content.endsWith("…")).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // deleteScannedMessages
  // ─────────────────────────────────────────────────────────────

  // 一括削除・個別削除・エラーハンドリング・abort・進捗コールバックを検証
  describe("deleteScannedMessages", () => {
    function makeScannedMessage(
      id: string,
      channelId: string,
      ageMs: number,
      channelWithBulkDelete = true,
    ) {
      const channel: Record<string, unknown> = {
        id: channelId,
        messages: {
          delete: vi.fn().mockResolvedValue(undefined) as Mock,
        },
      };
      if (channelWithBulkDelete) {
        channel.bulkDelete = vi
          .fn()
          .mockResolvedValue(makeCollection([{ id }])) as Mock;
      }
      return {
        messageId: id,
        guildId: "guild-1",
        authorId: "user-1",
        authorDisplayName: "User",
        channelId,
        channelName: `channel-${channelId}`,
        createdAt: new Date(Date.now() - ageMs),
        content: "hello",
        _channel: channel,
      };
    }

    it("最近のメッセージ（14 日未満）を一括削除する", async () => {
      const { deleteScannedMessages } = await loadModule();

      const msg = makeScannedMessage("msg-1", "ch-1", 1000);
      const result = await deleteScannedMessages([msg as never]);

      expect(result.totalDeleted).toBe(1);
      expect(result.channelBreakdown["ch-1"]).toEqual({
        name: "channel-ch-1",
        count: 1,
      });
      expect(msg._channel.bulkDelete).toHaveBeenCalled();
    });

    it("古いメッセージ（14 日超）を個別に削除する", async () => {
      const { deleteScannedMessages } = await loadModule();

      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000 + 1000;
      const msg = makeScannedMessage("msg-1", "ch-1", twoWeeksMs);
      const result = await deleteScannedMessages([msg as never]);

      expect(result.totalDeleted).toBe(1);
      expect(
        (msg._channel.messages as { delete: Mock }).delete,
      ).toHaveBeenCalledWith("msg-1");
    });

    it("bulkDelete を持たないチャンネルでは個別削除を使用する", async () => {
      const { deleteScannedMessages } = await loadModule();

      const msg = makeScannedMessage("msg-1", "ch-1", 1000, false);
      const result = await deleteScannedMessages([msg as never]);

      expect(result.totalDeleted).toBe(1);
      expect(
        (msg._channel.messages as { delete: Mock }).delete,
      ).toHaveBeenCalledWith("msg-1");
    });

    it("削除エラーを適切に処理する", async () => {
      const { deleteScannedMessages } = await loadModule();

      const twoWeeksMs = 14 * 24 * 60 * 60 * 1000 + 1000;
      const msg = makeScannedMessage("msg-1", "ch-1", twoWeeksMs);
      (msg._channel.messages as { delete: Mock }).delete = vi
        .fn()
        .mockRejectedValue(new Error("Not found")) as Mock;

      const result = await deleteScannedMessages([msg as never]);
      // Error is caught, totalDeleted stays 0
      expect(result.totalDeleted).toBe(0);
    });

    it("abort signal を尊重する", async () => {
      const { deleteScannedMessages } = await loadModule();

      const controller = new AbortController();
      controller.abort();

      const msg = makeScannedMessage("msg-1", "ch-1", 1000);
      const result = await deleteScannedMessages(
        [msg as never],
        undefined,
        controller.signal,
      );

      expect(result.totalDeleted).toBe(0);
    });

    it("メッセージ配列が空の場合は空の内訳を返す", async () => {
      const { deleteScannedMessages } = await loadModule();
      const result = await deleteScannedMessages([]);
      expect(result.totalDeleted).toBe(0);
      expect(result.channelBreakdown).toEqual({});
    });

    it("onProgress コールバックを呼び出す", async () => {
      const { deleteScannedMessages } = await loadModule();

      const onProgress = vi.fn().mockResolvedValue(undefined);
      const msg = makeScannedMessage("msg-1", "ch-1", 1000);
      await deleteScannedMessages([msg as never], onProgress);

      expect(onProgress).toHaveBeenCalled();
    });

    it("同じチャンネルの複数メッセージを処理する", async () => {
      const { deleteScannedMessages } = await loadModule();

      const channel: Record<string, unknown> = {
        id: "ch-1",
        messages: { delete: vi.fn().mockResolvedValue(undefined) as Mock },
        bulkDelete: vi
          .fn()
          .mockResolvedValue(
            makeCollection([{ id: "msg-1" }, { id: "msg-2" }]),
          ) as Mock,
      };

      const makeMsg = (id: string) => ({
        messageId: id,
        guildId: "guild-1",
        authorId: "user-1",
        authorDisplayName: "User",
        channelId: "ch-1",
        channelName: "channel-ch-1",
        createdAt: new Date(Date.now() - 1000),
        content: "hello",
        _channel: channel,
      });

      const result = await deleteScannedMessages([
        makeMsg("msg-1") as never,
        makeMsg("msg-2") as never,
      ]);

      expect(result.totalDeleted).toBe(2);
      expect(result.channelBreakdown["ch-1"].count).toBe(2);
    });
  });
});
