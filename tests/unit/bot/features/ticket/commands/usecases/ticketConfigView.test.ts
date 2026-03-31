// tests/unit/bot/features/ticket/commands/usecases/ticketConfigView.test.ts

import { MessageFlags } from "discord.js";

const findAllByGuildMock = vi.fn();
const findOpenByCategoryMock = vi.fn();
const deleteMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(() => ({
    findAllByGuild: findAllByGuildMock,
    delete: deleteMock,
  })),
  getBotTicketRepository: vi.fn(() => ({
    findOpenByCategory: findOpenByCategoryMock,
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
  tDefault: vi.fn((key: string) => key),
  tInteraction: (_locale: string, key: string) => key,
}));

vi.mock("@/shared/utils/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const createInfoEmbedMock = vi.fn((_desc: string, _opts?: unknown) => ({
  type: "info",
  addFields: vi.fn().mockReturnThis(),
}));
const createErrorEmbedMock = vi.fn((msg: string) => ({
  type: "error",
  description: msg,
}));

vi.mock("@/bot/utils/messageResponse", () => ({
  createInfoEmbed: createInfoEmbedMock,
  createErrorEmbed: createErrorEmbedMock,
}));

vi.mock("@/bot/shared/pagination", () => ({
  buildPaginationRow: vi.fn(() => ({
    type: "pagination-row",
    components: [{ data: { custom_id: "ticket:page-first" } }],
  })),
}));

/**
 * パネルメッセージが存在するチャンネルのモックを返す client を作成
 */
function createClientMock() {
  return {
    channels: {
      fetch: vi.fn().mockResolvedValue({
        messages: {
          fetch: vi.fn().mockResolvedValue({ id: "panel-msg-1" }),
        },
      }),
    },
  };
}

function createInteractionMock(overrides = {}) {
  return {
    channelId: "channel-1",
    locale: "ja",
    client: createClientMock(),
    guild: {
      id: "guild-1",
      channels: {
        fetch: vi
          .fn()
          .mockResolvedValue({ name: "test-category", id: "cat-1" }),
      },
    },
    reply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createConfig(categoryId: string, overrides = {}) {
  return {
    guildId: "guild-1",
    categoryId,
    staffRoleIds: '["role-1","role-2"]',
    autoDeleteDays: 7,
    maxTicketsPerUser: 3,
    panelChannelId: "panel-ch-1",
    panelMessageId: "panel-msg-1",
    panelTitle: "テスト",
    panelDescription: "テスト説明",
    ...overrides,
  };
}

describe("bot/features/ticket/commands/usecases/ticketConfigView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定が存在しない場合はinfo応答を返す", async () => {
    const { handleTicketConfigView } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    findAllByGuildMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleTicketConfigView(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
        embeds: [expect.objectContaining({ type: "info" })],
      }),
    );
  });

  it("設定が存在しない場合はコンポーネントなしで応答する", async () => {
    const { handleTicketConfigView } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    findAllByGuildMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleTicketConfigView(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    expect(replyCall.components).toBeUndefined();
  });

  it("単一設定の場合はページネーションなしでEmbedを表示する", async () => {
    const { handleTicketConfigView } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    findAllByGuildMock.mockResolvedValue([createConfig("cat-1")]);
    findOpenByCategoryMock.mockResolvedValue([{ channelId: "ch-1" }]);
    const interaction = createInteractionMock();

    await handleTicketConfigView(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
        embeds: expect.arrayContaining([expect.any(Object)]),
      }),
    );
    const replyCall = interaction.reply.mock.calls[0][0];
    expect(replyCall.components).toHaveLength(0);
  });

  it("複数設定の場合はページネーション行とカテゴリ選択メニューが含まれる", async () => {
    const { handleTicketConfigView } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-1"),
      createConfig("cat-2"),
    ]);
    findOpenByCategoryMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleTicketConfigView(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    // ページネーション行 + カテゴリ選択メニュー = 2行
    expect(replyCall.components).toHaveLength(2);
  });

  it("複数設定の場合はカテゴリ選択メニューにすべてのカテゴリが含まれる", async () => {
    const { handleTicketConfigView } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-1"),
      createConfig("cat-2"),
      createConfig("cat-3"),
    ]);
    findOpenByCategoryMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleTicketConfigView(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    // 2番目のコンポーネント = カテゴリ選択メニュー
    const selectMenuComponent = replyCall.components[1].components[0];
    expect(selectMenuComponent.options).toHaveLength(3);
    expect(selectMenuComponent.options[0].data.value).toBe("cat-1");
    expect(selectMenuComponent.options[1].data.value).toBe("cat-2");
    expect(selectMenuComponent.options[2].data.value).toBe("cat-3");
  });

  it("チャンネル名の取得に失敗した場合はカテゴリIDをラベルに使用する", async () => {
    const { handleTicketConfigView } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-1"),
      createConfig("cat-err"),
    ]);
    findOpenByCategoryMock.mockResolvedValue([]);
    const interaction = createInteractionMock({
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockRejectedValue(new Error("not found")),
        },
      },
    });

    await handleTicketConfigView(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenuComponent = replyCall.components[1].components[0];
    expect(selectMenuComponent.options[0].data.label).toBe("cat-1");
    expect(selectMenuComponent.options[1].data.label).toBe("cat-err");
  });

  it("最初の設定のオープンチケット数を取得する", async () => {
    const { handleTicketConfigView } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    findAllByGuildMock.mockResolvedValue([createConfig("cat-1")]);
    findOpenByCategoryMock.mockResolvedValue([
      { channelId: "ch-1" },
      { channelId: "ch-2" },
    ]);
    const interaction = createInteractionMock();

    await handleTicketConfigView(interaction as never, "guild-1");

    expect(findOpenByCategoryMock).toHaveBeenCalledWith("guild-1", "cat-1");
  });

  it("パネルメッセージが全て削除済みの場合はエラー応答を返す", async () => {
    const { handleTicketConfigView } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    findAllByGuildMock.mockResolvedValue([createConfig("cat-1")]);
    const interaction = createInteractionMock({
      client: {
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
    });

    await handleTicketConfigView(interaction as never, "guild-1");

    expect(deleteMock).toHaveBeenCalledWith("guild-1", "cat-1");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "error" })],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("一部パネルがクリーンアップされた場合はfollowUpで通知する", async () => {
    const { handleTicketConfigView } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-1"),
      createConfig("cat-2"),
    ]);
    findOpenByCategoryMock.mockResolvedValue([]);

    // cat-1はパネル存在、cat-2はパネル不在
    const clientMock = {
      channels: {
        fetch: vi
          .fn()
          .mockResolvedValueOnce({
            messages: {
              fetch: vi.fn().mockResolvedValue({ id: "panel-msg-1" }),
            },
          })
          .mockResolvedValueOnce(null),
      },
    };
    const interaction = createInteractionMock({ client: clientMock });

    await handleTicketConfigView(interaction as never, "guild-1");

    expect(deleteMock).toHaveBeenCalledWith("guild-1", "cat-2");
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      }),
    );
  });
});

