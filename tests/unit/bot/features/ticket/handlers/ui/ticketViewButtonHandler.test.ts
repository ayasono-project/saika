// tests/unit/bot/features/ticket/handlers/ui/ticketViewButtonHandler.test.ts

import { ticketViewButtonHandler } from "@/bot/features/ticket/handlers/ui/ticketViewButtonHandler";

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
  tInteraction: (...args: unknown[]) => args[1],
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn(() => ({ type: "success" })),
  createErrorEmbed: vi.fn(() => ({ type: "error" })),
  createWarningEmbed: vi.fn((_desc: string, _opts?: unknown) => ({
    type: "warning",
    addFields: vi.fn().mockReturnThis(),
  })),
  createInfoEmbed: vi.fn((_desc: string, _opts?: unknown) => ({
    type: "info",
    addFields: vi.fn().mockReturnThis(),
  })),
}));

const mockConfigService = {
  findByGuildAndCategory: vi.fn(),
  findAllByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteAllByGuild: vi.fn(),
  incrementCounter: vi.fn(),
};
const mockTicketRepository = {
  findById: vi.fn(),
  findByChannelId: vi.fn(),
  findOpenByUserAndCategory: vi.fn(),
  findOpenByCategory: vi.fn(),
  findAllByCategory: vi.fn(),
  findAllClosedByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  deleteByCategory: vi.fn(),
  deleteAllByGuild: vi.fn(),
};
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotTicketConfigService: () => mockConfigService,
  getBotTicketRepository: () => mockTicketRepository,
}));

vi.mock("@/bot/shared/pagination", () => ({
  parsePaginationAction: vi.fn(),
  resolvePageFromAction: vi.fn(),
  buildPaginationRow: vi.fn(() => ({ type: "ActionRow" })),
  showPaginationJumpModal: vi.fn(),
}));

vi.mock("@/bot/features/ticket/commands/usecases/ticketConfigView", () => ({
  buildConfigEmbed: vi.fn(() => ({ type: "embed" })),
}));

import {
  parsePaginationAction,
  resolvePageFromAction,
  showPaginationJumpModal,
} from "@/bot/shared/pagination";

function createMockButtonInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    guild: {
      id: "guild-1",
      channels: { fetch: vi.fn().mockResolvedValue({ name: "test-category" }) },
    },
    user: { id: "user-1" },
    member: { roles: { cache: new Map([["staff-role-1", {}]]) } },
    message: {
      components: [],
    },
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    awaitModalSubmit: vi.fn(),
    ...overrides,
  };
}

