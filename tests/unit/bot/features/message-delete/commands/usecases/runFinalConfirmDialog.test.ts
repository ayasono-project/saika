// tests/unit/bot/features/message-delete/commands/usecases/runFinalConfirmDialog.test.ts

import type { Mock } from "vitest";

const buildFinalConfirmEmbedMock = vi.fn(() => ({ _type: "final" }));
const buildFinalConfirmComponentsMock = vi.fn(() => []);
const createWarningEmbedMock = vi.fn((d: string) => ({
  _type: "warning",
  description: d,
}));
const showJumpModalMock = vi.fn();

vi.mock(
  "@/bot/features/message-delete/commands/messageDeleteEmbedBuilder",
  () => ({
    buildFinalConfirmEmbed: (...args: any[]) =>
      (buildFinalConfirmEmbedMock as (...a: any[]) => unknown)(...args),
    buildFinalConfirmComponents: (...args: any[]) =>
      (buildFinalConfirmComponentsMock as (...a: any[]) => unknown)(...args),
  }),
);

vi.mock("@/bot/utils/messageResponse", () => ({
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
  tInteraction: (
    _locale: string,
    key: string,
    params?: Record<string, unknown>,
  ) => (params ? `${key}:${JSON.stringify(params)}` : key),
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock(
  "@/bot/features/message-delete/commands/usecases/dialogUtils",
  async (importOriginal) => {
    const orig =
      await importOriginal<
        typeof import("@/bot/features/message-delete/commands/usecases/dialogUtils")
      >();
    return {
      ...orig,
      showJumpModal: (...args: any[]) => showJumpModalMock(...args),
    };
  },
);

/** Flush all pending microtasks so async handlers after `await editReply` are registered */
async function flushMicrotasks() {
  // Multiple rounds to handle chained awaits in the source
  for (let i = 0; i < 10; i++) {
    await Promise.resolve();
  }
}

function makeMockCollector() {
  const handlers: Record<string, ((...args: any[]) => Promise<void> | void)[]> =
    {};
  return {
    on: vi.fn(
      (event: string, handler: (...args: any[]) => Promise<void> | void) => {
        (handlers[event] ??= []).push(handler);
      },
    ),
    stop: vi.fn(),
    async _trigger(event: string, ...args: unknown[]) {
      const hs = handlers[event] ?? [];
      for (const h of hs) {
        await h(...args);
      }
    },
  };
}

function makeComponentInteraction(customId: string, userId = "user-1") {
  return {
    user: { id: userId },
    customId,
    locale: "en-US",
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined) as Mock,
  };
}

const MSG_DEL_CUSTOM_ID = {
  FINAL_YES: "message-delete:deletion-confirm",
  FINAL_NO: "message-delete:deletion-cancel",
  FINAL_BACK: "message-delete:deletion-back",
  FIRST: "message-delete:page-first",
  PREV: "message-delete:page-prev",
  NEXT: "message-delete:page-next",
  LAST: "message-delete:page-last",
  JUMP: "message-delete:page-jump",
};

describe("bot/features/message-delete/commands/usecases/runFinalConfirmDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loadModule() {
    return import(
      "@/bot/features/message-delete/commands/usecases/runFinalConfirmDialog"
    );
  }

  function makeBaseInteraction(
    collectorToReturn?: ReturnType<typeof makeMockCollector>,
  ) {
    const collector = collectorToReturn ?? makeMockCollector();
    const response = {
      createMessageComponentCollector: vi.fn(() => collector),
    };
    return {
      user: { id: "user-1" },
      locale: "en-US",
      editReply: vi.fn().mockResolvedValue(response) as Mock,
      followUp: vi.fn().mockResolvedValue(undefined) as Mock,
      _collector: collector,
    };
  }

  it("FINAL_YES クリック時に Confirm として解決する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const clickInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);

    // Wait for editReply to resolve and collector handlers to be set up
    await flushMicrotasks();

    await collector._trigger("collect", clickInteraction);

    const result = await promise;
    expect(result.type).toBe("confirm");
  });

  it("FINAL_NO クリック時に Cancel として解決する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const clickInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_NO,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    await collector._trigger("collect", clickInteraction);

    const result = await promise;
    expect(result.type).toBe("cancel");
  });

  it("FINAL_BACK クリック時に Back として解決する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const clickInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_BACK,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    await collector._trigger("collect", clickInteraction);

    const result = await promise;
    expect(result.type).toBe("back");
  });

  it("タイム終了時に Timeout として解決する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    // Trigger end with "time" reason
    await collector._trigger("end", new Map(), "time");

    const result = await promise;
    expect(result.type).toBe("timeout");
  });

  it("終端ボタン未押下で非タイム理由（messageDelete 等）の end イベントが来た場合も Timeout として解決する", async () => {
    // Bug fix: messageDelete / channelDelete 等で collector が終了した場合も
    // ロックを確実に解放するため Timeout として解決する
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    // End with non-time reason (e.g. messageDelete) without any terminal button clicked
    await collector._trigger("end", new Map(), "messageDelete");

    const result = await promise;
    expect(result.type).toBe("timeout");
    // タイムアウトメッセージが表示されること
    expect(baseInteraction.editReply).toHaveBeenCalledTimes(2); // initial + timeout message
  });

  it("idle タイムアウト（エフェメラル非表示）で Timeout として解決する", async () => {
    // Bug fix: エフェメラルメッセージを非表示にしても MESSAGE_DELETE は発火しないため
    // idle タイムアウトでロックを解放する
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    await collector._trigger("end", new Map(), "idle");

    const result = await promise;
    expect(result.type).toBe("timeout");
    expect(baseInteraction.editReply).toHaveBeenCalledTimes(2); // initial + timeout message
  });

  it("終端ボタン押下後の end イベントは結果を上書きしない", async () => {
    // handledByCollect フラグにより、ボタン押下後の end イベントはスキップされること
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const clickInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    // Terminal button clicked (sets handledByCollect = true internally)
    await collector._trigger("collect", clickInteraction);

    // Simulate end event fired after stop() (e.g. "user" reason from stop())
    await collector._trigger("end", new Map(), "user");

    const result = await promise;
    // confirm が保持されること（timeout に上書きされないこと）
    expect(result.type).toBe("confirm");
  });

  it("別のユーザーがクリックした場合に Ephemeral 警告を返信する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const wrongUserInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
      "wrong-user",
    );
    const rightUserInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    // Wrong user clicks
    await collector._trigger("collect", wrongUserInteraction);
    expect(wrongUserInteraction.reply).toHaveBeenCalled();

    // Right user clicks to finish
    await collector._trigger("collect", rightUserInteraction);
    await promise;
  });

  it("FIRST ページナビゲーションを処理する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const firstInteraction = makeComponentInteraction(MSG_DEL_CUSTOM_ID.FIRST);
    const confirmInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    await collector._trigger("collect", firstInteraction);
    expect(firstInteraction.update).toHaveBeenCalled();

    await collector._trigger("collect", confirmInteraction);
    await promise;
  });

  it("PREV ページナビゲーションを処理する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const prevInteraction = makeComponentInteraction(MSG_DEL_CUSTOM_ID.PREV);
    const confirmInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    await collector._trigger("collect", prevInteraction);
    await collector._trigger("collect", confirmInteraction);
    await promise;
  });

  it("NEXT ページナビゲーションを処理する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const nextInteraction = makeComponentInteraction(MSG_DEL_CUSTOM_ID.NEXT);
    const confirmInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    await collector._trigger("collect", nextInteraction);
    await collector._trigger("collect", confirmInteraction);
    await promise;
  });

  it("LAST ページナビゲーションを処理する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const lastInteraction = makeComponentInteraction(MSG_DEL_CUSTOM_ID.LAST);
    const confirmInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    await collector._trigger("collect", lastInteraction);
    await collector._trigger("collect", confirmInteraction);
    await promise;
  });

  it("有効なページ番号での JUMP を処理する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    showJumpModalMock.mockResolvedValue("2");

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const jumpInteraction = makeComponentInteraction(MSG_DEL_CUSTOM_ID.JUMP);
    const confirmInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    // 2 pages (MSG_DEL_PAGE_SIZE = 5, so 6 msgs = 2 pages)
    const msgs = Array.from({ length: 6 }, (_, i) => ({
      messageId: `msg-${i}`,
      createdAt: new Date(),
    }));

    const promise = showFinalConfirmDialog(
      baseInteraction as never,
      msgs as never,
      60000,
    );
    await flushMicrotasks();

    await collector._trigger("collect", jumpInteraction);
    await collector._trigger("collect", confirmInteraction);
    await promise;
  });

  it("JUMP でモーダルが閉じられた場合（null）の処理をする", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    showJumpModalMock.mockResolvedValue(null);

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const jumpInteraction = makeComponentInteraction(MSG_DEL_CUSTOM_ID.JUMP);
    const confirmInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    await collector._trigger("collect", jumpInteraction);
    // After null jump, editReply is called again
    expect(baseInteraction.editReply).toHaveBeenCalledTimes(2);

    await collector._trigger("collect", confirmInteraction);
    await promise;
  });

  it("無効なページ番号での JUMP を処理する", async () => {
    const { showFinalConfirmDialog } = await loadModule();

    showJumpModalMock.mockResolvedValue("not-a-number");

    const collector = makeMockCollector();
    const baseInteraction = makeBaseInteraction(collector);
    const jumpInteraction = makeComponentInteraction(MSG_DEL_CUSTOM_ID.JUMP);
    const confirmInteraction = makeComponentInteraction(
      MSG_DEL_CUSTOM_ID.FINAL_YES,
    );

    const promise = showFinalConfirmDialog(baseInteraction as never, [], 60000);
    await flushMicrotasks();

    await collector._trigger("collect", jumpInteraction);
    expect(baseInteraction.followUp).toHaveBeenCalled();

    await collector._trigger("collect", confirmInteraction);
    await promise;
  });
});