describe("buildConfigEmbed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定情報からEmbedを正しく生成する", async () => {
    const { buildConfigEmbed } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    const config = createConfig("cat-1");
    const embed = buildConfigEmbed(config as never, 5, "ja");

    expect(createInfoEmbedMock).toHaveBeenCalledWith("", expect.any(Object));
    expect(embed.addFields).toHaveBeenCalled();
  });

  it("スタッフロールIDが空の場合はハイフンを表示する", async () => {
    const { buildConfigEmbed } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    const config = createConfig("cat-1", { staffRoleIds: "[]" });
    const embed = buildConfigEmbed(config as never, 0, "ja");

    // addFieldsが呼ばれ、結果が返されていることを確認
    const addFieldsMock = vi.mocked(embed.addFields);
    expect(addFieldsMock).toHaveBeenCalled();
    const fields = addFieldsMock.mock.calls[0] as unknown as Array<{
      name: string;
      value: string;
    }>;
    // 2番目のフィールド（staffRoles）のvalueが"-"であること
    expect(fields[1].value).toBe("-");
  });

  it("スタッフロールIDがある場合はメンション形式で表示する", async () => {
    const { buildConfigEmbed } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    const config = createConfig("cat-1", {
      staffRoleIds: '["role-a","role-b"]',
    });
    const embed = buildConfigEmbed(config as never, 2, "ja");

    const fields = vi.mocked(embed.addFields).mock
      .calls[0] as unknown as Array<{ name: string; value: string }>;
    expect(fields[1].value).toBe("<@&role-a> <@&role-b>");
  });

  it("カテゴリIDがチャンネルメンション形式で表示される", async () => {
    const { buildConfigEmbed } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigView"
    );

    const config = createConfig("cat-xyz");
    const embed = buildConfigEmbed(config as never, 0, "ja");

    const fields = vi.mocked(embed.addFields).mock
      .calls[0] as unknown as Array<{ name: string; value: string }>;
    expect(fields[0].value).toBe("<#cat-xyz>");
  });
});
