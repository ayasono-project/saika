// tests/integration/bot/features/message-delete/services/messageDeleteService.integration.test.ts
/**
 * MessageDeleteService Integration Tests
 * scanMessages → deleteScannedMessages の統合テスト
 * ユニットテストと異なり、複数チャンネルの k-way マージ・スキャン結果を使った削除パイプライン・
 * 混合削除戦略（bulk + individual）の協調動作を検証する
 */

import { Collection } from "discord.js";
import type { Mock } from "vitest";
import {
  MSG_DEL_BULK_MAX_AGE_MS,
  MSG_DEL_FETCH_BATCH_SIZE,
} from "@/bot/features/message-delete/constants/messageDeleteConstants";

// Logger のモック
vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// i18n のモック
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
  tInteraction: (...args: unknown[]) => args[1],
}));

// ── ヘルパー ──

/** Discord.js Collection を配列から生成する */
function makeCollection<T extends { id: string }>(msgs: T[]) {
  const col = new Collection<string, T>();
  for (const m of msgs) col.set(m.id, m);
  return col;
}

/** テスト用メッセージオブジェクトを生成する */
function makeMessage(
  id: string,
  authorId: string,
  content: string,
  createdTimestamp: number,
  opts: {
    webhookId?: string;
    attachments?: number;
    embeds?: { title?: string }[];
  } = {},
) {
  return {
    id,
    author: { id: authorId, displayName: `display-${authorId}` },
    webhookId: opts.webhookId ?? null,
    content,
    createdTimestamp,
    createdAt: new Date(createdTimestamp),
    member: null,
    attachments: { size: opts.attachments ?? 0 },
    embeds: opts.embeds ?? [],
  };
}

/** テスト用チャンネルの型 */
interface MockChannel {
  id: string;
  name: string;
  guildId: string;
  guild: { members: { me: { displayName: string } } };
  permissionsFor: Mock;
  messages: { fetch: Mock; delete: Mock };
  bulkDelete?: Mock;
}

/** テスト用チャンネルを生成する（bulkDelete あり/なし、権限あり/なし） */
function makeChannel(
  id: string,
  opts: {
    hasPermission?: boolean;
    hasBulkDelete?: boolean;
    deleteMock?: Mock;
    bulkDeleteMock?: Mock;
  } = {},
): MockChannel {
  const hasPermission = opts.hasPermission ?? true;
  const channel: MockChannel = {
    id,
    name: `ch-${id}`,
    guildId: "guild-1",
    guild: {
      members: { me: { displayName: "Bot" } },
    },
    permissionsFor: vi.fn(() => ({ has: vi.fn(() => hasPermission) })),
    messages: {
      fetch: vi.fn().mockResolvedValue(makeCollection([])) as Mock,
      delete: opts.deleteMock ?? (vi.fn().mockResolvedValue(undefined) as Mock),
    },
  };
  if (opts.hasBulkDelete !== false) {
    channel.bulkDelete =
      opts.bulkDeleteMock ??
      (vi
        .fn()
        .mockImplementation((ids: string[]) =>
          makeCollection(ids.map((msgId) => ({ id: msgId }))),
        ) as Mock);
  }
  return channel;
}

