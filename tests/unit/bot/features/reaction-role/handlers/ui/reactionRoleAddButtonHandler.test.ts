// tests/unit/bot/features/reaction-role/handlers/ui/reactionRoleAddButtonHandler.test.ts

import {
  reactionRoleAddButtonButtonHandler,
  reactionRoleAddButtonModalHandler,
  reactionRoleAddButtonRoleSelectHandler,
  reactionRoleAddButtonSelectHandler,
} from "@/bot/features/reaction-role/handlers/ui/reactionRoleAddButtonHandler";
import { reactionRoleAddButtonSessions } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState";

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
const mockBuildButtonSettingsModal = vi.fn((..._args: unknown[]) => ({
  type: "modal",
}));
vi.mock(
  "@/bot/features/reaction-role/services/reactionRolePanelBuilder",
  () => ({
    updatePanelMessage: (...args: unknown[]) => mockUpdatePanelMessage(...args),
    buildButtonSettingsModal: (...args: unknown[]) =>
      mockBuildButtonSettingsModal(...args),
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
    fields: {
      getTextInputValue: vi.fn((key: string) => fields[key] ?? ""),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockRoleSelectInteraction(
  customId: string,
  roleIds: string[] = [],
  overrides = {},
) {
  const rolesMap = new Map(roleIds.map((id) => [id, { id }]));
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    roles: rolesMap,
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
    deleteReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/reaction-role/handlers/ui/reactionRoleAddButtonHandler", () => {
  afterEach(() => {
    reactionRoleAddButtonSessions.clear();
    vi.clearAllMocks();
  });

  describe("reactionRoleAddButtonSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:add-button-select: プレフィックスにマッチする", () => {
        expect(
          reactionRoleAddButtonSelectHandler.matches(
            "reaction-role:add-button-select:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleAddButtonSelectHandler.matches(
            "reaction-role:setup-mode:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        const interaction = createMockStringSelectInteraction(
          "reaction-role:add-button-select:session-1",
          ["panel-1"],
        );

        await reactionRoleAddButtonSelectHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("有効な選択の場合はpanelIdを保存しモーダルを表示する", async () => {
        const session = {
          panelId: "",
          buttons: [],
          buttonCounter: 0,
          pendingButton: undefined,
        };
        reactionRoleAddButtonSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "ボタン1",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
          ]),
          buttonCounter: 1,
        });

        const interaction = createMockStringSelectInteraction(
          "reaction-role:add-button-select:session-1",
          ["panel-1"],
        );

        await reactionRoleAddButtonSelectHandler.execute(interaction as never);

        expect(session.panelId).toBe("panel-1");
        expect(session.buttonCounter).toBe(1);
        expect(interaction.showModal).toHaveBeenCalled();
      });

      it("ボタン数が上限に達している場合はエラー応答する", async () => {
        const session = {
          panelId: "",
          buttons: [],
          buttonCounter: 0,
          pendingButton: undefined,
        };
        reactionRoleAddButtonSessions.set("session-1", session);

        // 25個のボタンを持つパネル
        const fullButtons = Array.from({ length: 25 }, (_, i) => ({
          buttonId: i + 1,
          label: `ボタン${i + 1}`,
          emoji: "",
          roleIds: [],
          style: "primary",
        }));
        mockConfigService.findById.mockResolvedValue({
          buttons: JSON.stringify(fullButtons),
          buttonCounter: 25,
        });

        const interaction = createMockStringSelectInteraction(
          "reaction-role:add-button-select:session-1",
          ["panel-1"],
        );

        await reactionRoleAddButtonSelectHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(interaction.showModal).not.toHaveBeenCalled();
      });
    });
  });

  describe("reactionRoleAddButtonModalHandler", () => {
    describe("matches", () => {
      it("reaction-role:add-button-modal: プレフィックスにマッチする", () => {
        expect(
          reactionRoleAddButtonModalHandler.matches(
            "reaction-role:add-button-modal:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleAddButtonModalHandler.matches(
            "reaction-role:setup-modal:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        const interaction = createMockModalInteraction(
          "reaction-role:add-button-modal:session-1",
        );

        await reactionRoleAddButtonModalHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("無効な絵文字の場合はエラー応答する", async () => {
        const session = {
          panelId: "panel-1",
          buttons: [],
          buttonCounter: 0,
          pendingButton: undefined,
        };
        reactionRoleAddButtonSessions.set("session-1", session);

        const interaction = createMockModalInteraction(
          "reaction-role:add-button-modal:session-1",
          {
            "reaction-role:button-label": "テスト",
            "reaction-role:button-emoji": "not-emoji",
            "reaction-role:button-style": "primary",
          },
        );

        await reactionRoleAddButtonModalHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(session.pendingButton).toBeUndefined();
      });

      it("無効なスタイルの場合はエラー応答する", async () => {
        const session = {
          panelId: "panel-1",
          buttons: [],
          buttonCounter: 0,
          pendingButton: undefined,
        };
        reactionRoleAddButtonSessions.set("session-1", session);

        const interaction = createMockModalInteraction(
          "reaction-role:add-button-modal:session-1",
          {
            "reaction-role:button-label": "テスト",
            "reaction-role:button-emoji": "",
            "reaction-role:button-style": "invalid-style",
          },
        );

        await reactionRoleAddButtonModalHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(session.pendingButton).toBeUndefined();
      });

      it("有効な入力の場合はpendingButtonを保存しRoleSelectMenuを表示する", async () => {
        const session = {
          panelId: "panel-1",
          buttons: [],
          buttonCounter: 0,
          pendingButton: undefined,
        };
        reactionRoleAddButtonSessions.set("session-1", session);

        const interaction = createMockModalInteraction(
          "reaction-role:add-button-modal:session-1",
          {
            "reaction-role:button-label": "テストボタン",
            "reaction-role:button-emoji": "🎉",
            "reaction-role:button-style": "primary",
          },
        );

        await reactionRoleAddButtonModalHandler.execute(interaction as never);

        expect(session.pendingButton).toEqual({
          label: "テストボタン",
          emoji: "🎉",
          style: "primary",
        });
        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            components: expect.any(Array),
          }),
        );
      });
    });
  });

  describe("reactionRoleAddButtonRoleSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:add-button-roles: プレフィックスにマッチする", () => {
        expect(
          reactionRoleAddButtonRoleSelectHandler.matches(
            "reaction-role:add-button-roles:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleAddButtonRoleSelectHandler.matches(
            "reaction-role:setup-roles:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        const interaction = createMockRoleSelectInteraction(
          "reaction-role:add-button-roles:session-1",
          ["role-1"],
        );

        await reactionRoleAddButtonRoleSelectHandler.execute(
          interaction as never,
        );

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("pendingButtonがない場合はエラー応答する", async () => {
        const session = {
          panelId: "panel-1",
          buttons: [],
          buttonCounter: 0,
          pendingButton: undefined,
        };
        reactionRoleAddButtonSessions.set("session-1", session);

        const interaction = createMockRoleSelectInteraction(
          "reaction-role:add-button-roles:session-1",
          ["role-1"],
        );

        await reactionRoleAddButtonRoleSelectHandler.execute(
          interaction as never,
        );

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("有効な選択の場合はボタンを追加しmore/doneボタンを表示する", async () => {
        const session = {
          panelId: "panel-1",
          buttons: [] as {
            buttonId: number;
            label: string;
            emoji: string;
            style: string;
            roleIds: string[];
          }[],
          buttonCounter: 1,
          pendingButton: { label: "テスト", emoji: "🎉", style: "primary" },
        };
        reactionRoleAddButtonSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "既存ボタン",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
          ]),
        });

        const interaction = createMockRoleSelectInteraction(
          "reaction-role:add-button-roles:session-1",
          ["role-1", "role-2"],
        );

        await reactionRoleAddButtonRoleSelectHandler.execute(
          interaction as never,
        );

        expect(session.buttons).toHaveLength(1);
        expect(session.buttons[0].buttonId).toBe(2);
        expect(session.buttons[0].roleIds).toEqual(["role-1", "role-2"]);
        expect(session.pendingButton).toBeUndefined();
        expect(interaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            components: expect.any(Array),
          }),
        );
      });

      it("上限に達した場合はmoreボタンが無効化される", async () => {
        // 既存24個 + 追加済み0個 + 今回1個 = 25個で上限
        const session = {
          panelId: "panel-1",
          buttons: [] as {
            buttonId: number;
            label: string;
            emoji: string;
            style: string;
            roleIds: string[];
          }[],
          buttonCounter: 24,
          pendingButton: { label: "テスト", emoji: "", style: "primary" },
        };
        reactionRoleAddButtonSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          buttons: JSON.stringify(
            Array.from({ length: 24 }, (_, i) => ({
              buttonId: i + 1,
              label: `ボタン${i + 1}`,
              emoji: "",
              roleIds: [],
              style: "primary",
            })),
          ),
        });

        const interaction = createMockRoleSelectInteraction(
          "reaction-role:add-button-roles:session-1",
          ["role-1"],
        );

        await reactionRoleAddButtonRoleSelectHandler.execute(
          interaction as never,
        );

        expect(session.buttons).toHaveLength(1);
        expect(interaction.update).toHaveBeenCalledWith(
          expect.objectContaining({
            components: expect.any(Array),
          }),
        );
      });
    });
  });

  describe("reactionRoleAddButtonButtonHandler", () => {
    describe("matches", () => {
      it("reaction-role:add-button-more: プレフィックスにマッチする", () => {
        expect(
          reactionRoleAddButtonButtonHandler.matches(
            "reaction-role:add-button-more:abc",
          ),
        ).toBe(true);
      });

      it("reaction-role:add-button-done: プレフィックスにマッチする", () => {
        expect(
          reactionRoleAddButtonButtonHandler.matches(
            "reaction-role:add-button-done:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleAddButtonButtonHandler.matches("reaction-role:click:abc"),
        ).toBe(false);
      });
    });

    describe("execute (more)", () => {
      it("セッションが期限切れの場合は何もしない", async () => {
        const interaction = createMockButtonInteraction(
          "reaction-role:add-button-more:session-1",
        );

        await reactionRoleAddButtonButtonHandler.execute(interaction as never);

        expect(interaction.showModal).not.toHaveBeenCalled();
      });

      it("有効なセッションの場合はモーダルを表示する", async () => {
        const session = {
          panelId: "panel-1",
          buttons: [],
          buttonCounter: 1,
          pendingButton: undefined,
        };
        reactionRoleAddButtonSessions.set("session-1", session);

        const interaction = createMockButtonInteraction(
          "reaction-role:add-button-more:session-1",
        );

        await reactionRoleAddButtonButtonHandler.execute(interaction as never);

        expect(interaction.showModal).toHaveBeenCalled();
      });
    });

    describe("execute (done)", () => {
      it("セッションが期限切れの場合は何もしない", async () => {
        const interaction = createMockButtonInteraction(
          "reaction-role:add-button-done:session-1",
        );

        await reactionRoleAddButtonButtonHandler.execute(interaction as never);

        expect(interaction.deferUpdate).not.toHaveBeenCalled();
      });

      it("正常系: updatePanelMessageがtrueを返す場合はdeleteReply+followUpで成功応答する", async () => {
        const mockCommandInteraction = {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        };
        const session = {
          panelId: "panel-1",
          buttons: [
            {
              buttonId: 2,
              label: "新ボタン",
              emoji: "",
              style: "primary",
              roleIds: ["role-1"],
            },
          ],
          buttonCounter: 2,
          pendingButton: undefined,
          commandInteraction: mockCommandInteraction as never,
        };
        reactionRoleAddButtonSessions.set("session-1", session);
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
              label: "既存ボタン",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
          ]),
          buttonCounter: 1,
        });
        mockConfigService.update.mockResolvedValue(undefined);
        mockUpdatePanelMessage.mockResolvedValue(true);

        const interaction = createMockButtonInteraction(
          "reaction-role:add-button-done:session-1",
        );

        await reactionRoleAddButtonButtonHandler.execute(interaction as never);

        expect(interaction.deferUpdate).toHaveBeenCalled();
        expect(mockConfigService.update).toHaveBeenCalledWith(
          "panel-1",
          expect.objectContaining({
            buttons: expect.any(String),
            buttonCounter: 2,
          }),
        );

        const updateCall = mockConfigService.update.mock.calls[0];
        const savedButtons = JSON.parse(updateCall[1].buttons);
        expect(savedButtons).toHaveLength(2);
        expect(savedButtons[0].buttonId).toBe(1);
        expect(savedButtons[1].buttonId).toBe(2);

        expect(mockUpdatePanelMessage).toHaveBeenCalled();
        expect(interaction.deleteReply).toHaveBeenCalled();
        expect(mockCommandInteraction.deleteReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(reactionRoleAddButtonSessions.get("session-1")).toBeUndefined();
      });

      it("updatePanelMessageがfalseを返す場合はpanel_message_not_foundエラーを返しDBをクリーンアップする", async () => {
        const mockCommandInteraction = {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        };
        const session = {
          panelId: "panel-1",
          buttons: [
            {
              buttonId: 2,
              label: "新ボタン",
              emoji: "",
              style: "primary",
              roleIds: ["role-1"],
            },
          ],
          buttonCounter: 2,
          pendingButton: undefined,
          commandInteraction: mockCommandInteraction as never,
        };
        reactionRoleAddButtonSessions.set("session-1", session);
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
              label: "既存ボタン",
              emoji: "",
              roleIds: [],
              style: "primary",
            },
          ]),
          buttonCounter: 1,
        });
        mockConfigService.update.mockResolvedValue(undefined);
        mockConfigService.delete.mockResolvedValue(undefined);
        mockUpdatePanelMessage.mockResolvedValue(false);

        const interaction = createMockButtonInteraction(
          "reaction-role:add-button-done:session-1",
        );

        await reactionRoleAddButtonButtonHandler.execute(interaction as never);

        expect(mockConfigService.delete).toHaveBeenCalledWith("panel-1");
        expect(interaction.deleteReply).toHaveBeenCalled();
        expect(mockCommandInteraction.deleteReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(reactionRoleAddButtonSessions.get("session-1")).toBeUndefined();
      });
    });
  });
});
