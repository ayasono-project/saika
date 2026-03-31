// tests/unit/bot/features/reaction-role/handlers/ui/reactionRoleViewHandler.test.ts

import {
  reactionRoleViewButtonHandler,
  reactionRoleViewSelectHandler,
} from "@/bot/features/reaction-role/handlers/ui/reactionRoleViewHandler";

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
  findById: vi.fn(),
  findAllByGuild: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotReactionRolePanelConfigService: () => mockConfigService,
}));

const mockParsePaginationAction = vi.fn(
  (..._args: unknown[]): string | null => null,
);
const mockResolvePageFromAction = vi.fn((..._args: unknown[]): number => 0);
const mockBuildPaginationRow = vi.fn((..._args: unknown[]) => ({
  type: "pagination-row",
}));
const mockShowPaginationJumpModal = vi.fn(
  (..._args: unknown[]): string | null => null,
);
vi.mock("@/bot/shared/pagination", () => ({
  parsePaginationAction: (...args: unknown[]) =>
    mockParsePaginationAction(...args),
  resolvePageFromAction: (...args: unknown[]) =>
    mockResolvePageFromAction(...args),
  buildPaginationRow: (...args: unknown[]) => mockBuildPaginationRow(...args),
  showPaginationJumpModal: (...args: unknown[]) =>
    mockShowPaginationJumpModal(...args),
}));

const mockBuildViewEmbed = vi.fn((..._args: unknown[]) => ({
  type: "view-embed",
}));
vi.mock(
  "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigView",
  () => ({
    buildViewEmbed: (...args: unknown[]) => mockBuildViewEmbed(...args),
  }),
);

function createMockButtonInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    id: "interaction-1",
    client: {},
    guild: {
      channels: {
        cache: {
          get: vi.fn((id: string) => ({ name: `channel-${id}` })),
        },
      },
    },
    message: {
      components: [
        {
          components: [
            {
              type: 2, // ComponentType.Button
              customId: "reaction-role:page-jump",
              label: "1/3",
            },
          ],
        },
      ],
    },
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockStringSelectInteraction(
  customId: string,
  values: string[] = [],
  overrides = {},
) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    id: "interaction-1",
    guild: {
      channels: {
        cache: {
          get: vi.fn((id: string) => ({ name: `channel-${id}` })),
        },
      },
    },
    values,
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

const samplePanels = [
  {
    id: "panel-1",
    channelId: "ch-1",
    messageId: "msg-1",
    title: "パネル1",
    description: "説明1",
    color: "#000000",
    buttons: "[]",
  },
  {
    id: "panel-2",
    channelId: "ch-2",
    messageId: "msg-2",
    title: "パネル2",
    description: "説明2",
    color: "#FFFFFF",
    buttons: "[]",
  },
  {
    id: "panel-3",
    channelId: "ch-3",
    messageId: "msg-3",
    title: "パネル3",
    description: "説明3",
    color: "#FF0000",
    buttons: "[]",
  },
];

