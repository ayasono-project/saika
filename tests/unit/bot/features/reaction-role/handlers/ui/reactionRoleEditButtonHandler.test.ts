// tests/unit/bot/features/reaction-role/handlers/ui/reactionRoleEditButtonHandler.test.ts

import {
  reactionRoleEditButtonModalHandler,
  reactionRoleEditButtonPanelSelectHandler,
  reactionRoleEditButtonRoleSelectHandler,
  reactionRoleEditButtonSelectHandler,
} from "@/bot/features/reaction-role/handlers/ui/reactionRoleEditButtonHandler";
import { reactionRoleEditButtonSessions } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState";

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
    client: {},
    roles: rolesMap,
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("bot/features/reaction-role/handlers/ui/reactionRoleEditButtonHandler", () => {
  afterEach(() => {
    reactionRoleEditButtonSessions.clear();
    vi.clearAllMocks();
  });

  describe("reactionRoleEditButtonPanelSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:edit-button-panel: プレフィックスにマッチする", () => {
        expect(
          reactionRoleEditButtonPanelSelectHandler.matches(
            "reaction-role:edit-button-panel:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleEditButtonPanelSelectHandler.matches(
            "reaction-role:setup-mode:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        const interaction = createMockStringSelectInteraction(
          "reaction-role:edit-button-panel:session-1",
          ["panel-1"],
        );

        await reactionRoleEditButtonPanelSelectHandler.execute(
          interaction as never,
        );

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("有効な選択の場合はpanelIdを保存しボタン選択セレクトメニューを表示する", async () => {
        const session = {
          panelId: "",
          buttonId: 0,
          pendingButton: undefined,
        };
        reactionRoleEditButtonSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "ボタン1",
              emoji: "",
              roleIds: ["role-1"],
              style: "primary",
            },
            {
              buttonId: 2,
              label: "ボタン2",
              emoji: "🎉",
              roleIds: ["role-2"],
              style: "secondary",
            },
          ]),
        });

        const interaction = createMockStringSelectInteraction(
          "reaction-role:edit-button-panel:session-1",
          ["panel-1"],
        );

        await reactionRoleEditButtonPanelSelectHandler.execute(
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

  describe("reactionRoleEditButtonSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:edit-button-select: プレフィックスにマッチする", () => {
        expect(
          reactionRoleEditButtonSelectHandler.matches(
            "reaction-role:edit-button-select:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleEditButtonSelectHandler.matches(
            "reaction-role:setup-mode:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        const interaction = createMockStringSelectInteraction(
          "reaction-role:edit-button-select:session-1",
          ["1"],
        );

        await reactionRoleEditButtonSelectHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("有効な選択の場合はbuttonIdを保存しプリフィル済みモーダルを表示する", async () => {
        const session = {
          panelId: "panel-1",
          buttonId: 0,
          pendingButton: undefined,
        };
        reactionRoleEditButtonSessions.set("session-1", session);
        mockConfigService.findById.mockResolvedValue({
          buttons: JSON.stringify([
            {
              buttonId: 1,
              label: "既存ボタン",
              emoji: "🎉",
              roleIds: ["role-1"],
              style: "secondary",
            },
          ]),
        });

        const interaction = createMockStringSelectInteraction(
          "reaction-role:edit-button-select:session-1",
          ["1"],
        );

        await reactionRoleEditButtonSelectHandler.execute(interaction as never);

        expect(session.buttonId).toBe(1);
        expect(interaction.showModal).toHaveBeenCalled();
      });
    });
  });

  describe("reactionRoleEditButtonModalHandler", () => {
    describe("matches", () => {
      it("reaction-role:edit-button-modal: プレフィックスにマッチする", () => {
        expect(
          reactionRoleEditButtonModalHandler.matches(
            "reaction-role:edit-button-modal:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleEditButtonModalHandler.matches(
            "reaction-role:setup-modal:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        const interaction = createMockModalInteraction(
          "reaction-role:edit-button-modal:session-1",
        );

        await reactionRoleEditButtonModalHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("無効な絵文字の場合はエラー応答する", async () => {
        const session = {
          panelId: "panel-1",
          buttonId: 1,
          pendingButton: undefined,
        };
        reactionRoleEditButtonSessions.set("session-1", session);

        const interaction = createMockModalInteraction(
          "reaction-role:edit-button-modal:session-1",
          {
            "reaction-role:button-label": "テスト",
            "reaction-role:button-emoji": "not-emoji",
            "reaction-role:button-style": "primary",
          },
        );

        await reactionRoleEditButtonModalHandler.execute(interaction as never);

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
          buttonId: 1,
          pendingButton: undefined,
        };
        reactionRoleEditButtonSessions.set("session-1", session);

        const interaction = createMockModalInteraction(
          "reaction-role:edit-button-modal:session-1",
          {
            "reaction-role:button-label": "テスト",
            "reaction-role:button-emoji": "",
            "reaction-role:button-style": "invalid-style",
          },
        );

        await reactionRoleEditButtonModalHandler.execute(interaction as never);

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
          buttonId: 1,
          pendingButton: undefined,
        };
        reactionRoleEditButtonSessions.set("session-1", session);

        const interaction = createMockModalInteraction(
          "reaction-role:edit-button-modal:session-1",
          {
            "reaction-role:button-label": "編集後ボタン",
            "reaction-role:button-emoji": "🎉",
            "reaction-role:button-style": "primary",
          },
        );

        await reactionRoleEditButtonModalHandler.execute(interaction as never);

        expect(session.pendingButton).toEqual({
          label: "編集後ボタン",
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

  describe("reactionRoleEditButtonRoleSelectHandler", () => {
    describe("matches", () => {
      it("reaction-role:edit-button-roles: プレフィックスにマッチする", () => {
        expect(
          reactionRoleEditButtonRoleSelectHandler.matches(
            "reaction-role:edit-button-roles:abc",
          ),
        ).toBe(true);
      });

      it("無関係なcustomIdにはマッチしない", () => {
        expect(
          reactionRoleEditButtonRoleSelectHandler.matches(
            "reaction-role:setup-roles:abc",
          ),
        ).toBe(false);
      });
    });

    describe("execute", () => {
      it("セッションが期限切れの場合はエラー応答する", async () => {
        const interaction = createMockRoleSelectInteraction(
          "reaction-role:edit-button-roles:session-1",
          ["role-1"],
        );

        await reactionRoleEditButtonRoleSelectHandler.execute(
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
          buttonId: 1,
          pendingButton: undefined,
        };
        reactionRoleEditButtonSessions.set("session-1", session);

        const interaction = createMockRoleSelectInteraction(
          "reaction-role:edit-button-roles:session-1",
          ["role-1"],
        );

        await reactionRoleEditButtonRoleSelectHandler.execute(
          interaction as never,
        );

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
      });

      it("正常系: updatePanelMessageがtrueを返す場合はDB更新+deleteReply+followUpで成功応答する", async () => {
        const mockCommandInteraction = {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        };
        const session = {
          panelId: "panel-1",
          buttonId: 1,
          pendingButton: {
            label: "編集後ボタン",
            emoji: "🎉",
            style: "secondary",
          },
          commandInteraction: mockCommandInteraction as never,
        };
        reactionRoleEditButtonSessions.set("session-1", session);
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
              roleIds: ["role-old"],
              style: "primary",
            },
          ]),
        });
        mockConfigService.update.mockResolvedValue(undefined);
        mockUpdatePanelMessage.mockResolvedValue(true);

        const interaction = createMockRoleSelectInteraction(
          "reaction-role:edit-button-roles:session-1",
          ["role-1", "role-2"],
        );

        await reactionRoleEditButtonRoleSelectHandler.execute(
          interaction as never,
        );

        expect(interaction.deferUpdate).toHaveBeenCalled();
        expect(mockConfigService.update).toHaveBeenCalledWith(
          "panel-1",
          expect.objectContaining({
            buttons: expect.any(String),
          }),
        );

        const updateCall = mockConfigService.update.mock.calls[0];
        const savedButtons = JSON.parse(updateCall[1].buttons);
        expect(savedButtons).toHaveLength(1);
        expect(savedButtons[0].buttonId).toBe(1);
        expect(savedButtons[0].label).toBe("編集後ボタン");
        expect(savedButtons[0].emoji).toBe("🎉");
        expect(savedButtons[0].style).toBe("secondary");
        expect(savedButtons[0].roleIds).toEqual(["role-1", "role-2"]);

        expect(mockUpdatePanelMessage).toHaveBeenCalled();
        expect(interaction.deleteReply).toHaveBeenCalled();
        expect(mockCommandInteraction.deleteReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(reactionRoleEditButtonSessions.get("session-1")).toBeUndefined();
      });

      it("updatePanelMessageがfalseを返す場合はpanel_message_not_foundエラーを返しDBをクリーンアップする", async () => {
        const mockCommandInteraction = {
          deleteReply: vi.fn().mockResolvedValue(undefined),
        };
        const session = {
          panelId: "panel-1",
          buttonId: 1,
          pendingButton: { label: "編集後ボタン", emoji: "", style: "primary" },
          commandInteraction: mockCommandInteraction as never,
        };
        reactionRoleEditButtonSessions.set("session-1", session);
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
              roleIds: ["role-old"],
              style: "primary",
            },
          ]),
        });
        mockConfigService.update.mockResolvedValue(undefined);
        mockConfigService.delete.mockResolvedValue(undefined);
        mockUpdatePanelMessage.mockResolvedValue(false);

        const interaction = createMockRoleSelectInteraction(
          "reaction-role:edit-button-roles:session-1",
          ["role-1"],
        );

        await reactionRoleEditButtonRoleSelectHandler.execute(
          interaction as never,
        );

        expect(mockConfigService.delete).toHaveBeenCalledWith("panel-1");
        expect(interaction.deleteReply).toHaveBeenCalled();
        expect(mockCommandInteraction.deleteReply).toHaveBeenCalled();
        expect(interaction.followUp).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
          }),
        );
        expect(reactionRoleEditButtonSessions.get("session-1")).toBeUndefined();
      });
    });
  });
});
