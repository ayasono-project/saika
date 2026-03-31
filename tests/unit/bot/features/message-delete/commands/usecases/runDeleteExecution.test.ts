// tests/unit/bot/features/message-delete/commands/usecases/runDeleteExecution.test.ts

import type { Mock } from "vitest";

const deleteScannedMessagesMock = vi.fn();
const buildCompletionEmbedMock = vi.fn(() => ({ _type: "completion" }));
const createErrorEmbedMock = vi.fn((d: string) => ({
  _type: "error",
  description: d,
}));
const createWarningEmbedMock = vi.fn((d: string) => ({
  _type: "warning",
  description: d,
}));

vi.mock("@/bot/features/message-delete/services/messageDeleteService", () => ({
  deleteScannedMessages: (...args: unknown[]) =>
    deleteScannedMessagesMock(...args),
}));

vi.mock(
  "@/bot/features/message-delete/commands/messageDeleteEmbedBuilder",
  () => ({
    buildCompletionEmbed: (...args: any[]) =>
      (buildCompletionEmbedMock as (...a: any[]) => unknown)(...args),
  }),
);

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: (d: string) => createErrorEmbedMock(d),
  createWarningEmbed: (d: string) => createWarningEmbedMock(d),
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
    afterTs: 0,
    beforeTs: Infinity,
    channelIds: [],
  };

function makeInteraction() {
  return {
    user: { id: "user-1" },
    locale: "ja",
    editReply: vi.fn().mockResolvedValue(undefined) as Mock,
  };
}

// executeDelete の削除実行・進捗コールバック・エラーハンドリングを検証
describe("bot/features/message-delete/commands/usecases/runDeleteExecution", () => {
  // 各テストケースでモック状態をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loadModule() {
    return import(
      "@/bot/features/message-delete/commands/usecases/runDeleteExecution"
    );
  }

  it("削除を実行して成功時に完了 embed を表示する", async () => {
    const { executeDelete } = await loadModule();

    deleteScannedMessagesMock.mockResolvedValue({
      totalDeleted: 5,
      channelBreakdown: { "ch-1": { name: "general", count: 5 } },
    });

    const interaction = makeInteraction();
    await executeDelete(interaction as never, [] as never, mockOptions);

    expect(deleteScannedMessagesMock).toHaveBeenCalled();
    expect(buildCompletionEmbedMock).toHaveBeenCalledWith("ja", 5, {
      "ch-1": { name: "general", count: 5 },
    });
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [{ _type: "completion" }],
        content: "",
        components: [],
      }),
    );
  });

  it("countSpecified=true の場合にログ出力する", async () => {
    const { executeDelete } = await loadModule();

    deleteScannedMessagesMock.mockResolvedValue({
      totalDeleted: 3,
      channelBreakdown: {},
    });

    const interaction = makeInteraction();
    await executeDelete(interaction as never, [] as never, {
      ...mockOptions,
      countSpecified: true,
      targetUserIds: ["user-2"],
      keyword: "hello",
      daysOption: 7,
    });

    expect(interaction.editReply).toHaveBeenCalled();
  });

  it("daysOption なしで afterStr/beforeStr がある場合にログ出力する", async () => {
    const { executeDelete } = await loadModule();

    deleteScannedMessagesMock.mockResolvedValue({
      totalDeleted: 3,
      channelBreakdown: {},
    });

    const interaction = makeInteraction();
    await executeDelete(interaction as never, [] as never, {
      ...mockOptions,
      afterStr: "2024-01-01",
      beforeStr: "2024-01-31",
    });

    expect(interaction.editReply).toHaveBeenCalled();
  });

  it("deleteScannedMessages が例外をスローした場合はエラー embed を表示する", async () => {
    const { executeDelete } = await loadModule();

    deleteScannedMessagesMock.mockRejectedValue(new Error("delete failed"));

    const interaction = makeInteraction();
    await executeDelete(interaction as never, [] as never, mockOptions);

    expect(createErrorEmbedMock).toHaveBeenCalled();
  });

  it("タイムアウトで削除が中断された場合は警告 embed と削除済み件数を表示する", async () => {
    const { executeDelete } = await loadModule();

    // deleteScannedMessages 内で AbortSignal を監視し、abort されたら中断する動作をシミュレート
    deleteScannedMessagesMock.mockImplementation(
      async (
        _msgs: never,
        onProgress?: (data: object) => Promise<void>,
        signal?: AbortSignal,
      ) => {
        // 進捗を報告
        if (onProgress) {
          await onProgress({
            totalDeleted: 3,
            total: 10,
            channelStatuses: [
              { channelId: "ch-1", name: "general", deleted: 3, total: 10 },
            ],
          });
        }
        // signal.abort() が呼ばれるまで待機（setTimeout の発火をシミュレート）
        await vi.advanceTimersByTimeAsync(840_001);
        // abort 後に結果を返す（実際のコードでは abort チェックで早期終了する）
        if (signal?.aborted) {
          return { totalDeleted: 3, channelBreakdown: {} };
        }
        return { totalDeleted: 10, channelBreakdown: {} };
      },
    );

    vi.useFakeTimers();

    const interaction = makeInteraction();
    await executeDelete(interaction as never, [] as never, mockOptions);

    vi.useRealTimers();

    expect(createWarningEmbedMock).toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ _type: "warning" })],
        components: [],
        content: "",
      }),
    );
  });

  it("削除中に onProgress コールバックを呼び出す", async () => {
    const { executeDelete } = await loadModule();

    deleteScannedMessagesMock.mockImplementation(
      async (
        _msgs: never,
        onProgress?: (data: object) => Promise<void>,
        _signal?: AbortSignal,
      ) => {
        if (onProgress) {
          await onProgress({
            totalDeleted: 2,
            total: 5,
            channelStatuses: [
              { channelId: "ch-1", name: "general", deleted: 2, total: 5 },
            ],
          });
        }
        return { totalDeleted: 5, channelBreakdown: {} };
      },
    );

    const interaction = makeInteraction();
    await executeDelete(interaction as never, [] as never, mockOptions);

    // Should have been called with progress content
    expect(interaction.editReply).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: [], components: [] }),
    );
  });
});
