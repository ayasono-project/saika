// tests/unit/bot/features/message-delete/commands/usecases/dialogUtils.test.ts
// dialogUtils の単体テスト（applyModalFilterValue・MODAL_FILTER_CONFIG）

import type { Mock } from "vitest";

const parseDateStrMock: Mock = vi.fn();

vi.mock("@/bot/features/message-delete/services/messageDeleteService", () => ({
  parseDateStr: (...args: any[]) =>
    (parseDateStrMock as (...a: any[]) => unknown)(...args),
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

// Mock discord.js builders to avoid needing a real Discord environment
vi.mock("discord.js", async (importOriginal) => {
  const orig = await importOriginal<typeof import("discord.js")>();

  function MockClass(methods: string[]) {
    return vi.fn().mockImplementation(function (this: Record<string, unknown>) {
      for (const m of methods) {
        this[m] = vi.fn().mockReturnValue(this);
      }
    });
  }

  return {
    ...orig,
    ModalBuilder: MockClass(["setCustomId", "setTitle", "addComponents"]),
    ActionRowBuilder: MockClass(["addComponents"]),
    TextInputBuilder: MockClass([
      "setCustomId",
      "setLabel",
      "setStyle",
      "setRequired",
      "setPlaceholder",
    ]),
  };
});

describe("bot/features/message-delete/commands/usecases/dialogUtils", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function loadModule() {
    return import(
      "@/bot/features/message-delete/commands/usecases/dialogUtils"
    );
  }

  // ─────────────────────────────────────────────────────────────
  // applyModalFilterValue
  // ─────────────────────────────────────────────────────────────

  describe("applyModalFilterValue", () => {
    it("不明な customId の場合は現在のフィルターを変更せずに返す", async () => {
      const { applyModalFilterValue } = await loadModule();
      const currentFilter = { keyword: "existing" };
      const result = applyModalFilterValue(
        "unknown-id",
        "value",
        currentFilter,
        "+00:00",
      );
      expect(result.filter).toBe(currentFilter);
      expect(result.errorKey).toBeUndefined();
    });

    it("FILTER_KEYWORD で keyword を設定する", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_KEYWORD,
        "search-term",
        {},
        "+00:00",
      );
      expect(result.filter.keyword).toBe("search-term");
    });

    it("FILTER_KEYWORD に空値を指定すると keyword をクリアする", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_KEYWORD,
        "",
        { keyword: "old" },
        "+00:00",
      );
      expect(result.filter.keyword).toBeUndefined();
    });

    it("FILTER_DAYS に有効な数値を指定すると days を設定する", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_DAYS,
        "7",
        {},
        "+00:00",
      );
      expect(result.filter.days).toBe(7);
      expect(result.filter.after).toBeUndefined();
      expect(result.filter.before).toBeUndefined();
    });

    it("FILTER_DAYS に空値を指定すると days をクリアする", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_DAYS,
        "",
        { days: 7 },
        "+00:00",
      );
      expect(result.filter.days).toBeUndefined();
    });

    it("FILTER_DAYS に無効な値を指定するとエラーキーを返す", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_DAYS,
        "not-a-number",
        {},
        "+00:00",
      );
      expect(result.errorKey).toBe(
        "messageDelete:user-response.days_invalid_value",
      );
    });

    it("FILTER_DAYS にゼロまたは負の値を指定するとエラーキーを返す", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_DAYS,
        "0",
        {},
        "+00:00",
      );
      expect(result.errorKey).toBeDefined();
    });

    it("FILTER_AFTER に有効な日付を指定すると after を設定する", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const afterDate = new Date("2024-01-01T00:00:00Z");
      parseDateStrMock.mockReturnValue(afterDate);

      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_AFTER,
        "2024-01-01",
        {},
        "+00:00",
      );
      expect(result.filter.after).toBe(afterDate);
      expect((result.filter as { afterRaw?: string }).afterRaw).toBe(
        "2024-01-01",
      );
      expect(result.filter.days).toBeUndefined();
    });

    it("FILTER_AFTER に空値を指定すると after をクリアする", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_AFTER,
        "",
        { after: new Date() },
        "+00:00",
      );
      expect(result.filter.after).toBeUndefined();
    });

    it("FILTER_AFTER に無効な日付を指定するとエラーキーを返す", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      parseDateStrMock.mockReturnValue(null);

      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_AFTER,
        "invalid",
        {},
        "+00:00",
      );
      expect(result.errorKey).toBe(
        "messageDelete:user-response.after_invalid_format",
      );
    });

    it("FILTER_AFTER で after >= before となる場合にエラーキーを返す", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const afterDate = new Date("2024-01-20T00:00:00Z");
      const beforeDate = new Date("2024-01-10T00:00:00Z");
      parseDateStrMock.mockReturnValue(afterDate);

      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_AFTER,
        "2024-01-20",
        { before: beforeDate },
        "+00:00",
      );
      expect(result.errorKey).toBe(
        "messageDelete:user-response.date_range_invalid",
      );
    });

    it("FILTER_BEFORE に有効な日付を指定すると before を設定する", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const beforeDate = new Date("2024-01-31T23:59:59Z");
      parseDateStrMock.mockReturnValue(beforeDate);

      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_BEFORE,
        "2024-01-31",
        {},
        "+00:00",
      );
      expect(result.filter.before).toBe(beforeDate);
      expect((result.filter as { beforeRaw?: string }).beforeRaw).toBe(
        "2024-01-31",
      );
      expect(result.filter.days).toBeUndefined();
    });

    it("FILTER_BEFORE に空値を指定すると before をクリアする", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_BEFORE,
        "",
        { before: new Date() },
        "+00:00",
      );
      expect(result.filter.before).toBeUndefined();
    });

    it("FILTER_BEFORE に無効な日付を指定するとエラーキーを返す", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      parseDateStrMock.mockReturnValue(null);

      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_BEFORE,
        "invalid",
        {},
        "+00:00",
      );
      expect(result.errorKey).toBe(
        "messageDelete:user-response.before_invalid_format",
      );
    });

    it("FILTER_BEFORE で after >= before となる場合にエラーキーを返す", async () => {
      const { applyModalFilterValue } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );
      const afterDate = new Date("2024-01-20T00:00:00Z");
      const beforeDate = new Date("2024-01-10T00:00:00Z");
      parseDateStrMock.mockReturnValue(beforeDate);

      const result = applyModalFilterValue(
        MSG_DEL_CUSTOM_ID.FILTER_BEFORE,
        "2024-01-10",
        { after: afterDate },
        "+00:00",
      );
      expect(result.errorKey).toBe(
        "messageDelete:user-response.date_range_invalid",
      );
    });
  });

  // ─────────────────────────────────────────────────────────────
  // DIALOG_TYPE constant
  // ─────────────────────────────────────────────────────────────

  describe("DIALOG_TYPE", () => {
    it("期待する値を持つ", async () => {
      const { DIALOG_TYPE } = await loadModule();
      expect(DIALOG_TYPE.Confirm).toBe("confirm");
      expect(DIALOG_TYPE.Cancel).toBe("cancel");
      expect(DIALOG_TYPE.Timeout).toBe("timeout");
      expect(DIALOG_TYPE.Back).toBe("back");
    });
  });

  // ─────────────────────────────────────────────────────────────
  // showFilterModal — フィルターモーダル表示・入力値取得
  // ─────────────────────────────────────────────────────────────

  describe("showFilterModal", () => {
    it("モーダル送信が成功した場合にトリム済みの入力値を返す", async () => {
      const { showFilterModal, MODAL_FILTER_CONFIG } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );

      const config = MODAL_FILTER_CONFIG.get(MSG_DEL_CUSTOM_ID.FILTER_KEYWORD)!;
      const mockSubmit = {
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        fields: {
          getTextInputValue: vi.fn().mockReturnValue("  hello  "),
        },
      };
      const mockInteraction = {
        showModal: vi.fn().mockResolvedValue(undefined),
        awaitModalSubmit: vi.fn().mockResolvedValue(mockSubmit),
      };

      const result = await showFilterModal(mockInteraction as never, config);

      expect(mockInteraction.showModal).toHaveBeenCalledTimes(1);
      expect(mockSubmit.deferUpdate).toHaveBeenCalledTimes(1);
      expect(mockSubmit.fields.getTextInputValue).toHaveBeenCalledWith(
        config.inputId,
      );
      expect(result).toBe("hello");
    });

    it("モーダル送信がタイムアウトした場合に null を返す", async () => {
      const { showFilterModal, MODAL_FILTER_CONFIG } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );

      const config = MODAL_FILTER_CONFIG.get(MSG_DEL_CUSTOM_ID.FILTER_KEYWORD)!;
      const mockInteraction = {
        showModal: vi.fn().mockResolvedValue(undefined),
        awaitModalSubmit: vi.fn().mockRejectedValue(new Error("timeout")),
      };

      const result = await showFilterModal(mockInteraction as never, config);

      expect(result).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // showJumpModal — ページジャンプモーダル表示・入力値取得
  // ─────────────────────────────────────────────────────────────

  describe("showJumpModal", () => {
    it("モーダル送信が成功した場合にトリム済みの入力値を返す", async () => {
      const { showJumpModal } = await loadModule();
      const { MSG_DEL_CUSTOM_ID } = await import(
        "@/bot/features/message-delete/constants/messageDeleteConstants"
      );

      const mockSubmit = {
        deferUpdate: vi.fn().mockResolvedValue(undefined),
        fields: {
          getTextInputValue: vi.fn().mockReturnValue("  5  "),
        },
      };
      const mockInteraction = {
        showModal: vi.fn().mockResolvedValue(undefined),
        awaitModalSubmit: vi.fn().mockResolvedValue(mockSubmit),
      };

      const result = await showJumpModal(mockInteraction as never, 10);

      expect(mockInteraction.showModal).toHaveBeenCalledTimes(1);
      expect(mockSubmit.deferUpdate).toHaveBeenCalledTimes(1);
      expect(mockSubmit.fields.getTextInputValue).toHaveBeenCalledWith(
        MSG_DEL_CUSTOM_ID.MODAL_INPUT_JUMP,
      );
      expect(result).toBe("5");
    });

    it("モーダル送信がタイムアウトした場合に null を返す", async () => {
      const { showJumpModal } = await loadModule();

      const mockInteraction = {
        showModal: vi.fn().mockResolvedValue(undefined),
        awaitModalSubmit: vi.fn().mockRejectedValue(new Error("timeout")),
      };

      const result = await showJumpModal(mockInteraction as never, 10);

      expect(result).toBeNull();
    });
  });
});
