// tests/unit/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler.test.ts
import type { Mock } from "vitest";

const findByChannelMock: Mock = vi.fn();
const tInteractionMock = vi.fn(
  (_locale: string | undefined, key: string) => key,
);

const warningEmbedMock = vi.fn((msg: string, opts?: object) => ({
  type: "warning",
  msg,
  ...opts,
}));
const infoEmbedInstance: { setColor: Mock; setTimestamp: Mock } = {
  setColor: vi.fn().mockReturnThis(),
  setTimestamp: vi.fn().mockReturnThis(),
};
const infoEmbedMock: Mock = vi.fn(() => infoEmbedInstance);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotStickyMessageConfigService: vi.fn(() => ({
    findByChannel: findByChannelMock,
  })),
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
  tInteraction: (_locale: string, key: string) =>
    tInteractionMock(_locale, key),
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createWarningEmbed: warningEmbedMock,
  createInfoEmbed: infoEmbedMock,
}));

function createInteractionMock({
  guildId = "guild-1",
  values = ["ch-1"] as string[],
  messageComponents = [{ type: 3 }],
  updateMock = vi.fn().mockResolvedValue(undefined),
}: {
  guildId?: string | null;
  values?: string[];
  messageComponents?: unknown[];
  updateMock?: Mock;
} = {}): {
  guildId: string | null;
  locale: string;
  values: string[];
  update: Mock;
  message: { components: unknown[] };
  _updateMock: Mock;
} {
  return {
    guildId,
    locale: "ja",
    values,
    update: updateMock,
    message: { components: messageComponents },
    _updateMock: updateMock,
  };
}