describe("bot/features/reaction-role/handlers/ui/reactionRoleViewHandler", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("reactionRoleViewButtonHandler", () => {
    describe("matches", () => {
      it("parsePaginationActionが非nullを返す場合にマッチする", () => {
        mockParsePaginationAction.mockReturnValue("next");
        expect(
          reactionRoleViewButtonHandler.matches("reaction-role:page-next"),
        ).toBe(true);
        expect(mockParsePaginationAction).toHaveBeenCalledWith(
          "reaction-role:page-next",
          "reaction-role",
        );
      });

      it("parsePaginationActionがnullを返す場合にマッチしない", () => {
        mockParsePaginationAction.mockReturnValue(null);
        expect(
          reactionRoleViewButtonHandler.matches("unrelated:page-next"),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("guildIdがnullの場合は何もしない", async () => {
        mockParsePaginationAction.mockReturnValue("next");
        const interaction = createMockButtonInteraction(
          "reaction-role:page-next",
          { guildId: null },
        );

        await reactionRoleViewButtonHandler.execute(interaction as never);

        expect(mockConfigService.findAllByGuild).not.toHaveBeenCalled();
      });

      it("パネルが空の場合は何もしない", async () => {
        mockParsePaginationAction.mockReturnValue("next");
        mockConfigService.findAllByGuild.mockResolvedValue([]);

        const interaction = createMockButtonInteraction(
          "reaction-role:page-next",
        );

        await reactionRoleViewButtonHandler.execute(interaction as never);

        expect(mockBuildViewEmbed).not.toHaveBeenCalled();
      });

      it("通常ナビゲーションの場合はdeferUpdateしてeditReplyで更新する", async () => {
        mockParsePaginationAction.mockReturnValue("next");
        mockResolvePageFromAction.mockReturnValue(1);
        mockConfigService.findAllByGuild.mockResolvedValue(samplePanels);

        const interaction = createMockButtonInteraction(
          "reaction-role:page-next",
        );

        await reactionRoleViewButtonHandler.execute(interaction as never);

        expect(interaction.deferUpdate).toHaveBeenCalled();
        expect(mockResolvePageFromAction).toHaveBeenCalledWith("next", 0, 3);
        expect(mockBuildViewEmbed).toHaveBeenCalledWith(samplePanels, 1, "ja");
        expect(mockBuildPaginationRow).toHaveBeenCalledWith(
          "reaction-role",
          1,
          3,
          "ja",
        );
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: expect.any(Array),
          }),
        );
      });

      it("jumpアクションの場合はshowPaginationJumpModalを呼ぶ", async () => {
        mockParsePaginationAction.mockReturnValue("jump");
        mockShowPaginationJumpModal.mockResolvedValue("2");
        mockConfigService.findAllByGuild.mockResolvedValue(samplePanels);

        const interaction = createMockButtonInteraction(
          "reaction-role:page-jump",
        );

        await reactionRoleViewButtonHandler.execute(interaction as never);

        expect(mockShowPaginationJumpModal).toHaveBeenCalledWith(
          interaction,
          "reaction-role",
          3,
          "ja",
        );
        expect(interaction.deferUpdate).not.toHaveBeenCalled();
        expect(mockBuildViewEmbed).toHaveBeenCalledWith(samplePanels, 1, "ja");
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: expect.any(Array),
          }),
        );
      });

      it("jumpモーダルの入力がnullの場合は何もしない", async () => {
        mockParsePaginationAction.mockReturnValue("jump");
        mockShowPaginationJumpModal.mockResolvedValue(null);
        mockConfigService.findAllByGuild.mockResolvedValue(samplePanels);

        const interaction = createMockButtonInteraction(
          "reaction-role:page-jump",
        );

        await reactionRoleViewButtonHandler.execute(interaction as never);

        expect(mockBuildViewEmbed).not.toHaveBeenCalled();
      });
    });
  });

  describe("reactionRoleViewSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:view-select: プレフィックスにマッチする", () => {
        expect(
          reactionRoleViewSelectHandler.matches(
            "reaction-role:view-select:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleViewSelectHandler.matches(
            "reaction-role:teardown-select:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("guildIdがnullの場合は何もしない", async () => {
        const interaction = createMockStringSelectInteraction(
          "reaction-role:view-select:abc",
          ["0"],
          { guildId: null },
        );

        await reactionRoleViewSelectHandler.execute(interaction as never);

        expect(mockConfigService.findAllByGuild).not.toHaveBeenCalled();
      });

      it("パネルが空の場合は何もしない", async () => {
        mockConfigService.findAllByGuild.mockResolvedValue([]);

        const interaction = createMockStringSelectInteraction(
          "reaction-role:view-select:abc",
          ["0"],
        );

        await reactionRoleViewSelectHandler.execute(interaction as never);

        expect(mockBuildViewEmbed).not.toHaveBeenCalled();
      });

      it("有効な選択の場合はupdateでEmbed+pagination+selectを更新する", async () => {
        mockConfigService.findAllByGuild.mockResolvedValue(samplePanels);

        const interaction = createMockStringSelectInteraction(
          "reaction-role:view-select:abc",
          ["1"],
        );

        await reactionRoleViewSelectHandler.execute(interaction as never);

        expect(mockBuildViewEmbed).toHaveBeenCalledWith(samplePanels, 1, "ja");
        expect(mockBuildPaginationRow).toHaveBeenCalledWith(
          "reaction-role",
          1,
          3,
          "ja",
        );
        expect(interaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: expect.any(Array),
          }),
        );
      });
    });
  });
});
