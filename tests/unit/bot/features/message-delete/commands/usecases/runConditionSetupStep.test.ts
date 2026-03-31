// tests/unit/bot/features/message-delete/commands/usecases/runConditionSetupStep.test.ts

import { ComponentType } from "discord.js";
import type { Mock } from "vitest";

const createInfoEmbedMock = vi.fn((d: string) => ({
  _type: "info",
  description: d,
}));
const createWarningEmbedMock = vi.fn((d: string) => ({
  _type: "warning",
  description: d,
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: (d: string) => createInfoEmbedMock(d),
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

vi.mock("discord.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("discord.js")>();

  /** すべてのメソッド呼び出しで自身を返すチェーン可能なスタブ */
  function makeChainableClass() {
    return class {
      constructor() {
        const proxy: any = new Proxy(this, {
          get(_target, prop) {
            if (typeof prop === "symbol") return (_target as any)[prop];
            // あらゆるメソッド呼び出しで proxy 自身を返す
            return (..._args: unknown[]) => proxy;
          },
        });
        // eslint-disable-next-line no-constructor-return
        return proxy;
      }
    };
  }

  return {
    ...actual,
    UserSelectMenuBuilder: makeChainableClass(),
    ChannelSelectMenuBuilder: makeChainableClass(),
    ButtonBuilder: makeChainableClass(),
    ModalBuilder: makeChainableClass(),
    TextInputBuilder: makeChainableClass(),
    ActionRowBuilder: makeChainableClass(),
  };
});

/** microtask を十分フラッシュして、async ハンドラ登録を待つ */
async function flushMicrotasks() {
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

function makeInteraction(
  collectorToReturn?: ReturnType<typeof makeMockCollector>,
) {
  const collector = collectorToReturn ?? makeMockCollector();
  const message = {
    createMessageComponentCollector: vi.fn(() => collector),
  };
  return {
    user: { id: "user-1" },
    editReply: vi.fn().mockResolvedValue(message) as Mock,
    _collector: collector,
  };
}

function makeComponentInteraction(
  customId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    user: { id: "user-1" },
    customId,
    componentType: ComponentType.Button,
    values: [] as string[],
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    reply: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    awaitModalSubmit: vi.fn().mockResolvedValue(null),
    ...overrides,
  };
}

// runConditionSetupStep の条件設定 UI 操作を検証
describe("bot/features/message-delete/commands/usecases/runConditionSetupStep", () => {
  // 各テストケースでモック状態をリセットする
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loadModule() {
    return import(
      "@/bot/features/message-delete/commands/usecases/runConditionSetupStep"
    );
  }

  // UserSelectMenu でユーザーを選択し、スキャン開始ボタンで結果を返す
  describe("ユーザー選択 → スキャン開始", () => {
    it("UserSelectMenu でユーザーを選択し、スキャン開始ボタンで結果を返す", async () => {
      const { runConditionSetupStep } = await loadModule();

      const collector = makeMockCollector();
      const interaction = makeInteraction(collector);

      const promise = runConditionSetupStep(interaction as never, false);
      await flushMicrotasks();

      // ユーザー選択
      const userSelectInteraction = makeComponentInteraction(
        "message-delete:user-select",
        {
          componentType: ComponentType.UserSelect,
          values: ["user-a", "user-b"],
        },
      );
      await collector._trigger("collect", userSelectInteraction);

      // スキャン開始ボタン
      const startScanInteraction = makeComponentInteraction(
        "message-delete:scan-start",
      );
      await collector._trigger("collect", startScanInteraction);

      const result = await promise;

      expect(result).not.toBeNull();
      expect(result!.targetUserIds).toEqual(["user-a", "user-b"]);
      expect(result!.channelIds).toEqual([]);
      expect(result!.scanInteraction).toBe(startScanInteraction);
    });
  });

  // ChannelSelectMenu でチャンネルを選択し、スキャン開始ボタンで結果を返す
  describe("チャンネル選択 → スキャン開始", () => {
    it("ChannelSelectMenu でチャンネルを選択し、スキャン開始ボタンで結果を返す", async () => {
      const { runConditionSetupStep } = await loadModule();

      const collector = makeMockCollector();
      const interaction = makeInteraction(collector);

      // hasSlashCommandFilter=true でフィルタ条件を満たす
      const promise = runConditionSetupStep(interaction as never, true);
      await flushMicrotasks();

      // チャンネル選択
      const channelSelectInteraction = makeComponentInteraction(
        "message-delete:channel-select",
        {
          componentType: ComponentType.ChannelSelect,
          values: ["ch-1", "ch-2"],
        },
      );
      await collector._trigger("collect", channelSelectInteraction);

      // スキャン開始ボタン
      const startScanInteraction = makeComponentInteraction(
        "message-delete:scan-start",
      );
      await collector._trigger("collect", startScanInteraction);

      const result = await promise;

      expect(result).not.toBeNull();
      expect(result!.targetUserIds).toEqual([]);
      expect(result!.channelIds).toEqual(["ch-1", "ch-2"]);
    });
  });

  // Webhook ID 入力ボタン → モーダル送信 → webhookIds にIDが追加される
  describe("Webhook ID 入力", () => {
    it("Webhook ID 入力ボタン → モーダル送信 → webhookIds にIDが追加される", async () => {
      const { runConditionSetupStep } = await loadModule();

      const collector = makeMockCollector();
      const interaction = makeInteraction(collector);

      const promise = runConditionSetupStep(interaction as never, false);
      await flushMicrotasks();

      // Webhook ID 入力ボタン押下 → モーダル送信を模擬
      const validWebhookId = "12345678901234567";
      const modalSubmit = {
        fields: {
          getTextInputValue: vi.fn().mockReturnValue(validWebhookId),
        },
        reply: vi.fn().mockResolvedValue(undefined),
        deferUpdate: vi.fn().mockResolvedValue(undefined),
      };
      const webhookButtonInteraction = makeComponentInteraction(
        "message-delete:webhook-input",
        {
          showModal: vi.fn().mockResolvedValue(undefined),
          awaitModalSubmit: vi.fn().mockResolvedValue(modalSubmit),
        },
      );
      await collector._trigger("collect", webhookButtonInteraction);

      // スキャン開始ボタン
      const startScanInteraction = makeComponentInteraction(
        "message-delete:scan-start",
      );
      await collector._trigger("collect", startScanInteraction);

      const result = await promise;

      expect(result).not.toBeNull();
      expect(result!.targetUserIds).toContain(validWebhookId);
      expect(modalSubmit.deferUpdate).toHaveBeenCalled();
    });
  });

  // Webhook ID が不正フォーマットの場合にバリデーションエラーを返す
  describe("Webhook ID バリデーション", () => {
    it("Webhook ID が不正フォーマットの場合にバリデーションエラーを返す", async () => {
      const { runConditionSetupStep } = await loadModule();

      const collector = makeMockCollector();
      const interaction = makeInteraction(collector);

      const promise = runConditionSetupStep(interaction as never, true);
      await flushMicrotasks();

      // 不正な Webhook ID（短すぎる）
      const modalSubmit = {
        fields: {
          getTextInputValue: vi.fn().mockReturnValue("abc123"),
        },
        reply: vi.fn().mockResolvedValue(undefined),
        deferUpdate: vi.fn().mockResolvedValue(undefined),
      };
      const webhookButtonInteraction = makeComponentInteraction(
        "message-delete:webhook-input",
        {
          showModal: vi.fn().mockResolvedValue(undefined),
          awaitModalSubmit: vi.fn().mockResolvedValue(modalSubmit),
        },
      );
      await collector._trigger("collect", webhookButtonInteraction);

      // バリデーションエラーが返されること
      expect(modalSubmit.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
      expect(createWarningEmbedMock).toHaveBeenCalledWith(
        "messageDelete:user-response.webhook_invalid_format",
      );

      // スキャン開始ボタンで終了（hasSlashCommandFilter=true なのでフィルタ条件は満たされる）
      const startScanInteraction = makeComponentInteraction(
        "message-delete:scan-start",
      );
      await collector._trigger("collect", startScanInteraction);

      const result = await promise;
      // 不正な Webhook ID は追加されていないこと
      expect(result).not.toBeNull();
      expect(result!.targetUserIds).toEqual([]);
    });
  });

  // フィルタ条件なしでスキャン開始ボタン押下時に警告を返す
  describe("フィルタ条件なし警告", () => {
    it("フィルタ条件なしでスキャン開始ボタン押下時に警告を返す", async () => {
      const { runConditionSetupStep } = await loadModule();

      const collector = makeMockCollector();
      const interaction = makeInteraction(collector);

      // hasSlashCommandFilter=false, ユーザー未選択, webhook 未入力
      const promise = runConditionSetupStep(interaction as never, false);
      await flushMicrotasks();

      // フィルタなしでスキャン開始ボタン押下
      const startScanInteraction = makeComponentInteraction(
        "message-delete:scan-start",
      );
      await collector._trigger("collect", startScanInteraction);

      // 警告が表示されること
      expect(startScanInteraction.reply).toHaveBeenCalledWith(
        expect.objectContaining({ ephemeral: true }),
      );
      expect(createWarningEmbedMock).toHaveBeenCalledWith(
        "messageDelete:user-response.condition_step_no_filter",
      );

      // resolve されていないため、キャンセルで終了
      const cancelInteraction = makeComponentInteraction(
        "message-delete:condition-cancel",
      );
      await collector._trigger("collect", cancelInteraction);

      const result = await promise;
      expect(result).toBeNull();
    });
  });

  // キャンセルボタンで null を返す
  describe("キャンセル", () => {
    it("キャンセルボタンで null を返す", async () => {
      const { runConditionSetupStep } = await loadModule();

      const collector = makeMockCollector();
      const interaction = makeInteraction(collector);

      const promise = runConditionSetupStep(interaction as never, false);
      await flushMicrotasks();

      const cancelInteraction = makeComponentInteraction(
        "message-delete:condition-cancel",
      );
      await collector._trigger("collect", cancelInteraction);

      const result = await promise;

      expect(result).toBeNull();
      expect(cancelInteraction.deferUpdate).toHaveBeenCalled();
      expect(collector.stop).toHaveBeenCalledWith("cancel");
      // キャンセルメッセージが表示されること
      expect(interaction.editReply).toHaveBeenCalledTimes(2); // initial + cancel message
    });
  });

  // タイムアウトで null を返す
  describe("タイムアウト", () => {
    it("タイムアウトで null を返す", async () => {
      const { runConditionSetupStep } = await loadModule();

      const collector = makeMockCollector();
      const interaction = makeInteraction(collector);

      const promise = runConditionSetupStep(interaction as never, false);
      await flushMicrotasks();

      // end イベントをトリガー（タイムアウト）
      await collector._trigger("end", new Map(), "time");

      const result = await promise;

      expect(result).toBeNull();
      // タイムアウトメッセージが表示されること
      expect(interaction.editReply).toHaveBeenCalledTimes(2); // initial + timeout message
    });
  });

  // 実行者以外の操作は無視する
  describe("実行者以外の操作", () => {
    it("実行者以外の操作は無視する", async () => {
      const { runConditionSetupStep } = await loadModule();

      const collector = makeMockCollector();
      const interaction = makeInteraction(collector);

      const promise = runConditionSetupStep(interaction as never, true);
      await flushMicrotasks();

      // 別のユーザーがスキャン開始ボタンを押す
      const wrongUserInteraction = makeComponentInteraction(
        "message-delete:scan-start",
        { user: { id: "wrong-user" } },
      );
      await collector._trigger("collect", wrongUserInteraction);

      // deferUpdate のみが呼ばれ、resolve されないこと
      expect(wrongUserInteraction.deferUpdate).toHaveBeenCalled();

      // 正しいユーザーがスキャン開始ボタンを押して終了
      const rightUserInteraction = makeComponentInteraction(
        "message-delete:scan-start",
      );
      await collector._trigger("collect", rightUserInteraction);

      const result = await promise;
      expect(result).not.toBeNull();
    });
  });
});
