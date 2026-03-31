// tests/unit/bot/features/reaction-role/handlers/ui/reactionRoleTeardownHandler.test.ts

import { reactionRoleTeardownSessions } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState";

import {
  reactionRoleTeardownButtonHandler,
  reactionRoleTeardownSelectHandler,
} from "@/bot/features/reaction-role/handlers/ui/reactionRoleTeardownHandler";

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

function createMockStringSelectInteraction(
  customId: string,
  values: string[] = [],
  overrides = {},
) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    values,
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockButtonInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    client: {
      channels: { fetch: vi.fn() },
    },
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/reaction-role/handlers/ui/reactionRoleTeardownHandler", () => {
  afterEach(() => {
    reactionRoleTeardownSessions.clear();
    vi.clearAllMocks();
  });

  describe("reactionRoleTeardownSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:teardown-select: プレフィックスにマッチする", () => {
        expect(
          reactionRoleTeardownSelectHandler.matches(
            "reaction-role:teardown-select:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleTeardownSelectHandler.matches(
            "reaction-role:view-select:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        // session-1 をセットしない → get で undefined が返る

        const interaction = createMockStringSelectInteraction(
          "reaction-role:teardown-select:session-1",
          ["panel-1"],
        );

        await reactionRoleTeardownSelectHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("有効な選択の場合はpanelIdsを保存し確認Embedとボタンを表示する", async () => {
        const session = { panelIds: [] as string[] };
        reactionRoleTeardownSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          title: "テストパネル",
          channelId: "ch-1",
        });

        const interaction = createMockStringSelectInteraction(
          "reaction-role:teardown-select:session-1",
          ["panel-1", "panel-2"],
        );

        await reactionRoleTeardownSelectHandler.execute(interaction as never);

        expect(session.panelIds).toEqual(["panel-1", "panel-2"]);
        expect(interaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: expect.any(Array),
          }),
        );
      });
    });
  });

  describe("reactionRoleTeardownButtonHandler", () => {
    describe("matches", () => {
      it("reaction-role:teardown-confirm: プレフィックスにマッチする", () => {
        expect(
          reactionRoleTeardownButtonHandler.matches(
            "reaction-role:teardown-confirm:abc",
          ),
        ).toBe(true);
      });

      it("reaction-role:teardown-cancel: プレフィックスにマッチする", () => {
        expect(
          reactionRoleTeardownButtonHandler.matches(
            "reaction-role:teardown-cancel:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleTeardownButtonHandler.matches("reaction-role:click:abc"),
        ).toBe(false);
      });
    });

    describe("execute (cancel)", () => {
      it("キャンセル時にセッションを削除しInfoEmbedで更新する", async () => {
        reactionRoleTeardownSessions.set("session-1", { panelIds: [] });

        const interaction = createMockButtonInteraction(
          "reaction-role:teardown-cancel:session-1",
        );

        await reactionRoleTeardownButtonHandler.execute(interaction as never);

        expect(reactionRoleTeardownSessions.get("session-1")).toBeUndefined();
        expect(interaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: [],
          }),
        );
      });
    });

    describe("execute (confirm)", () => {
      it("セッションが期限切れの場合はエラーEmbedで更新しコンポーネントを空にする", async () => {
        // session-1 をセットしない → get で undefined が返る

        const interaction = createMockButtonInteraction(
          "reaction-role:teardown-confirm:session-1",
        );

        await reactionRoleTeardownButtonHandler.execute(interaction as never);

        expect(interaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: [],
          }),
        );
      });

      it("正常系: deferUpdateしパネルメッセージを削除しDBレコードを削除しeditReplyで成功応答する", async () => {
        reactionRoleTeardownSessions.set("session-1", {
          panelIds: ["panel-1", "panel-2"],
        });

        const mockMessage = { delete: vi.fn().mockResolvedValue(undefined) };
        const mockChannel = {
          messages: { fetch: vi.fn().mockResolvedValue(mockMessage) },
        };
        const mockClient = {
          channels: { fetch: vi.fn().mockResolvedValue(mockChannel) },
        };

        mockConfigService.findById
          .mockResolvedValueOnce({
            channelId: "ch-1",
            messageId: "msg-1",
          })
          .mockResolvedValueOnce({
            channelId: "ch-2",
            messageId: "msg-2",
          });
        mockConfigService.delete.mockResolvedValue(undefined);

        const interaction = createMockButtonInteraction(
          "reaction-role:teardown-confirm:session-1",
          { client: mockClient },
        );

        await reactionRoleTeardownButtonHandler.execute(interaction as never);

        expect(interaction.deferUpdate).toHaveBeenCalled();
        expect(mockClient.channels.fetch).toHaveBeenCalledWith("ch-1");
        expect(mockClient.channels.fetch).toHaveBeenCalledWith("ch-2");
        expect(mockMessage.delete).toHaveBeenCalledTimes(2);
        expect(mockConfigService.delete).toHaveBeenCalledWith("panel-1");
        expect(mockConfigService.delete).toHaveBeenCalledWith("panel-2");
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: [],
          }),
        );
        expect(reactionRoleTeardownSessions.get("session-1")).toBeUndefined();
      });
    });
  });
});
