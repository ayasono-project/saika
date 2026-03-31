// tests/unit/bot/features/message-delete/commands/messageDeleteEmbedBuilder.test.ts
// messageDeleteEmbedBuilder の単体テスト

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

import type {
  MessageDeleteFilter,
  ScannedMessage,
} from "@/bot/features/message-delete/constants/messageDeleteConstants";

function makeMsg(
  id: string,
  authorId = "user-1",
  channelId = "ch-1",
  createdAt = new Date("2024-01-01T00:00:00Z"),
): ScannedMessage {
  return {
    messageId: id,
    guildId: "guild-1",
    authorId,
    authorDisplayName: `User ${authorId}`,
    channelId,
    channelName: "general",
    createdAt,
    content: `content of ${id}`,
  };
}

// messageDeleteEmbedBuilder の各ビルダー関数（フィルタリング・プレビュー・最終確認・完了・条件 embed）を検証
describe("bot/features/message-delete/commands/messageDeleteEmbedBuilder", () => {
  async function loadModule() {
    return import(
      "@/bot/features/message-delete/commands/messageDeleteEmbedBuilder"
    );
  }

  // ─────────────────────────────────────────────────────────────
  // buildFilteredMessages
  // ─────────────────────────────────────────────────────────────

  // authorId・keyword・days・after・before の各フィルター条件とその組み合わせを検証
  describe("buildFilteredMessages", () => {
    it("フィルターが空の場合はすべてのメッセージを返す", async () => {
      const { buildFilteredMessages } = await loadModule();
      const msgs = [makeMsg("msg-1"), makeMsg("msg-2")];
      const result = buildFilteredMessages(msgs, {});
      expect(result).toHaveLength(2);
    });

    it("authorId でフィルタリングする", async () => {
      const { buildFilteredMessages } = await loadModule();
      const msgs = [makeMsg("msg-1", "user-1"), makeMsg("msg-2", "user-2")];
      const result = buildFilteredMessages(msgs, { authorId: "user-1" });
      expect(result).toHaveLength(1);
      expect(result[0].authorId).toBe("user-1");
    });

    it("keyword で大文字小文字を区別せずフィルタリングする", async () => {
      const { buildFilteredMessages } = await loadModule();
      const msgs = [makeMsg("msg-1"), makeMsg("msg-2")];
      msgs[0].content = "Hello World";
      msgs[1].content = "foo bar";
      const result = buildFilteredMessages(msgs, { keyword: "hello" });
      expect(result).toHaveLength(1);
    });

    it("days で直近のメッセージのみフィルタリングする", async () => {
      const { buildFilteredMessages } = await loadModule();
      const now = Date.now();
      const recent = makeMsg("msg-1", "user-1", "ch-1", new Date(now - 1000));
      const old = makeMsg(
        "msg-2",
        "user-1",
        "ch-1",
        new Date(now - 10 * 24 * 60 * 60 * 1000),
      );
      const result = buildFilteredMessages([recent, old], { days: 3 });
      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("msg-1");
    });

    it("after 日付でフィルタリングする", async () => {
      const { buildFilteredMessages } = await loadModule();
      const after = new Date("2024-01-10T00:00:00Z");
      const msgs = [
        makeMsg("msg-1", "user-1", "ch-1", new Date("2024-01-15T00:00:00Z")),
        makeMsg("msg-2", "user-1", "ch-1", new Date("2024-01-05T00:00:00Z")),
      ];
      const result = buildFilteredMessages(msgs, { after });
      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("msg-1");
    });

    it("before 日付でフィルタリングする", async () => {
      const { buildFilteredMessages } = await loadModule();
      const before = new Date("2024-01-10T00:00:00Z");
      const msgs = [
        makeMsg("msg-1", "user-1", "ch-1", new Date("2024-01-15T00:00:00Z")),
        makeMsg("msg-2", "user-1", "ch-1", new Date("2024-01-05T00:00:00Z")),
      ];
      const result = buildFilteredMessages(msgs, { before });
      expect(result).toHaveLength(1);
      expect(result[0].messageId).toBe("msg-2");
    });

    it("複数のフィルターを組み合わせて適用する", async () => {
      const { buildFilteredMessages } = await loadModule();
      const msgs = [
        makeMsg("msg-1", "user-1", "ch-1", new Date("2024-01-15T00:00:00Z")),
        makeMsg("msg-2", "user-2", "ch-1", new Date("2024-01-15T00:00:00Z")),
      ];
      msgs[0].content = "hello";
      msgs[1].content = "world";
      const result = buildFilteredMessages(msgs, {
        authorId: "user-1",
        keyword: "hello",
      });
      expect(result).toHaveLength(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // buildPreviewEmbed
  // ─────────────────────────────────────────────────────────────

  // ページ指定・除外メッセージ取り消し線・空ページ時の embed 構築を検証
  describe("buildPreviewEmbed", () => {
    it("指定ページのメッセージを含む embed を構築する", async () => {
      const { buildPreviewEmbed } = await loadModule();
      const msgs = [makeMsg("msg-1"), makeMsg("msg-2")];
      const embed = buildPreviewEmbed("ja", msgs, 0, new Set());
      expect(embed).toBeDefined();
      // Embed should have fields
      expect(embed.data.fields?.length).toBeGreaterThan(0);
    });

    it("除外メッセージに取り消し線を付けて embed を構築する", async () => {
      const { buildPreviewEmbed } = await loadModule();
      const msgs = [makeMsg("msg-1"), makeMsg("msg-2")];
      const embed = buildPreviewEmbed("ja", msgs, 0, new Set(["msg-1"]));
      expect(embed).toBeDefined();
      // First field should have strikethrough
      const firstField = embed.data.fields?.[0];
      expect(firstField?.name).toContain("~~");
    });

    it("ページにメッセージがない場合に対象ゼロの説明を表示する", async () => {
      const { buildPreviewEmbed } = await loadModule();
      const embed = buildPreviewEmbed("ja", [], 0, new Set());
      expect(embed.data.description).toBeTruthy();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // buildFinalConfirmEmbed
  // ─────────────────────────────────────────────────────────────

  // 最終確認 embed の構築（メッセージあり・なし）を検証
  describe("buildFinalConfirmEmbed", () => {
    it("メッセージを含む最終確認 embed を構築する", async () => {
      const { buildFinalConfirmEmbed } = await loadModule();
      const msgs = [makeMsg("msg-1"), makeMsg("msg-2")];
      const embed = buildFinalConfirmEmbed("ja", msgs, 0, 2);
      expect(embed).toBeDefined();
      expect(embed.data.fields?.length).toBeGreaterThan(0);
    });

    it("空の最終確認 embed を構築する", async () => {
      const { buildFinalConfirmEmbed } = await loadModule();
      const embed = buildFinalConfirmEmbed("ja", [], 0, 0);
      expect(embed).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // buildCompletionEmbed
  // ─────────────────────────────────────────────────────────────

  // チャンネル別内訳を含む削除完了 embed の構築を検証
  describe("buildCompletionEmbed", () => {
    it("チャンネル別内訳を含む完了 embed を構築する", async () => {
      const { buildCompletionEmbed } = await loadModule();
      const embed = buildCompletionEmbed("ja", 5, {
        "ch-1": { name: "general", count: 3 },
        "ch-2": { name: "random", count: 2 },
      });
      expect(embed).toBeDefined();
      expect(embed.data.fields?.length).toBeGreaterThan(0);
    });

    it("削除されたチャンネルがない場合は空の内訳テキストを表示する", async () => {
      const { buildCompletionEmbed } = await loadModule();
      const embed = buildCompletionEmbed("ja", 0, {});
      expect(embed).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // buildCommandConditionsEmbed
  // ─────────────────────────────────────────────────────────────

  // days・after/before・期間オプションなし等のコマンド条件 embed 構築を検証
  describe("buildCommandConditionsEmbed", () => {
    it("days オプション付きのコマンド条件 embed を構築する", async () => {
      const { buildCommandConditionsEmbed } = await loadModule();
      const embed = buildCommandConditionsEmbed("ja", {
        count: 100,
        targetUserIds: ["user-1"],
        keyword: "hello",
        daysOption: 7,
        channelIds: ["ch-1"],
      });
      expect(embed).toBeDefined();
      expect(embed.data.fields).toBeDefined();
    });

    it("after/before オプション付きのコマンド条件 embed を構築する", async () => {
      const { buildCommandConditionsEmbed } = await loadModule();
      const embed = buildCommandConditionsEmbed("ja", {
        count: 1000,
        targetUserIds: [],
        channelIds: [],
        afterStr: "2024-01-01",
        beforeStr: "2024-01-31",
      });
      expect(embed).toBeDefined();
    });

    it("期間オプションなしのコマンド条件 embed を構築する（なし表示）", async () => {
      const { buildCommandConditionsEmbed } = await loadModule();
      const embed = buildCommandConditionsEmbed("ja", {
        count: 1000,
        targetUserIds: [],
        channelIds: [],
      });
      expect(embed).toBeDefined();
    });

    it("after オプションのみのコマンド条件 embed を構築する", async () => {
      const { buildCommandConditionsEmbed } = await loadModule();
      const embed = buildCommandConditionsEmbed("ja", {
        count: 1000,
        targetUserIds: [],
        channelIds: [],
        afterStr: "2024-01-01",
      });
      expect(embed).toBeDefined();
    });

    it("before オプションのみのコマンド条件 embed を構築する", async () => {
      const { buildCommandConditionsEmbed } = await loadModule();
      const embed = buildCommandConditionsEmbed("ja", {
        count: 1000,
        targetUserIds: [],
        channelIds: [],
        beforeStr: "2024-01-31",
      });
      expect(embed).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // buildPreviewComponents
  // ─────────────────────────────────────────────────────────────

  // 各フィルター設定・空ページ・除外ID付きのプレビューコンポーネント構築を検証
  describe("buildPreviewComponents", () => {
    it("5 つのアクション行を構築する", async () => {
      const { buildPreviewComponents } = await loadModule();
      const msgs = [makeMsg("msg-1"), makeMsg("msg-2")];
      const filter: MessageDeleteFilter = {};
      const rows = buildPreviewComponents("ja", msgs, msgs, 0, 1, filter, 2);
      expect(rows).toHaveLength(5);
    });

    it("days フィルター設定時のコンポーネントを構築する", async () => {
      const { buildPreviewComponents } = await loadModule();
      const msgs = [makeMsg("msg-1")];
      const filter: MessageDeleteFilter = { days: 7 };
      const rows = buildPreviewComponents("ja", msgs, msgs, 0, 1, filter, 1);
      expect(rows).toHaveLength(5);
    });

    it("after/before フィルター設定時のコンポーネントを構築する", async () => {
      const { buildPreviewComponents } = await loadModule();
      const msgs = [makeMsg("msg-1")];
      const filter: MessageDeleteFilter = {
        after: new Date("2024-01-01"),
        afterRaw: "2024-01-01",
        before: new Date("2024-01-31"),
        beforeRaw: "2024-01-31",
      };
      const rows = buildPreviewComponents("ja", msgs, msgs, 0, 1, filter, 1);
      expect(rows).toHaveLength(5);
    });

    it("keyword フィルター設定時のコンポーネントを構築する", async () => {
      const { buildPreviewComponents } = await loadModule();
      const msgs = [makeMsg("msg-1")];
      const filter: MessageDeleteFilter = { keyword: "test" };
      const rows = buildPreviewComponents("ja", msgs, msgs, 0, 1, filter, 1);
      expect(rows).toHaveLength(5);
    });

    it("ページが空の場合のコンポーネントを構築する", async () => {
      const { buildPreviewComponents } = await loadModule();
      const filter: MessageDeleteFilter = {};
      const rows = buildPreviewComponents("ja", [], [], 0, 0, filter, 0);
      expect(rows).toHaveLength(5);
    });

    it("除外 ID セット付きのコンポーネントを構築する", async () => {
      const { buildPreviewComponents } = await loadModule();
      const msgs = [makeMsg("msg-1"), makeMsg("msg-2")];
      const filter: MessageDeleteFilter = {};
      const rows = buildPreviewComponents(
        "ja",
        msgs,
        msgs,
        0,
        1,
        filter,
        1,
        new Set(["msg-1"]),
      );
      expect(rows).toHaveLength(5);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // buildFinalConfirmComponents
  // ─────────────────────────────────────────────────────────────

  // 最終確認コンポーネント（ページネーション+確認ボタン）の構築を検証
  describe("buildFinalConfirmComponents", () => {
    it("2 つのアクション行を構築する", async () => {
      const { buildFinalConfirmComponents } = await loadModule();
      const rows = buildFinalConfirmComponents("ja", 0, 3, 5);
      expect(rows).toHaveLength(2);
    });
  });
});
