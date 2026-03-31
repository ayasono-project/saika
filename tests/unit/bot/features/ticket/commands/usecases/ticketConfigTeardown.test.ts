// tests/unit/bot/features/ticket/commands/usecases/ticketConfigTeardown.test.ts

import { MessageFlags } from "discord.js";

const findAllByGuildMock = vi.fn();
const deleteMock = vi.fn().mockResolvedValue(undefined);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(() => ({
    findAllByGuild: findAllByGuildMock,
    delete: deleteMock,
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

vi.mock("@/bot/utils/messageResponse", () => ({
  createErrorEmbed: vi.fn((msg: string) => ({
    type: "error",
    description: msg,
  })),
  createInfoEmbed: vi.fn((_desc: string, _opts?: unknown) => ({
    type: "info",
  })),
}));

vi.mock("@/bot/features/ticket/services/ticketAutoDeleteService", () => ({
  cancelTicketAutoDelete: vi.fn(),
}));

const showTeardownConfirmationMock = vi.fn().mockResolvedValue(undefined);
vi.mock(
  "@/bot/features/ticket/handlers/ui/ticketTeardownSelectHandler",
  () => ({
    showTeardownConfirmation: showTeardownConfirmationMock,
  }),
);

const ticketTeardownSessionsMock = {
  get: vi.fn(),
  set: vi.fn(),
  has: vi.fn(),
  delete: vi.fn(),
};
vi.mock("@/bot/features/ticket/handlers/ui/ticketTeardownState", () => ({
  ticketTeardownSessions: ticketTeardownSessionsMock,
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
    options: {
      getChannel: vi.fn(() => ({ id: "category-1" })),
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
    panelChannelId: "panel-ch-1",
    panelMessageId: "panel-msg-1",
    ...overrides,
  };
}

describe("bot/features/ticket/commands/usecases/ticketConfigTeardown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定が存在しない場合はエラー応答を返す", async () => {
    const { handleTicketConfigTeardown } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([]);
    const interaction = createInteractionMock();

    await handleTicketConfigTeardown(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
        embeds: [expect.objectContaining({ type: "error" })],
      }),
    );
  });

  it("設定が1件の場合はセレクトメニューをスキップし確認ダイアログを直接表示する", async () => {
    const { handleTicketConfigTeardown } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([createConfig("cat-1")]);
    const interaction = createInteractionMock();

    await handleTicketConfigTeardown(interaction as never, "guild-1");

    expect(interaction.reply).not.toHaveBeenCalled();
    expect(ticketTeardownSessionsMock.set).toHaveBeenCalledWith(
      expect.any(String),
      { categoryIds: ["cat-1"] },
    );
    expect(showTeardownConfirmationMock).toHaveBeenCalledWith(
      interaction,
      expect.any(String),
      ["cat-1"],
      "guild-1",
    );
  });

  it("複数の設定がある場合はStringSelectMenuを表示する", async () => {
    const { handleTicketConfigTeardown } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-1"),
      createConfig("cat-2"),
    ]);
    const interaction = createInteractionMock();

    await handleTicketConfigTeardown(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.arrayContaining([expect.any(Object)]),
        flags: MessageFlags.Ephemeral,
      }),
    );
    expect(ticketTeardownSessionsMock.set).toHaveBeenCalledWith(
      expect.any(String),
      { categoryIds: [] },
    );
  });

  it("選択メニューのcustomIdにTEARDOWN_SELECT_PREFIXが含まれる", async () => {
    const { handleTicketConfigTeardown } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-1"),
      createConfig("cat-2"),
    ]);
    const interaction = createInteractionMock();

    await handleTicketConfigTeardown(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenu = replyCall.components[0].components[0].data;
    expect(selectMenu.custom_id).toContain("ticket:teardown-select:");
  });

  it("複数の設定がある場合はすべてのカテゴリがオプションに含まれる", async () => {
    const { handleTicketConfigTeardown } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-1"),
      createConfig("cat-2"),
    ]);
    const interaction = createInteractionMock();

    await handleTicketConfigTeardown(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenuComponent = replyCall.components[0].components[0];
    expect(selectMenuComponent.options).toHaveLength(2);
    expect(selectMenuComponent.options[0].data.value).toBe("cat-1");
    expect(selectMenuComponent.options[1].data.value).toBe("cat-2");
  });

  it("チャンネル名が取得できない場合はカテゴリIDをラベルに使用する", async () => {
    const { handleTicketConfigTeardown } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-unknown"),
      createConfig("cat-unknown2"),
    ]);
    const interaction = createInteractionMock({
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockRejectedValue(new Error("not found")),
        },
      },
    });

    await handleTicketConfigTeardown(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenuComponent = replyCall.components[0].components[0];
    expect(selectMenuComponent.options[0].data.label).toBe("cat-unknown");
  });

  it("チャンネル名がnullの場合はカテゴリIDをラベルに使用する", async () => {
    const { handleTicketConfigTeardown } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-null"),
      createConfig("cat-null2"),
    ]);
    const interaction = createInteractionMock({
      guild: {
        id: "guild-1",
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
    });

    await handleTicketConfigTeardown(interaction as never, "guild-1");

    const replyCall = interaction.reply.mock.calls[0][0];
    const selectMenuComponent = replyCall.components[0].components[0];
    expect(selectMenuComponent.options[0].data.label).toBe("cat-null");
  });

  it("パネルメッセージが全て削除済みの場合はDB設定を削除しエラー応答を返す", async () => {
    const { handleTicketConfigTeardown } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([createConfig("cat-1")]);
    const interaction = createInteractionMock({
      client: {
        channels: {
          fetch: vi.fn().mockResolvedValue(null),
        },
      },
    });

    await handleTicketConfigTeardown(interaction as never, "guild-1");

    expect(deleteMock).toHaveBeenCalledWith("guild-1", "cat-1");
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: [expect.objectContaining({ type: "error" })],
        flags: MessageFlags.Ephemeral,
      }),
    );
  });

  it("一部パネルがクリーンアップされた場合はfollowUpで通知する", async () => {
    const { handleTicketConfigTeardown } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigTeardown"
    );

    findAllByGuildMock.mockResolvedValue([
      createConfig("cat-1"),
      createConfig("cat-2"),
    ]);

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

    await handleTicketConfigTeardown(interaction as never, "guild-1");

    expect(deleteMock).toHaveBeenCalledWith("guild-1", "cat-2");
    expect(interaction.followUp).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
      }),
    );
  });
});
