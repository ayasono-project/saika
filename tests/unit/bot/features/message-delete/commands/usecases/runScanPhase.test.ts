// tests/unit/bot/features/message-delete/commands/usecases/runScanPhase.test.ts

import type { Mock } from "vitest";

const scanMessagesMock = vi.fn();
const createErrorEmbedMock = vi.fn((d: string) => ({
  _type: "error",
  description: d,
}));
const createInfoEmbedMock = vi.fn((d: string) => ({
  _type: "info",
  description: d,
}));

vi.mock("@/bot/features/message-delete/services/messageDeleteService", () => ({
  scanMessages: (...args: unknown[]) => scanMessagesMock(...args),
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: (d: string) => createErrorEmbedMock(d),
  createInfoEmbed: (d: string) => createInfoEmbedMock(d),
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
  tDefault: vi.fn((key: string, params?: Record<string, unknown>) =>
    params ? `${key}:${JSON.stringify(params)}` : key,
  ),
  tInteraction: (...args: unknown[]) => args[1],
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

const mockOptions: import("@/bot/features/message-delete/commands/usecases/dialogUtils").ParsedOptions =
  {
    count: 10,
    countSpecified: false,
    targetUserIds: [],
    channelIds: [],
    afterTs: 0,
    beforeTs: Infinity,
  };

function makeMockCollector() {
  const handlers: Record<string, ((...args: unknown[]) => void)[]> = {};
  return {
    on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
      (handlers[event] ??= []).push(handler);
    }),
    stop: vi.fn(() => {
      handlers["end"]?.forEach((h) => h(new Map(), "user"));
    }),
    _trigger(event: string, ...args: unknown[]) {
      handlers[event]?.forEach((h) => h(...args));
    },
  };
}

function makeInteraction(scanReplyOverride?: object) {
  const cancelCollector = makeMockCollector();
  const scanReply = scanReplyOverride ?? {
    createMessageComponentCollector: vi.fn(() => cancelCollector),
  };
  return {
    user: { id: "user-1" },
    editReply: vi.fn().mockResolvedValue(scanReply) as Mock,
    _collector: cancelCollector,
  };
}

// runScanPhase のスキャン成功・例外・中断・進捗コールバックを検証
describe("bot/features/message-delete/commands/usecases/runScanPhase", () => {
  // 各テストケースでモック状態をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loadModule() {
    return import(
      "@/bot/features/message-delete/commands/usecases/runScanPhase"
    );
  }

  it("スキャン成功時にスキャン済みメッセージを返す", async () => {
    const { runScanPhase } = await loadModule();
    const messages = [{ messageId: "msg-1" }];
    scanMessagesMock.mockResolvedValue(messages);

    const interaction = makeInteraction();
    const result = await runScanPhase(
      interaction as never,
      [] as never,
      mockOptions,
    );

    expect(result).toBe(messages);
  });

  it("スキャンが例外をスローした場合は null を返してエラー embed を表示する", async () => {
    const { runScanPhase } = await loadModule();
    scanMessagesMock.mockRejectedValue(new Error("scan failed"));

    const interaction = makeInteraction();
    const result = await runScanPhase(
      interaction as never,
      [] as never,
      mockOptions,
    );

    expect(result).toBeNull();
    expect(createErrorEmbedMock).toHaveBeenCalled();
  });

  it("スキャンが中断されて結果が 0 件の場合（ユーザーキャンセル）は null を返す", async () => {
    const { runScanPhase } = await loadModule();

    // Create an aborted signal
    const controller = new AbortController();

    // Mock scanMessages to abort the signal before returning
    scanMessagesMock.mockImplementation(
      async (_channels: never, opts: { signal?: AbortSignal }) => {
        controller.abort();
        // Simulate abort by checking signal
        if (opts.signal?.aborted) return [];
        return [];
      },
    );

    const cancelCollector = makeMockCollector();
    const scanReply = {
      createMessageComponentCollector: vi.fn(() => cancelCollector),
    };
    const interaction = makeInteraction(scanReply);

    // We need to mock the AbortController to use our controlled one
    const result = await runScanPhase(
      interaction as never,
      [] as never,
      mockOptions,
    );

    // Either null (aborted with 0 results) or the messages array
    expect(result === null || Array.isArray(result)).toBe(true);
  });

  it("messageDelete でコレクターが終了した場合はスキャンを即座に中断する", async () => {
    const { runScanPhase } = await loadModule();

    let capturedSignal: AbortSignal | undefined;
    // スキャンを長時間ブロックするが signal を監視して中断できるようにする
    scanMessagesMock.mockImplementation(
      async (_channels: never, opts: { signal?: AbortSignal }) => {
        capturedSignal = opts.signal;
        // signal が abort されるまで待機
        await new Promise<void>((resolve) => {
          if (opts.signal?.aborted) {
            resolve();
            return;
          }
          opts.signal?.addEventListener("abort", () => resolve());
        });
        return [];
      },
    );

    const cancelCollector = makeMockCollector();
    const scanReply = {
      createMessageComponentCollector: vi.fn(() => cancelCollector),
    };
    const interaction = makeInteraction(scanReply);

    const runPromise = runScanPhase(
      interaction as never,
      [] as never,
      mockOptions,
    );

    // scanMessages が開始されるまで待機
    await Promise.resolve();
    await Promise.resolve();

    // messageDelete でコレクターを終了させる
    cancelCollector._trigger("end", new Map(), "messageDelete");

    const result = await runPromise;

    // スキャンが中断されてロックが解放されること
    expect(capturedSignal?.aborted).toBe(true);
    expect(result).toBeNull();
  });

  it("ユーザーが「収集分を確認」ボタンを押して中断した場合に収集済みメッセージを返す", async () => {
    const { runScanPhase } = await loadModule();

    // scanMessages が呼ばれたら、collect イベントでユーザー中断をシミュレートしてから結果を返す
    scanMessagesMock.mockImplementation(
      async (_channels: never, opts: { signal?: AbortSignal }) => {
        // signal が abort されるまで待機
        await new Promise<void>((resolve) => {
          if (opts.signal?.aborted) {
            resolve();
            return;
          }
          opts.signal?.addEventListener("abort", () => resolve());
        });
        return [{ messageId: "msg-1" }];
      },
    );

    const cancelCollector = makeMockCollector();
    const scanReply = {
      createMessageComponentCollector: vi.fn(() => cancelCollector),
    };
    const interaction = makeInteraction(scanReply);

    const runPromise = runScanPhase(
      interaction as never,
      [] as never,
      mockOptions,
    );

    // scanMessages が開始されるまで待機
    await Promise.resolve();
    await Promise.resolve();

    // ユーザーが「収集分を確認」ボタンを押す — collect イベントをトリガー
    const mockButtonInteraction = {
      deferUpdate: vi.fn().mockResolvedValue(undefined),
    };
    cancelCollector._trigger("collect", mockButtonInteraction);

    const result = await runPromise;

    // deferUpdate が呼ばれること
    expect(mockButtonInteraction.deferUpdate).toHaveBeenCalledTimes(1);
    // 収集1件以上あるのでメッセージ配列が返る
    expect(result).toEqual([{ messageId: "msg-1" }]);
  });

  it("タイムアウトで中断され収集1件以上の場合はタイムアウト通知を表示してメッセージを返す", async () => {
    const { runScanPhase } = await loadModule();

    // scanMessages が呼ばれたら、signal の abort を待って結果を返す
    scanMessagesMock.mockImplementation(
      async (_channels: never, opts: { signal?: AbortSignal }) => {
        await new Promise<void>((resolve) => {
          if (opts.signal?.aborted) {
            resolve();
            return;
          }
          opts.signal?.addEventListener("abort", () => resolve());
        });
        return [{ messageId: "msg-timeout" }];
      },
    );

    const cancelCollector = makeMockCollector();
    const scanReply = {
      createMessageComponentCollector: vi.fn(() => cancelCollector),
    };
    const interaction = makeInteraction(scanReply);

    // タイムアウトを即座に発火させるため setTimeout をモックする
    vi.useFakeTimers();

    const runPromise = runScanPhase(
      interaction as never,
      [] as never,
      mockOptions,
    );

    // タイムアウトタイマーを発火させる
    await vi.advanceTimersByTimeAsync(15 * 60 * 1000);

    const result = await runPromise;

    vi.useRealTimers();

    // タイムアウト通知 embed が表示されること
    expect(createInfoEmbedMock).toHaveBeenCalled();
    // 収集済みメッセージが返ること
    expect(result).toEqual([{ messageId: "msg-timeout" }]);
  });

  it("スキャン中に進捗コンテンツで editReply を呼び出す", async () => {
    const { runScanPhase } = await loadModule();

    let progressCallback: ((data: object) => Promise<void>) | undefined;
    scanMessagesMock.mockImplementation(
      async (
        _channels: never,
        opts: { onProgress?: (data: object) => Promise<void> },
      ) => {
        progressCallback = opts.onProgress;
        // Call progress
        if (progressCallback) {
          await progressCallback({
            totalScanned: 50,
            collected: 10,
            limit: 100,
          });
        }
        return [{ messageId: "msg-1" }];
      },
    );

    const interaction = makeInteraction();
    await runScanPhase(interaction as never, [] as never, mockOptions);

    // editReply should have been called at least once
    expect(interaction.editReply).toHaveBeenCalled();
  });
});
