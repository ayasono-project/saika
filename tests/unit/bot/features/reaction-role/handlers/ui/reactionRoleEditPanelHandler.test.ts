// tests/unit/bot/features/reaction-role/handlers/ui/reactionRoleEditPanelHandler.test.ts

import {
  reactionRoleEditPanelModalHandler,
  reactionRoleEditPanelSelectHandler,
} from "@/bot/features/reaction-role/handlers/ui/reactionRoleEditPanelHandler";
import { reactionRoleEditPanelSessions } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState";

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

vi.mock(
  "@/bot/features/reaction-role/commands/usecases/reactionRoleConfigEditPanel",
  () => ({
    buildEditPanelModal: vi.fn(() => ({ type: "modal" })),
  }),
);

const mockUpdatePanelMessage = vi.fn();
vi.mock(
  "@/bot/features/reaction-role/services/reactionRolePanelBuilder",
  () => ({
    updatePanelMessage: (...args: unknown[]) => mockUpdatePanelMessage(...args),
  }),
);

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
    showModal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockModalInteraction(
  customId: string,
  fields: Record<string, string> = {},
  overrides = {},
) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    client: {},
    fields: {
      getTextInputValue: vi.fn((key: string) => fields[key] ?? ""),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/reaction-role/handlers/ui/reactionRoleEditPanelHandler", () => {
  afterEach(() => {
    reactionRoleEditPanelSessions.clear();
    vi.clearAllMocks();
  });

  describe("reactionRoleEditPanelSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:edit-panel-select: プレフィックスにマッチする", () => {
        expect(
          reactionRoleEditPanelSelectHandler.matches(
            "reaction-role:edit-panel-select:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleEditPanelSelectHandler.matches(
            "reaction-role:teardown-select:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        // session-1 をセットしない → get で undefined が返る

        const interaction = createMockStringSelectInteraction(
          "reaction-role:edit-panel-select:session-1",
          ["panel-1"],
        );

        await reactionRoleEditPanelSelectHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("有効な選択の場合はpanelIdを保存しモーダルを表示する", async () => {
        const session = { panelId: "" };
        reactionRoleEditPanelSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          title: "テストパネル",
          description: "テスト説明",
          color: "#FF0000",
        });

        const interaction = createMockStringSelectInteraction(
          "reaction-role:edit-panel-select:session-1",
          ["panel-1"],
        );

        await reactionRoleEditPanelSelectHandler.execute(interaction as never);

        expect(session.panelId).toBe("panel-1");
        expect(interaction.showModal).toHaveBeenCalled();
      });
    });
  });

  describe("reactionRoleEditPanelModalHandler", () => {
    describe("matches", () => {
      it("reaction-role:edit-panel-modal: プレフィックスにマッチする", () => {
        expect(
          reactionRoleEditPanelModalHandler.matches(
            "reaction-role:edit-panel-modal:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleEditPanelModalHandler.matches(
            "reaction-role:setup-modal:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        // session-1 をセットしない → get で undefined が返る

        const interaction = createMockModalInteraction(
          "reaction-role:edit-panel-modal:session-1",
        );

        await reactionRoleEditPanelModalHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("無効なカラーコードの場合はエラー応答する", async () => {
        reactionRoleEditPanelSessions.set("session-1", { panelId: "panel-1" });

        const interaction = createMockModalInteraction(
          "reaction-role:edit-panel-modal:session-1",
          {
            "reaction-role:edit-panel-title": "新タイトル",
            "reaction-role:edit-panel-description": "新説明",
            "reaction-role:edit-panel-color": "invalid-color",
          },
        );

        await reactionRoleEditPanelModalHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(interaction.deferReply).not.toHaveBeenCalled();
      });

      it("updatePanelMessageがtrueを返す場合は成功応答する", async () => {
        const mockCommandInteraction = {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        };
        reactionRoleEditPanelSessions.set("session-1", {
          panelId: "panel-1",
          commandInteraction: mockCommandInteraction as never,
        });
        mockConfigService.findById.mockResolvedValue({
          id: "panel-1",
          channelId: "ch-1",
          messageId: "msg-1",
          title: "旧タイトル",
          description: "旧説明",
          color: "#000000",
          buttons: "[]",
        });
        mockConfigService.update.mockResolvedValue(undefined);
        mockUpdatePanelMessage.mockResolvedValue(true);

        const interaction = createMockModalInteraction(
          "reaction-role:edit-panel-modal:session-1",
          {
            "reaction-role:edit-panel-title": "新タイトル",
            "reaction-role:edit-panel-description": "新説明",
            "reaction-role:edit-panel-color": "#FF0000",
          },
        );

        await reactionRoleEditPanelModalHandler.execute(interaction as never);

        expect(interaction.deferReply).toHaveBeenCalled();
        expect(mockCommandInteraction.deleteReply).toHaveBeenCalled();
        expect(mockConfigService.update).toHaveBeenCalledWith("panel-1", {
          title: "新タイトル",
          description: "新説明",
          color: "#FF0000",
        });
        expect(mockUpdatePanelMessage).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(reactionRoleEditPanelSessions.get("session-1")).toBeUndefined();
      });

      it("updatePanelMessageがfalseを返す場合はpanel_message_not_foundエラーを返しDBを削除する", async () => {
        const mockCommandInteraction = {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        };
        reactionRoleEditPanelSessions.set("session-1", {
          panelId: "panel-1",
          commandInteraction: mockCommandInteraction as never,
        });
        mockConfigService.findById.mockResolvedValue({
          id: "panel-1",
          channelId: "ch-1",
          messageId: "msg-1",
          title: "旧タイトル",
          description: "旧説明",
          color: "#000000",
          buttons: "[]",
        });
        mockConfigService.update.mockResolvedValue(undefined);
        mockConfigService.delete.mockResolvedValue(undefined);
        mockUpdatePanelMessage.mockResolvedValue(false);

        const interaction = createMockModalInteraction(
          "reaction-role:edit-panel-modal:session-1",
          {
            "reaction-role:edit-panel-title": "新タイトル",
            "reaction-role:edit-panel-description": "新説明",
            "reaction-role:edit-panel-color": "#FF0000",
          },
        );

        await reactionRoleEditPanelModalHandler.execute(interaction as never);

        expect(mockConfigService.delete).toHaveBeenCalledWith("panel-1");
        expect(mockCommandInteraction.deleteReply).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(reactionRoleEditPanelSessions.get("session-1")).toBeUndefined();
      });
    });
  });
});
