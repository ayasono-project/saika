// tests/unit/bot/features/reaction-role/handlers/ui/reactionRoleRemoveButtonHandler.test.ts

import {
  reactionRoleRemoveButtonButtonHandler,
  reactionRoleRemoveButtonPanelSelectHandler,
  reactionRoleRemoveButtonSelectHandler,
} from "@/bot/features/reaction-role/handlers/ui/reactionRoleRemoveButtonHandler";
import { reactionRoleRemoveButtonSessions } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState";

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
    ...overrides,
  };
}

function createMockButtonInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    client: {},
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/reaction-role/handlers/ui/reactionRoleRemoveButtonHandler", () => {
  afterEach(() => {
    reactionRoleRemoveButtonSessions.clear();
    vi.clearAllMocks();
  });

  describe("reactionRoleRemoveButtonPanelSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:remove-button-panel: プレフィックスにマッチする", () => {
        expect(
          reactionRoleRemoveButtonPanelSelectHandler.matches(
            "reaction-role:remove-button-panel:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleRemoveButtonPanelSelectHandler.matches(
            "reaction-role:teardown-select:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        // session-1 をセットしない → get で undefined が返る

        const interaction = createMockStringSelectInteraction(
          "reaction-role:remove-button-panel:session-1",
          ["panel-1"],
        );

        await reactionRoleRemoveButtonPanelSelectHandler.execute(
          interaction as never,
        );

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("有効な選択の場合はpanelIdを保存しボタン選択メニューを表示する", async () => {
        const session = { panelId: "", buttonIds: [] as number[] };
        reactionRoleRemoveButtonSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "ボタン1",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
            {
              buttonId: 2,
              label: "ボタン2",
              emoji: "🎉",
              roleIds: [],
              style: "secondary",
            },
          ]),
        });

        const interaction = createMockStringSelectInteraction(
          "reaction-role:remove-button-panel:session-1",
          ["panel-1"],
        );

        await reactionRoleRemoveButtonPanelSelectHandler.execute(
          interaction as never,
        );

        expect(session.panelId).toBe("panel-1");
        expect(interaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            components: expect.any(Array),
          }),
        );
      });
    });
  });

  describe("reactionRoleRemoveButtonSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:remove-button-select: プレフィックスにマッチする", () => {
        expect(
          reactionRoleRemoveButtonSelectHandler.matches(
            "reaction-role:remove-button-select:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleRemoveButtonSelectHandler.matches(
            "reaction-role:remove-button-panel:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        // session-1 をセットしない → get で undefined が返る

        const interaction = createMockStringSelectInteraction(
          "reaction-role:remove-button-select:session-1",
          ["1"],
        );

        await reactionRoleRemoveButtonSelectHandler.execute(
          interaction as never,
        );

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("全ボタンを選択した場合はcannot_remove_all_buttonsエラーを返す", async () => {
        const session = { panelId: "panel-1", buttonIds: [] as number[] };
        reactionRoleRemoveButtonSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "ボタン1",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
            {
              buttonId: 2,
              label: "ボタン2",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
          ]),
        });

        const interaction = createMockStringSelectInteraction(
          "reaction-role:remove-button-select:session-1",
          ["1", "2"],
        );

        await reactionRoleRemoveButtonSelectHandler.execute(
          interaction as never,
        );

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("有効な選択の場合はbuttonIdsを保存し確認Embedを表示する", async () => {
        const session = { panelId: "panel-1", buttonIds: [] as number[] };
        reactionRoleRemoveButtonSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "ボタン1",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
            {
              buttonId: 2,
              label: "ボタン2",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
            {
              buttonId: 3,
              label: "ボタン3",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
          ]),
        });

        const interaction = createMockStringSelectInteraction(
          "reaction-role:remove-button-select:session-1",
          ["1", "2"],
        );

        await reactionRoleRemoveButtonSelectHandler.execute(
          interaction as never,
        );

        expect(session.buttonIds).toEqual([1, 2]);
        expect(interaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: expect.any(Array),
          }),
        );
      });
    });
  });

  describe("reactionRoleRemoveButtonButtonHandler", () => {
    describe("matches", () => {
      it("reaction-role:remove-button-confirm: プレフィックスにマッチする", () => {
        expect(
          reactionRoleRemoveButtonButtonHandler.matches(
            "reaction-role:remove-button-confirm:abc",
          ),
        ).toBe(true);
      });

      it("reaction-role:remove-button-cancel: プレフィックスにマッチする", () => {
        expect(
          reactionRoleRemoveButtonButtonHandler.matches(
            "reaction-role:remove-button-cancel:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleRemoveButtonButtonHandler.matches(
            "reaction-role:click:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute (cancel)", () => {
      it("キャンセル時にInfoEmbedで更新しコンポーネントを空にする", async () => {
        reactionRoleRemoveButtonSessions.set("session-1", {
          panelId: "panel-1",
          buttonIds: [],
        });

        const interaction = createMockButtonInteraction(
          "reaction-role:remove-button-cancel:session-1",
        );

        await reactionRoleRemoveButtonButtonHandler.execute(
          interaction as never,
        );

        expect(
          reactionRoleRemoveButtonSessions.get("session-1"),
        ).toBeUndefined();
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
          "reaction-role:remove-button-confirm:session-1",
        );

        await reactionRoleRemoveButtonButtonHandler.execute(
          interaction as never,
        );

        expect(interaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: [],
          }),
        );
      });

      it("正常系: updatePanelMessageがtrueを返す場合はボタンをDBから削除し成功応答する", async () => {
        reactionRoleRemoveButtonSessions.set("session-1", {
          panelId: "panel-1",
          buttonIds: [1, 2],
        });
        mockConfigService.findById.mockResolvedValue({
          id: "panel-1",
          channelId: "ch-1",
          messageId: "msg-1",
          title: "テストパネル",
          description: "説明",
          color: "#000000",
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "ボタン1",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
            {
              buttonId: 2,
              label: "ボタン2",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
            {
              buttonId: 3,
              label: "ボタン3",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
          ]),
        });
        mockConfigService.update.mockResolvedValue(undefined);
        mockUpdatePanelMessage.mockResolvedValue(true);

        const interaction = createMockButtonInteraction(
          "reaction-role:remove-button-confirm:session-1",
        );

        await reactionRoleRemoveButtonButtonHandler.execute(
          interaction as never,
        );

        expect(interaction.deferUpdate).toHaveBeenCalled();
        expect(mockConfigService.update).toHaveBeenCalledWith(
          "panel-1",
          expect.objectContaining({
            buttons: expect.any(String),
          }),
        );
        // remainingButtons should only contain buttonId: 3
        const updateCall = mockConfigService.update.mock.calls[0];
        const savedButtons = JSON.parse(updateCall[1].buttons);
        expect(savedButtons).toHaveLength(1);
        expect(savedButtons[0].buttonId).toBe(3);

        expect(mockUpdatePanelMessage).toHaveBeenCalled();
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: [],
          }),
        );
        expect(
          reactionRoleRemoveButtonSessions.get("session-1"),
        ).toBeUndefined();
      });

      it("updatePanelMessageがfalseを返す場合はpanel_message_not_foundエラーを返しDBをクリーンアップする", async () => {
        reactionRoleRemoveButtonSessions.set("session-1", {
          panelId: "panel-1",
          buttonIds: [1],
        });
        mockConfigService.findById.mockResolvedValue({
          id: "panel-1",
          channelId: "ch-1",
          messageId: "msg-1",
          title: "テストパネル",
          description: "説明",
          color: "#000000",
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "ボタン1",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
            {
              buttonId: 2,
              label: "ボタン2",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
          ]),
        });
        mockConfigService.update.mockResolvedValue(undefined);
        mockConfigService.delete.mockResolvedValue(undefined);
        mockUpdatePanelMessage.mockResolvedValue(false);

        const interaction = createMockButtonInteraction(
          "reaction-role:remove-button-confirm:session-1",
        );

        await reactionRoleRemoveButtonButtonHandler.execute(
          interaction as never,
        );

        expect(mockConfigService.delete).toHaveBeenCalledWith("panel-1");
        expect(interaction.editReply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: [],
          }),
        );
        expect(
          reactionRoleRemoveButtonSessions.get("session-1"),
        ).toBeUndefined();
      });
    });
  });
});
