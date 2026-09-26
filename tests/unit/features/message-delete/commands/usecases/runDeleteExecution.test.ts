import type { Mock } from "vitest";

const deleteScannedMessagesMock = vi.fn();
const buildCompletionEmbedMock = vi.fn(() => ({ _type: "completion" }));
const buildDeleteProgressContentMock = vi.fn(() => "progress-content");
const createErrorEmbedMock = vi.fn((d: string) => ({
  _type: "error",
  description: d,
}));
const createWarningEmbedMock = vi.fn((d: string) => ({
  _type: "warning",
  description: d,
}));

vi.mock("@/features/message-delete/services/messageDeleteService", () => ({
  deleteScannedMessages: (...args: unknown[]) =>
    deleteScannedMessagesMock(...args),
}));

vi.mock("@/features/message-delete/commands/messageDeleteEmbedBuilder", () => ({
  buildCompletionEmbed: (...args: any[]) =>
    (buildCompletionEmbedMock as (...a: any[]) => unknown)(...args),
  buildDeleteProgressContent: (...args: any[]) =>
    (buildDeleteProgressContentMock as (...a: any[]) => unknown)(...args),
}));

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
  // 表示した件数を検証できるよう、パラメータも文字列に含める
  tInteraction: (
    _locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => (params ? `${key}:${JSON.stringify(params)}` : key),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { logger } from "@/shared/utils/logger";

const mockOptions: import("@/features/message-delete/commands/usecases/dialogUtils").ParsedOptions =
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
      "@/features/message-delete/commands/usecases/runDeleteExecution"
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
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("messageDelete:log.deleted"),
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

  it("タイムアウトで削除が中断された場合は、削除で実際に消えた件数を警告 embed で表示し、削除ログも残す", async () => {
    const { executeDelete } = await loadModule();

    // deleteScannedMessages 内で AbortSignal を監視し、abort されたら中断する動作をシミュレート
    deleteScannedMessagesMock.mockImplementation(
      async (
        _msgs: never,
        onProgress?: (data: object) => Promise<void>,
        signal?: AbortSignal,
      ) => {
        // 進捗はスロットリングされるため、最後に表示された件数（2件）は実際の件数より少ないことがある
        if (onProgress) {
          await onProgress({
            totalDeleted: 2,
            total: 10,
            channelStatuses: [
              { channelId: "ch-1", name: "general", deleted: 2, total: 10 },
            ],
          });
        }
        // signal.abort() が呼ばれるまで待機（setTimeout の発火をシミュレート）
        await vi.advanceTimersByTimeAsync(840_001);
        // abort 後に結果を返す（実際のコードでは abort チェックで早期終了する）
        if (signal?.aborted) {
          return {
            totalDeleted: 3,
            channelBreakdown: { "ch-1": { name: "general", count: 3 } },
          };
        }
        return { totalDeleted: 10, channelBreakdown: {} };
      },
    );

    vi.useFakeTimers();

    const interaction = makeInteraction();
    await executeDelete(interaction as never, [] as never, mockOptions);

    vi.useRealTimers();

    expect(createWarningEmbedMock).toHaveBeenCalledWith(
      'messageDelete:user-response.delete_timed_out:{"count":3}',
    );
    expect(interaction.editReply).toHaveBeenLastCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ _type: "warning" })],
        components: [],
        content: "",
      }),
    );
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining('"count":3'),
    );
    expect(buildCompletionEmbedMock).not.toHaveBeenCalled();
  });

  it("削除中に onProgress コールバックを呼び出し、進捗表示の content を表示する", async () => {
    const { executeDelete } = await loadModule();

    const progress = {
      totalDeleted: 2,
      total: 5,
      channelStatuses: [
        { channelId: "ch-1", name: "general", deleted: 2, total: 5 },
      ],
    };
    deleteScannedMessagesMock.mockImplementation(
      async (
        _msgs: never,
        onProgress?: (data: object) => Promise<void>,
        _signal?: AbortSignal,
      ) => {
        if (onProgress) {
          await onProgress(progress);
        }
        return { totalDeleted: 5, channelBreakdown: {} };
      },
    );

    const interaction = makeInteraction();
    await executeDelete(interaction as never, [] as never, mockOptions);

    expect(buildDeleteProgressContentMock).toHaveBeenCalledWith("ja", progress);
    expect(interaction.editReply).toHaveBeenCalledWith({
      content: "progress-content",
      embeds: [],
      components: [],
    });
  });

  // ── 表示の失敗を削除の失敗にしない ──

  it("進捗表示の更新に失敗しても削除を止めず、完了表示まで進む", async () => {
    const { executeDelete } = await loadModule();

    const progressResults: unknown[] = [];
    deleteScannedMessagesMock.mockImplementation(
      async (_msgs: never, onProgress?: (data: object) => Promise<void>) => {
        // 進捗の表示に失敗しても、コールバックは reject せず削除を続けられること
        progressResults.push(
          await onProgress?.({
            totalDeleted: 0,
            total: 1,
            channelStatuses: [],
          }),
        );
        return { totalDeleted: 1, channelBreakdown: {} };
      },
    );

    const interaction = makeInteraction();
    interaction.editReply
      .mockRejectedValueOnce(new Error("Invalid Form Body"))
      .mockResolvedValue(undefined);
    await executeDelete(interaction as never, [] as never, mockOptions);

    expect(progressResults).toEqual([undefined]);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("messageDelete:log.progress_display_failed"),
    );
    expect(createErrorEmbedMock).not.toHaveBeenCalled();
    expect(interaction.editReply).toHaveBeenLastCalledWith(
      expect.objectContaining({ embeds: [{ _type: "completion" }] }),
    );
  });

  it("削除後の完了表示の送信に失敗しても「削除に失敗」を出さず、削除ログは残す", async () => {
    const { executeDelete } = await loadModule();

    deleteScannedMessagesMock.mockResolvedValue({
      totalDeleted: 4,
      channelBreakdown: { "ch-1": { name: "general", count: 4 } },
    });

    const interaction = makeInteraction();
    interaction.editReply.mockRejectedValue(new Error("Unknown Webhook"));
    await executeDelete(interaction as never, [] as never, mockOptions);

    expect(createErrorEmbedMock).not.toHaveBeenCalled();
    expect(logger.error).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("messageDelete:log.deleted"),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("messageDelete:log.result_display_failed"),
    );
  });

  it("完了 Embed の組み立てが例外になっても「削除に失敗」を出さず、削除ログは残す", async () => {
    const { executeDelete } = await loadModule();

    deleteScannedMessagesMock.mockResolvedValue({
      totalDeleted: 4,
      channelBreakdown: { "ch-1": { name: "general", count: 4 } },
    });
    buildCompletionEmbedMock.mockImplementationOnce(() => {
      throw new Error("Received one or more errors");
    });

    const interaction = makeInteraction();
    await executeDelete(interaction as never, [] as never, mockOptions);

    expect(createErrorEmbedMock).not.toHaveBeenCalled();
    expect(interaction.editReply).not.toHaveBeenCalled();
    expect(logger.info).toHaveBeenCalledWith(
      expect.stringContaining("messageDelete:log.deleted"),
    );
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining("messageDelete:log.result_display_failed"),
    );
  });
});