describe("MessageDeleteService Integration", () => {
  // scanMessages と deleteScannedMessages の統合フローを検証する

  const fixedNow = new Date("2026-03-15T12:00:00.000Z").getTime();
  let originalSetTimeout: typeof globalThis.setTimeout;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Date, "now").mockReturnValue(fixedNow);
    // サービス内の sleep() を即時解決にする（setTimeout を 0ms に差し替え）
    originalSetTimeout = globalThis.setTimeout;
    globalThis.setTimeout = ((fn: () => void) =>
      originalSetTimeout(fn, 0)) as never;
  });

  afterEach(() => {
    globalThis.setTimeout = originalSetTimeout;
    vi.restoreAllMocks();
  });

  async function loadModule() {
    return import(
      "@/bot/features/message-delete/services/messageDeleteService"
    );
  }

  describe("複数チャンネル k-way マージスキャン", () => {
    it("2つのチャンネルから新しい順にメッセージをマージして収集すること", async () => {
      const { scanMessages } = await loadModule();
      const now = Date.now();

      // ch-A: t=now-1000, t=now-3000
      // ch-B: t=now-500,  t=now-2000
      // 期待順: B(now-500) → A(now-1000) → B(now-2000) → A(now-3000)
      const chA = makeChannel("ch-A");
      (chA.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("a1", "user-1", "A-1", now - 1000),
            makeMessage("a2", "user-1", "A-2", now - 3000),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      const chB = makeChannel("ch-B");
      (chB.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("b1", "user-2", "B-1", now - 500),
            makeMessage("b2", "user-2", "B-2", now - 2000),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([chA as never, chB as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(4);
      expect(result.map((m) => m.messageId)).toEqual(["b1", "a1", "b2", "a2"]);
    });

    it("3つのチャンネルから指定件数まで新しい順にマージすること", async () => {
      const { scanMessages } = await loadModule();
      const now = Date.now();

      const chA = makeChannel("ch-A");
      (chA.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([makeMessage("a1", "u1", "A", now - 100)]),
        )
        .mockResolvedValue(makeCollection([]));

      const chB = makeChannel("ch-B");
      (chB.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([makeMessage("b1", "u2", "B", now - 200)]),
        )
        .mockResolvedValue(makeCollection([]));

      const chC = makeChannel("ch-C");
      (chC.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([makeMessage("c1", "u3", "C", now - 50)]),
        )
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages(
        [chA as never, chB as never, chC as never],
        {
          count: 2,
          targetUserIds: [],
          afterTs: 0,
          beforeTs: Infinity,
          locale: "ja",
        },
      );

      expect(result).toHaveLength(2);
      // C(now-50) → A(now-100) の順で2件
      expect(result.map((m) => m.messageId)).toEqual(["c1", "a1"]);
    });

    it("権限のないチャンネルをスキップして残りのチャンネルからスキャンすること", async () => {
      const { scanMessages } = await loadModule();
      const now = Date.now();

      const chGood = makeChannel("ch-good");
      (chGood.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([makeMessage("g1", "u1", "good", now - 100)]),
        )
        .mockResolvedValue(makeCollection([]));

      const chBad = makeChannel("ch-bad", { hasPermission: false });

      const result = await scanMessages([chGood as never, chBad as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(1);
      expect(result[0].channelId).toBe("ch-good");
    });
  });

  describe("日付範囲フィルタリング", () => {
    it("afterTs 以降のメッセージのみを収集すること", async () => {
      const { scanMessages } = await loadModule();
      const now = Date.now();

      const ch = makeChannel("ch-1");
      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("m1", "u1", "new", now - 1000),
            makeMessage("m2", "u1", "old", now - 100_000),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: [],
        afterTs: now - 50_000,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("m1");
    });

    it("afterTs と beforeTs の両方を指定して範囲内のメッセージのみを収集すること", async () => {
      const { scanMessages } = await loadModule();
      const now = Date.now();

      // beforeTs は Discord API の `before` Snowflake として渡される
      // モックでは before パラメータを受け取った時点で「それ以前」のメッセージのみ返す
      const ch = makeChannel("ch-1");
      (ch.messages.fetch as Mock).mockImplementation(
        async (opts: { before?: string }) => {
          if (opts.before) {
            // before 指定あり → beforeTs より古いメッセージのみ返す
            return makeCollection([
              makeMessage("m-in-range", "u1", "in range", now - 50_000),
              makeMessage("m-too-old", "u1", "too old", now - 200_000),
            ]);
          }
          return makeCollection([]);
        },
      );

      const result = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: [],
        afterTs: now - 100_000,
        beforeTs: now - 10_000,
        locale: "ja",
      });

      // afterTs(now-100_000) ～ beforeTs(now-10_000) の範囲: m-in-range のみ
      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("m-in-range");
    });
  });

  describe("複合フィルタリング（ユーザー + キーワード + 日付）", () => {
    it("全フィルタを同時適用して条件に合致するメッセージのみ収集すること", async () => {
      const { scanMessages } = await loadModule();
      const now = Date.now();

      const ch = makeChannel("ch-1");
      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("m1", "user-A", "hello world", now - 1000),
            makeMessage("m2", "user-B", "hello world", now - 2000),
            makeMessage("m3", "user-A", "goodbye", now - 3000),
            makeMessage("m4", "user-A", "hello world", now - 500_000),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: ["user-A"],
        keyword: "hello",
        afterTs: now - 100_000,
        beforeTs: Infinity,
        locale: "ja",
      });

      // user-A + keyword "hello" + afterTs 内 → m1 のみ
      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("m1");
    });
  });

  describe("バッファリフィルを伴うスキャン", () => {
    it("初回バッチで足りない場合に追加フェッチしてマージを継続すること", async () => {
      const { scanMessages } = await loadModule();
      const now = Date.now();

      // MSG_DEL_FETCH_BATCH_SIZE(100) 件返すと exhausted=false → リフィル発生
      const batch1 = Array.from({ length: MSG_DEL_FETCH_BATCH_SIZE }, (_, i) =>
        makeMessage(`a-${i}`, "u1", `msg-${i}`, now - (i + 1) * 1000),
      );
      const batch2 = [
        makeMessage(
          "a-extra",
          "u1",
          "extra",
          now - (MSG_DEL_FETCH_BATCH_SIZE + 1) * 1000,
        ),
      ];

      const ch = makeChannel("ch-A");
      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection(batch1))
        .mockResolvedValueOnce(makeCollection(batch2))
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([ch as never], {
        count: MSG_DEL_FETCH_BATCH_SIZE + 1,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(result).toHaveLength(MSG_DEL_FETCH_BATCH_SIZE + 1);
      expect(result[result.length - 1].messageId).toBe("a-extra");
    });
  });

  describe("スキャン → 削除パイプライン", () => {
    it("スキャン結果をそのまま deleteScannedMessages に渡して削除が完了すること", async () => {
      const { scanMessages, deleteScannedMessages } = await loadModule();
      const now = Date.now();

      const bulkDeleteMock = vi
        .fn()
        .mockImplementation((ids: string[]) =>
          makeCollection(ids.map((id) => ({ id }))),
        );
      const ch = makeChannel("ch-1", { bulkDeleteMock });

      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("m1", "u1", "hello", now - 1000),
            makeMessage("m2", "u2", "world", now - 2000),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      // Phase 1: スキャン
      const scanned = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(scanned).toHaveLength(2);

      // Phase 2: 削除
      const result = await deleteScannedMessages(scanned);

      expect(result.totalDeleted).toBe(2);
      expect(result.channelBreakdown["ch-1"]).toEqual({
        name: "ch-ch-1",
        count: 2,
      });
      expect(bulkDeleteMock).toHaveBeenCalledTimes(1);
    });

    it("スキャン結果から一部を除外してから削除できること", async () => {
      const { scanMessages, deleteScannedMessages } = await loadModule();
      const now = Date.now();

      const bulkDeleteMock = vi
        .fn()
        .mockImplementation((ids: string[]) =>
          makeCollection(ids.map((id) => ({ id }))),
        );
      const ch = makeChannel("ch-1", { bulkDeleteMock });

      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("m1", "u1", "keep", now - 1000),
            makeMessage("m2", "u2", "delete", now - 2000),
            makeMessage("m3", "u1", "delete", now - 3000),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      const scanned = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      // m1 を除外（プレビュー画面の除外機能を模倣）
      const excludedIds = new Set(["m1"]);
      const toDelete = scanned.filter((m) => !excludedIds.has(m.messageId));

      const result = await deleteScannedMessages(toDelete);

      expect(result.totalDeleted).toBe(2);
    });
  });

  describe("混合削除戦略（bulk + individual）", () => {
    it("14日以内のメッセージは bulkDelete、14日超のメッセージは個別削除を使うこと", async () => {
      const { scanMessages, deleteScannedMessages } = await loadModule();
      const now = Date.now();

      const newTs = now - 1000; // 14日以内
      const oldTs = now - MSG_DEL_BULK_MAX_AGE_MS - 10_000; // 14日超

      const individualDeleteMock = vi.fn().mockResolvedValue(undefined);
      const bulkDeleteMock = vi
        .fn()
        .mockImplementation((ids: string[]) =>
          makeCollection(ids.map((id) => ({ id }))),
        );

      const ch = makeChannel("ch-1", {
        bulkDeleteMock,
        deleteMock: individualDeleteMock,
      });

      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("new-msg", "u1", "new", newTs),
            makeMessage("old-msg", "u1", "old", oldTs),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      const scanned = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      const result = await deleteScannedMessages(scanned);

      expect(result.totalDeleted).toBe(2);
      // bulkDelete は14日以内のメッセージに対して呼ばれる
      expect(bulkDeleteMock).toHaveBeenCalledWith(["new-msg"], true);
      // 個別削除は14日超のメッセージに対して呼ばれる
      expect(individualDeleteMock).toHaveBeenCalledWith("old-msg");
    });

    it("bulkDelete 非対応チャンネルでは全メッセージを個別削除すること", async () => {
      const { scanMessages, deleteScannedMessages } = await loadModule();
      const now = Date.now();

      const individualDeleteMock = vi.fn().mockResolvedValue(undefined);
      const ch = makeChannel("ch-1", {
        hasBulkDelete: false,
        deleteMock: individualDeleteMock,
      });

      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("m1", "u1", "msg1", now - 1000),
            makeMessage("m2", "u1", "msg2", now - 2000),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      const scanned = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      const result = await deleteScannedMessages(scanned);

      expect(result.totalDeleted).toBe(2);
      expect(individualDeleteMock).toHaveBeenCalledTimes(2);
    });
  });

  describe("複数チャンネルのスキャン → 削除", () => {
    it("複数チャンネルからスキャンしたメッセージをチャンネル別に正しく削除すること", async () => {
      const { scanMessages, deleteScannedMessages } = await loadModule();
      const now = Date.now();

      const bulkA = vi
        .fn()
        .mockImplementation((ids: string[]) =>
          makeCollection(ids.map((id) => ({ id }))),
        );
      const bulkB = vi
        .fn()
        .mockImplementation((ids: string[]) =>
          makeCollection(ids.map((id) => ({ id }))),
        );

      const chA = makeChannel("ch-A", { bulkDeleteMock: bulkA });
      const chB = makeChannel("ch-B", { bulkDeleteMock: bulkB });

      (chA.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("a1", "u1", "A1", now - 1000),
            makeMessage("a2", "u1", "A2", now - 3000),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      (chB.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([makeMessage("b1", "u2", "B1", now - 2000)]),
        )
        .mockResolvedValue(makeCollection([]));

      const scanned = await scanMessages([chA as never, chB as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      expect(scanned).toHaveLength(3);

      const result = await deleteScannedMessages(scanned);

      expect(result.totalDeleted).toBe(3);
      expect(result.channelBreakdown["ch-A"]).toEqual({
        name: "ch-ch-A",
        count: 2,
      });
      expect(result.channelBreakdown["ch-B"]).toEqual({
        name: "ch-ch-B",
        count: 1,
      });
      // 各チャンネルの bulkDelete が呼ばれている
      expect(bulkA).toHaveBeenCalledWith(["a1", "a2"], true);
      expect(bulkB).toHaveBeenCalledWith(["b1"], true);
    });
  });

  describe("キャンセル（AbortSignal）", () => {
    it("スキャン中に abort されるとそれまでの結果を返すこと", async () => {
      const { scanMessages } = await loadModule();
      const now = Date.now();

      const controller = new AbortController();

      const ch = makeChannel("ch-1");
      // 初回バッチで100件返し、リフィルを誘発する前に abort
      const batch = Array.from({ length: MSG_DEL_FETCH_BATCH_SIZE }, (_, i) =>
        makeMessage(`m-${i}`, "u1", `msg`, now - (i + 1) * 1000),
      );
      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(makeCollection(batch))
        .mockImplementation(async () => {
          // リフィル時に abort
          controller.abort();
          return makeCollection([]);
        });

      const result = await scanMessages([ch as never], {
        count: 200,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        signal: controller.signal,
        locale: "ja",
      });

      // 初回バッチの100件は収集済み
      expect(result).toHaveLength(MSG_DEL_FETCH_BATCH_SIZE);
    });

    it("削除中に abort されると途中までの結果を返すこと", async () => {
      const { scanMessages, deleteScannedMessages } = await loadModule();
      const now = Date.now();

      const controller = new AbortController();
      const bulkDeleteMock = vi.fn().mockImplementation((ids: string[]) => {
        // 最初のバッチ処理後に abort
        controller.abort();
        return makeCollection(ids.map((id) => ({ id })));
      });

      const chA = makeChannel("ch-A", { bulkDeleteMock });
      const chB = makeChannel("ch-B");

      (chA.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([makeMessage("a1", "u1", "A", now - 1000)]),
        )
        .mockResolvedValue(makeCollection([]));

      (chB.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([makeMessage("b1", "u2", "B", now - 2000)]),
        )
        .mockResolvedValue(makeCollection([]));

      const scanned = await scanMessages([chA as never, chB as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      const result = await deleteScannedMessages(
        scanned,
        undefined,
        controller.signal,
      );

      // ch-A のメッセージは削除されたが、ch-B は abort で中断
      expect(result.totalDeleted).toBe(1);
      expect(result.channelBreakdown["ch-A"]).toEqual({
        name: "ch-ch-A",
        count: 1,
      });
    });
  });

  describe("進捗レポート", () => {
    it("スキャンと削除の両方で進捗コールバックが呼ばれること", async () => {
      const { scanMessages, deleteScannedMessages } = await loadModule();
      const now = Date.now();

      const scanProgress = vi.fn().mockResolvedValue(undefined);
      const deleteProgress = vi.fn().mockResolvedValue(undefined);

      const bulkDeleteMock = vi
        .fn()
        .mockImplementation((ids: string[]) =>
          makeCollection(ids.map((id) => ({ id }))),
        );
      const ch = makeChannel("ch-1", { bulkDeleteMock });

      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([makeMessage("m1", "u1", "hello", now - 1000)]),
        )
        .mockResolvedValue(makeCollection([]));

      const scanned = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        onProgress: scanProgress,
        locale: "ja",
      });

      await deleteScannedMessages(scanned, deleteProgress);

      expect(scanProgress).toHaveBeenCalled();
      expect(deleteProgress).toHaveBeenCalled();

      // スキャン進捗の形式を確認
      const scanCall = scanProgress.mock.calls[0][0];
      expect(scanCall).toHaveProperty("totalScanned");
      expect(scanCall).toHaveProperty("collected");
      expect(scanCall).toHaveProperty("limit");

      // 削除進捗の形式を確認
      const deleteCall = deleteProgress.mock.calls[0][0];
      expect(deleteCall).toHaveProperty("totalDeleted");
      expect(deleteCall).toHaveProperty("total");
      expect(deleteCall).toHaveProperty("channelStatuses");
    });
  });

  describe("削除エラーのハンドリング", () => {
    it("個別削除で一部が失敗しても他のメッセージの削除は継続すること", async () => {
      const { scanMessages, deleteScannedMessages } = await loadModule();
      const now = Date.now();
      const oldTs = now - MSG_DEL_BULK_MAX_AGE_MS - 10_000;

      const deleteMock = vi
        .fn()
        .mockResolvedValueOnce(undefined) // m1: 成功
        .mockRejectedValueOnce(new Error("Not found")) // m2: 失敗
        .mockResolvedValueOnce(undefined); // m3: 成功

      const ch = makeChannel("ch-1", { deleteMock });

      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            makeMessage("m1", "u1", "msg1", oldTs - 1000),
            makeMessage("m2", "u1", "msg2", oldTs - 2000),
            makeMessage("m3", "u1", "msg3", oldTs - 3000),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      const scanned = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: [],
        afterTs: 0,
        beforeTs: Infinity,
        locale: "ja",
      });

      const result = await deleteScannedMessages(scanned);

      // m2 の失敗分を除いて2件削除
      expect(result.totalDeleted).toBe(2);
      expect(result.channelBreakdown["ch-1"].count).toBe(2);
    });
  });

  describe("parseDateStr の統合動作", () => {
    it("parseDateStr で解釈した afterTs/beforeTs をスキャンに反映できること", async () => {
      const { scanMessages, parseDateStr } = await loadModule();
      const now = Date.now();

      const afterDate = parseDateStr("2026-03-14", false, "+09:00");
      const beforeDate = parseDateStr("2026-03-15", true, "+09:00");

      expect(afterDate).not.toBeNull();
      expect(beforeDate).not.toBeNull();

      const ch = makeChannel("ch-1");
      // afterDate(2026-03-13T15:00:00Z) ～ beforeDate(2026-03-15T14:59:59Z) の範囲
      (ch.messages.fetch as Mock)
        .mockResolvedValueOnce(
          makeCollection([
            // 範囲内: 2026-03-15T12:00:00Z（now）
            makeMessage("in-range", "u1", "in", now),
            // 範囲外: 2026-03-13T00:00:00Z
            makeMessage(
              "out-range",
              "u1",
              "out",
              new Date("2026-03-13T00:00:00Z").getTime(),
            ),
          ]),
        )
        .mockResolvedValue(makeCollection([]));

      const result = await scanMessages([ch as never], {
        count: 10,
        targetUserIds: [],
        afterTs: afterDate!.getTime(),
        beforeTs: beforeDate!.getTime(),
        locale: "ja",
      });

      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("in-range");
    });
  });
});
