// tests/unit/bot/features/ticket/commands/usecases/ticketConfigEditPanel.test.ts

import { MessageFlags } from "discord.js";

const findByGuildAndCategoryMock = vi.fn();

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: vi.fn(() => ({
    findByGuildAndCategory: findByGuildAndCategoryMock,
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
}));

function createInteractionMock(overrides = {}) {
  return {
    channelId: "channel-1",
    locale: "ja",
    guild: { id: "guild-1" },
    options: {
      getChannel: vi.fn(() => ({ id: "category-1" })),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/ticket/commands/usecases/ticketConfigEditPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("設定が見つからない場合はエラー応答を返す", async () => {
    const { handleTicketConfigEditPanel } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigEditPanel"
    );

    findByGuildAndCategoryMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketConfigEditPanel(interaction as never, "guild-1");

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        flags: MessageFlags.Ephemeral,
        embeds: [expect.objectContaining({ type: "error" })],
      }),
    );
    expect(interaction.showModal).not.toHaveBeenCalled();
  });

  it("設定が見つからない場合は正しいカテゴリIDでサービスを呼び出す", async () => {
    const { handleTicketConfigEditPanel } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigEditPanel"
    );

    findByGuildAndCategoryMock.mockResolvedValue(null);
    const interaction = createInteractionMock();

    await handleTicketConfigEditPanel(interaction as never, "guild-1");

    expect(findByGuildAndCategoryMock).toHaveBeenCalledWith(
      "guild-1",
      "category-1",
    );
  });

  it("設定が存在する場合はモーダルを表示する", async () => {
    const { handleTicketConfigEditPanel } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigEditPanel"
    );

    findByGuildAndCategoryMock.mockResolvedValue({
      guildId: "guild-1",
      categoryId: "category-1",
      panelTitle: "テストタイトル",
      panelDescription: "テスト説明",
      panelColor: "#00A8F3",
    });
    const interaction = createInteractionMock();

    await handleTicketConfigEditPanel(interaction as never, "guild-1");

    expect(interaction.showModal).toHaveBeenCalledTimes(1);
    expect(interaction.reply).not.toHaveBeenCalled();
  });

  it("モーダルのcustomIdにEDIT_PANEL_MODAL_PREFIXとカテゴリIDが含まれる", async () => {
    const { handleTicketConfigEditPanel } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigEditPanel"
    );

    findByGuildAndCategoryMock.mockResolvedValue({
      guildId: "guild-1",
      categoryId: "category-1",
      panelTitle: "タイトル",
      panelDescription: "説明",
      panelColor: "#00A8F3",
    });
    const interaction = createInteractionMock();

    await handleTicketConfigEditPanel(interaction as never, "guild-1");

    const modalArg = interaction.showModal.mock.calls[0][0];
    expect(modalArg.data.custom_id).toBe("ticket:edit-panel-modal:category-1");
  });

  it("モーダルに既存のpanelTitleとpanelDescriptionが事前入力される", async () => {
    const { handleTicketConfigEditPanel } = await import(
      "@/bot/features/ticket/commands/usecases/ticketConfigEditPanel"
    );

    findByGuildAndCategoryMock.mockResolvedValue({
      guildId: "guild-1",
      categoryId: "category-1",
      panelTitle: "既存タイトル",
      panelDescription: "既存説明文",
      panelColor: "#00A8F3",
    });
    const interaction = createInteractionMock();

    await handleTicketConfigEditPanel(interaction as never, "guild-1");

    const modalArg = interaction.showModal.mock.calls[0][0];
    const components = modalArg.components;
    // 1つ目のActionRow内のTextInput（タイトル）
    const titleInput = components[0].components[0].data;
    expect(titleInput.value).toBe("既存タイトル");
    // 2つ目のActionRow内のTextInput（説明）
    const descInput = components[1].components[0].data;
    expect(descInput.value).toBe("既存説明文");
  });
});