// stickyMessageViewSelectHandler の UI インタラクション処理（表示切替・フォーマット分岐・エラー耐性）を検証
describe("bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler", () => {
  // 各テストケースで embed モックの状態をリセットし、テスト間の副作用を排除
  beforeEach(() => {
    vi.clearAllMocks();
    infoEmbedMock.mockReturnValue(infoEmbedInstance);
    infoEmbedInstance.setColor.mockReturnThis();
    infoEmbedInstance.setTimestamp.mockReturnThis();
  });

  it("VIEW_SELECT_CUSTOM_ID に完全一致する customId を正しく識別する", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    expect(
      stickyMessageViewSelectHandler.matches("sticky-message:view-select"),
    ).toBe(true);
    expect(
      stickyMessageViewSelectHandler.matches(
        "sticky-message:view-select:extra",
      ),
    ).toBe(false);
  });

  it("values が空配列の場合（チャンネル未選択）はコンポーネントのみクリアして早期リターンする", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({
      values: [],
      updateMock,
    });

    await stickyMessageViewSelectHandler.execute(interaction as never);

    expect(updateMock).toHaveBeenCalledWith({ components: [] });
    expect(findByChannelMock).not.toHaveBeenCalled();
  });

  it("スティッキーメッセージが見つからない場合に警告で更新する", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    findByChannelMock.mockResolvedValue(null);
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({ updateMock });

    await stickyMessageViewSelectHandler.execute(interaction as never);

    expect(warningEmbedMock).toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ components: expect.any(Array) }),
    );
  });

  it("embedData が null の場合はプレーンテキスト表示パスに分岐し、setColor が呼ばれない", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      channelId: "ch-1",
      content: "Hello world",
      embedData: null,
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      updatedBy: null,
    });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({ updateMock });

    await stickyMessageViewSelectHandler.execute(interaction as never);

    expect(infoEmbedMock).toHaveBeenCalled();
    const formatArg = tInteractionMock.mock.calls.some((c) =>
      String(c[1]).includes("format_plain"),
    );
    expect(formatArg).toBe(true);
    expect(infoEmbedInstance.setColor).not.toHaveBeenCalled();
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: [infoEmbedInstance] }),
    );
  });

  it("embedData がある場合は embed 形式・タイトル・カラーフィールドを表示する", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    const embedData = JSON.stringify({
      title: "Embed Title",
      color: 0xff0000,
    });
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      channelId: "ch-1",
      content: "Embed content",
      embedData,
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      updatedBy: null,
    });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({ updateMock });

    await stickyMessageViewSelectHandler.execute(interaction as never);

    expect(infoEmbedMock).toHaveBeenCalled();
    expect(infoEmbedInstance.setColor).toHaveBeenCalledWith(0xff0000);
    expect(updateMock).toHaveBeenCalledWith(
      expect.objectContaining({ embeds: [infoEmbedInstance] }),
    );
  });

  it("updatedBy が設定されている場合に updatedBy フィールドを表示する", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      channelId: "ch-1",
      content: "Content",
      embedData: null,
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      updatedBy: "user-1",
    });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({ updateMock });

    await stickyMessageViewSelectHandler.execute(interaction as never);

    const tGuildCalls = tInteractionMock.mock.calls.map((c) => c[1]);
    expect(tGuildCalls.some((k) => String(k).includes("updated_by"))).toBe(
      true,
    );
  });

  it("Discord の embed フィールド文字数上限（1024）を超えるコンテンツが '...' で切り詰められる", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    const longContent = "a".repeat(1100);
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      channelId: "ch-1",
      content: longContent,
      embedData: null,
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      updatedBy: null,
    });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({ updateMock });

    await stickyMessageViewSelectHandler.execute(interaction as never);

    const infoCall = infoEmbedMock.mock.calls[0];
    const opts = (infoCall as unknown as unknown[])?.[1] as
      | { fields?: { value: string }[] }
      | undefined;
    const contentField = opts?.fields?.find((f) => f.value.includes("..."));
    expect(contentField).toBeDefined();
  });

  it("コンテンツがちょうど 1024 文字の場合は切り詰めない", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    const exactContent = "a".repeat(1024);
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      channelId: "ch-1",
      content: exactContent,
      embedData: null,
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      updatedBy: null,
    });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({ updateMock });

    await stickyMessageViewSelectHandler.execute(interaction as never);

    const opts = (infoEmbedMock.mock.calls[0] as unknown as unknown[])?.[1] as
      | {
          fields?: { value: string }[];
        }
      | undefined;
    const contentField = opts?.fields?.find((f) => f.value.includes("aaa"));
    expect(contentField?.value).not.toContain("...");
  });

  it("embedData が不正な JSON 文字列でも例外を投げず、更新処理が正常完了する", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      channelId: "ch-1",
      content: "Content",
      embedData: "not-valid-json",
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      updatedBy: null,
    });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({ updateMock });

    await expect(
      stickyMessageViewSelectHandler.execute(interaction as never),
    ).resolves.not.toThrow();
    expect(updateMock).toHaveBeenCalled();
  });

  it("embedData に title も color もない場合はどちらのフィールドも追加しない", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    // title も color もない embedData
    const embedData = JSON.stringify({ content: "embed-only content" });
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      channelId: "ch-1",
      content: "Sticky content",
      embedData,
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      updatedBy: null,
    });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({ updateMock });

    await stickyMessageViewSelectHandler.execute(interaction as never);

    // embed_title / embed_color キーは呼ばれない
    const tGuildKeys = tInteractionMock.mock.calls.map((c) => c[1]);
    expect(tGuildKeys).not.toContain(
      "stickyMessage:embed.field.name.embed_title",
    );
    expect(tGuildKeys).not.toContain(
      "stickyMessage:embed.field.name.embed_color",
    );
    expect(updateMock).toHaveBeenCalled();
  });

  it("guildId が null の場合に null 合体演算子で undefined にフォールバックし、クラッシュせず更新できる", async () => {
    const { stickyMessageViewSelectHandler } = await import(
      "@/bot/features/sticky-message/handlers/ui/stickyMessageViewSelectHandler"
    );
    findByChannelMock.mockResolvedValue({
      id: "sticky-1",
      channelId: "ch-1",
      content: "Sticky content",
      embedData: null,
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      updatedBy: null,
    });
    const updateMock = vi.fn().mockResolvedValue(undefined);
    const interaction = createInteractionMock({ guildId: null, updateMock });

    await stickyMessageViewSelectHandler.execute(interaction as never);

    expect(updateMock).toHaveBeenCalled();
  });
});