describe("bot/features/ticket/handlers/ui/ticketViewButtonHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("matches", () => {
    it("parsePaginationActionがnull以外を返す場合にマッチする", () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");
      expect(ticketViewButtonHandler.matches("ticket:page-next")).toBe(true);
    });

    it("parsePaginationActionがnullを返す場合にマッチしない", () => {
      vi.mocked(parsePaginationAction).mockReturnValue(null);
      expect(ticketViewButtonHandler.matches("other:action")).toBe(false);
    });
  });

  describe("execute", () => {
    it("guildIdがnullの場合は早期リターンする", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");

      const interaction = createMockButtonInteraction("ticket:page-next", {
        guildId: null,
        guild: null,
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(mockConfigService.findAllByGuild).not.toHaveBeenCalled();
    });

    it("guildがnullの場合は早期リターンする", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");

      const interaction = createMockButtonInteraction("ticket:page-next", {
        guild: null,
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(mockConfigService.findAllByGuild).not.toHaveBeenCalled();
    });

    it("設定が空の場合は早期リターンする", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");
      mockConfigService.findAllByGuild.mockResolvedValue([]);

      const interaction = createMockButtonInteraction("ticket:page-next");

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.update).not.toHaveBeenCalled();
    });

    it("actionがnullの場合は早期リターンする", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue(null);
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
      ]);

      const interaction = createMockButtonInteraction("ticket:page-next");

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.update).not.toHaveBeenCalled();
    });

    it("next アクションでページ移動し update を呼ぶ", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");
      vi.mocked(resolvePageFromAction).mockReturnValue(1);
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
        { categoryId: "cat-2" },
      ]);
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockButtonInteraction("ticket:page-next", {
        message: { components: [] },
        guild: {
          id: "guild-1",
          channels: {
            fetch: vi.fn().mockResolvedValue({ name: "test-category" }),
          },
        },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: expect.any(Array),
        }),
      );
    });

    it("同一ページの場合は deferUpdate のみ呼ぶ", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");
      vi.mocked(resolvePageFromAction).mockReturnValue(0); // same page
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
      ]);

      const interaction = createMockButtonInteraction("ticket:page-next", {
        message: { components: [] },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.deferUpdate).toHaveBeenCalled();
      expect(interaction.update).not.toHaveBeenCalled();
    });

    it("jump アクションでモーダルを表示し editReply を呼ぶ", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("jump");
      vi.mocked(showPaginationJumpModal).mockResolvedValue("2");
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
        { categoryId: "cat-2" },
      ]);
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockButtonInteraction("ticket:page-jump", {
        message: { components: [] },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(showPaginationJumpModal).toHaveBeenCalled();
      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
        }),
      );
    });

    it("jump アクションでモーダルがキャンセルされた場合は早期リターンする", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("jump");
      vi.mocked(showPaginationJumpModal).mockResolvedValue(null);
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
      ]);

      const interaction = createMockButtonInteraction("ticket:page-jump", {
        message: { components: [] },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.editReply).not.toHaveBeenCalled();
      expect(interaction.update).not.toHaveBeenCalled();
    });

    it("jump アクションで無効なページ番号の場合は早期リターンする", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("jump");
      vi.mocked(showPaginationJumpModal).mockResolvedValue("abc");
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
      ]);

      const interaction = createMockButtonInteraction("ticket:page-jump", {
        message: { components: [] },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.editReply).not.toHaveBeenCalled();
    });

    it("jump アクションで範囲外のページ番号の場合は早期リターンする", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("jump");
      vi.mocked(showPaginationJumpModal).mockResolvedValue("5");
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
      ]);

      const interaction = createMockButtonInteraction("ticket:page-jump", {
        message: { components: [] },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.editReply).not.toHaveBeenCalled();
    });

    it("jump アクションでページ番号0以下の場合は早期リターンする", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("jump");
      vi.mocked(showPaginationJumpModal).mockResolvedValue("0");
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
      ]);

      const interaction = createMockButtonInteraction("ticket:page-jump", {
        message: { components: [] },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.editReply).not.toHaveBeenCalled();
    });

    it("単一設定の場合はページネーションとセレクトメニューを表示しない", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");
      vi.mocked(resolvePageFromAction).mockReturnValue(0);
      // totalPages = 1 means same page, but resolvePageFromAction returns different
      // Actually with 1 config, resolvePageFromAction(next, 0, 1) would return 0
      // so it would deferUpdate. Let's use jump instead to test the single-page branch
      vi.mocked(parsePaginationAction).mockReturnValue("jump");
      vi.mocked(showPaginationJumpModal).mockResolvedValue("1");
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
      ]);
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockButtonInteraction("ticket:page-jump", {
        message: { components: [] },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.editReply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: expect.any(Array),
          components: [],
        }),
      );
    });

    it("チャンネル名取得に失敗した場合はcategoryIdをラベルに使用する", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");
      vi.mocked(resolvePageFromAction).mockReturnValue(1);
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
        { categoryId: "cat-2" },
      ]);
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockButtonInteraction("ticket:page-next", {
        guild: {
          id: "guild-1",
          channels: {
            fetch: vi.fn().mockRejectedValue(new Error("not found")),
          },
        },
        message: { components: [] },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalled();
    });

    it("getCurrentPageFromConfigsがセレクトメニューのデフォルト値からページを特定する", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");
      vi.mocked(resolvePageFromAction).mockReturnValue(0);
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
        { categoryId: "cat-2" },
      ]);

      // ComponentType.ActionRow = 1, ComponentType.StringSelect = 3
      const interaction = createMockButtonInteraction("ticket:page-next", {
        message: {
          components: [
            {
              type: 1,
              components: [
                {
                  type: 3,
                  options: [
                    { value: "cat-1", default: false },
                    { value: "cat-2", default: true },
                  ],
                },
              ],
            },
          ],
        },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      // resolvePageFromAction should be called with currentPage=1 (from cat-2 default)
      expect(resolvePageFromAction).toHaveBeenCalledWith("next", 1, 2);
    });

    it("チャンネル名がnullの場合はcategoryIdをラベルに使用する", async () => {
      vi.mocked(parsePaginationAction).mockReturnValue("next");
      vi.mocked(resolvePageFromAction).mockReturnValue(1);
      mockConfigService.findAllByGuild.mockResolvedValue([
        { categoryId: "cat-1" },
        { categoryId: "cat-2" },
      ]);
      mockTicketRepository.findOpenByCategory.mockResolvedValue([]);

      const interaction = createMockButtonInteraction("ticket:page-next", {
        guild: {
          id: "guild-1",
          channels: { fetch: vi.fn().mockResolvedValue(null) },
        },
        message: { components: [] },
      });

      await ticketViewButtonHandler.execute(interaction as never);

      expect(interaction.update).toHaveBeenCalled();
    });
  });
});
