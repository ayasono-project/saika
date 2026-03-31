// tests/unit/bot/features/reaction-role/handlers/ui/reactionRoleSetupHandlers.test.ts

import type { ReactionRoleSetupSession } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState";
import { reactionRoleSetupSessions } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupState";

const mockConfigService = { create: vi.fn() };

vi.mock("@/shared/locale/localeManager", () => ({
  logPrefixed: (p: string, m: string, params?: Record<string, unknown>) =>
    params ? `[${p}] ${m}:${JSON.stringify(params)}` : `[${p}] ${m}`,
  tDefault: vi.fn((key: string) => key),
  tInteraction: (_locale: string, key: string) => key,
}));
vi.mock("@/shared/utils/logger", () => ({
  logger: { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotReactionRolePanelConfigService: () => mockConfigService,
}));
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: vi.fn(() => ({ type: "success" })),
  createErrorEmbed: vi.fn(() => ({ type: "error" })),
}));

import { reactionRoleSetupButtonHandler } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupButtonHandler";
import { reactionRoleSetupButtonModalHandler } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupButtonModalHandler";
import { reactionRoleSetupModalHandler } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupModalHandler";
import { reactionRoleSetupModeSelectHandler } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupModeSelectHandler";
import { reactionRoleSetupRoleSelectHandler } from "@/bot/features/reaction-role/handlers/ui/reactionRoleSetupRoleSelectHandler";

// ---------- ヘルパー ----------

function createBaseSession(
  overrides: Partial<ReactionRoleSetupSession> = {},
): ReactionRoleSetupSession {
  return {
    title: "Test Panel",
    description: "Description",
    color: "#00A8F3",
    mode: "",
    buttons: [],
    buttonCounter: 0,
    ...overrides,
  };
}

function createMockModalInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    fields: {
      getTextInputValue: vi.fn((fieldId: string) => {
        const map: Record<string, string> = {
          "reaction-role:setup-title": "My Panel",
          "reaction-role:setup-description": "Pick your roles",
          "reaction-role:setup-color": "#FF0000",
          "reaction-role:button-label": "Role A",
          "reaction-role:button-emoji": "🎉",
          "reaction-role:button-style": "primary",
        };
        return map[fieldId] ?? "";
      }),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockSelectInteraction(
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
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockRoleSelectInteraction(
  customId: string,
  roleIds: string[] = ["role-1"],
  overrides = {},
) {
  const rolesMap = new Map(roleIds.map((id) => [id, { id, name: id }]));
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    roles: rolesMap,
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createMockButtonInteraction(customId: string, overrides = {}) {
  return {
    customId,
    locale: "ja",
    guildId: "guild-1",
    channel: null as unknown,
    reply: vi.fn().mockResolvedValue(undefined),
    update: vi.fn().mockResolvedValue(undefined),
    deferUpdate: vi.fn().mockResolvedValue(undefined),
    deferReply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
    showModal: vi.fn().mockResolvedValue(undefined),
    deleteReply: vi.fn().mockResolvedValue(undefined),
    followUp: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// ---------- テスト ----------

describe("bot/features/reaction-role/handlers/ui/reactionRoleSetupHandlers", () => {
  afterEach(() => {
    reactionRoleSetupSessions.clear();
    vi.clearAllMocks();
  });

  // ===== reactionRoleSetupModalHandler =====
  describe("reactionRoleSetupModalHandler", () => {
    it("matches: 'reaction-role:setup-modal:xxx' にマッチする", () => {
      expect(
        reactionRoleSetupModalHandler.matches("reaction-role:setup-modal:abc"),
      ).toBe(true);
    });

    it("matches: 無関係な customId にはマッチしない", () => {
      expect(
        reactionRoleSetupModalHandler.matches("reaction-role:setup-mode:abc"),
      ).toBe(false);
      expect(reactionRoleSetupModalHandler.matches("other:id")).toBe(false);
    });

    it("セッション期限切れの場合、エラーを返す", async () => {
      const interaction = createMockModalInteraction(
        "reaction-role:setup-modal:expired-session",
      );

      await reactionRoleSetupModalHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [{ type: "error" }],
        }),
      );
    });

    it("有効な送信でセッションにタイトル・説明・カラーを保存し、モード選択メニューを返す", async () => {
      const session = createBaseSession();
      reactionRoleSetupSessions.set("s1", session);
      const interaction = createMockModalInteraction(
        "reaction-role:setup-modal:s1",
      );

      await reactionRoleSetupModalHandler.execute(interaction as never);

      expect(session.title).toBe("My Panel");
      expect(session.description).toBe("Pick your roles");
      expect(session.color).toBe("#FF0000");
      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.any(Array),
        }),
      );
    });

    it("無効なカラーコードの場合、エラーを返す", async () => {
      const session = createBaseSession();
      reactionRoleSetupSessions.set("s1", session);
      const interaction = createMockModalInteraction(
        "reaction-role:setup-modal:s1",
        {
          fields: {
            getTextInputValue: vi.fn((fieldId: string) => {
              if (fieldId === "reaction-role:setup-color") return "not-a-color";
              if (fieldId === "reaction-role:setup-title") return "Title";
              if (fieldId === "reaction-role:setup-description")
                return "Description";
              return "";
            }),
          },
        },
      );

      await reactionRoleSetupModalHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [{ type: "error" }],
        }),
      );
    });
  });

  // ===== reactionRoleSetupModeSelectHandler =====
  describe("reactionRoleSetupModeSelectHandler", () => {
    it("matches: 'reaction-role:setup-mode:xxx' にマッチする", () => {
      expect(
        reactionRoleSetupModeSelectHandler.matches(
          "reaction-role:setup-mode:abc",
        ),
      ).toBe(true);
    });

    it("セッション期限切れの場合、エラーを返す", async () => {
      const interaction = createMockSelectInteraction(
        "reaction-role:setup-mode:expired",
        ["toggle"],
      );

      await reactionRoleSetupModeSelectHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [{ type: "error" }],
        }),
      );
    });

    it("有効な選択でモードをセッションに保存し、モーダルを表示して返信を削除する", async () => {
      const session = createBaseSession();
      reactionRoleSetupSessions.set("s1", session);
      const interaction = createMockSelectInteraction(
        "reaction-role:setup-mode:s1",
        ["toggle"],
      );

      await reactionRoleSetupModeSelectHandler.execute(interaction as never);

      expect(session.mode).toBe("toggle");
      expect(interaction.showModal).toHaveBeenCalled();
      expect(interaction.deleteReply).toHaveBeenCalled();
    });
  });

  // ===== reactionRoleSetupButtonModalHandler =====
  describe("reactionRoleSetupButtonModalHandler", () => {
    it("matches: 'reaction-role:setup-button-modal:xxx' にマッチする", () => {
      expect(
        reactionRoleSetupButtonModalHandler.matches(
          "reaction-role:setup-button-modal:abc",
        ),
      ).toBe(true);
    });

    it("セッション期限切れの場合、エラーを返す", async () => {
      const interaction = createMockModalInteraction(
        "reaction-role:setup-button-modal:expired",
      );

      await reactionRoleSetupButtonModalHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [{ type: "error" }],
        }),
      );
    });

    it("無効なスタイルの場合、エラーを返す", async () => {
      const session = createBaseSession();
      reactionRoleSetupSessions.set("s1", session);
      const interaction = createMockModalInteraction(
        "reaction-role:setup-button-modal:s1",
        {
          fields: {
            getTextInputValue: vi.fn((fieldId: string) => {
              if (fieldId === "reaction-role:button-label") return "Label";
              if (fieldId === "reaction-role:button-emoji") return "";
              if (fieldId === "reaction-role:button-style") return "invalid";
              return "";
            }),
          },
        },
      );

      await reactionRoleSetupButtonModalHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [{ type: "error" }],
        }),
      );
    });

    it("無効な絵文字の場合、エラーを返す", async () => {
      const session = createBaseSession();
      reactionRoleSetupSessions.set("s1", session);
      const interaction = createMockModalInteraction(
        "reaction-role:setup-button-modal:s1",
        {
          fields: {
            getTextInputValue: vi.fn((fieldId: string) => {
              if (fieldId === "reaction-role:button-label") return "Label";
              if (fieldId === "reaction-role:button-emoji") return "not-emoji";
              if (fieldId === "reaction-role:button-style") return "primary";
              return "";
            }),
          },
        },
      );

      await reactionRoleSetupButtonModalHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [{ type: "error" }],
        }),
      );
    });

    it("有効な送信で pendingButton を保存し、RoleSelectMenu を返す", async () => {
      const session = createBaseSession();
      reactionRoleSetupSessions.set("s1", session);
      const interaction = createMockModalInteraction(
        "reaction-role:setup-button-modal:s1",
      );

      await reactionRoleSetupButtonModalHandler.execute(interaction as never);

      expect(session.pendingButton).toEqual({
        label: "Role A",
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

  // ===== reactionRoleSetupRoleSelectHandler =====
  describe("reactionRoleSetupRoleSelectHandler", () => {
    it("matches: 'reaction-role:setup-roles:xxx' にマッチする", () => {
      expect(
        reactionRoleSetupRoleSelectHandler.matches(
          "reaction-role:setup-roles:abc",
        ),
      ).toBe(true);
    });

    it("セッション期限切れの場合、エラーを返す", async () => {
      const interaction = createMockRoleSelectInteraction(
        "reaction-role:setup-roles:expired",
      );

      await reactionRoleSetupRoleSelectHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [{ type: "error" }],
        }),
      );
    });

    it("pendingButton がない場合、エラーを返す", async () => {
      const session = createBaseSession(); // pendingButton なし
      reactionRoleSetupSessions.set("s1", session);
      const interaction = createMockRoleSelectInteraction(
        "reaction-role:setup-roles:s1",
      );

      await reactionRoleSetupRoleSelectHandler.execute(interaction as never);

      expect(interaction.reply).toHaveBeenCalledWith(
        expect.objectContaining({
          embeds: [{ type: "error" }],
        }),
      );
    });

    it("有効な選択でボタンをセッションに追加し、追加/完了ボタンを表示する", async () => {
      const session = createBaseSession({
        pendingButton: { label: "Role A", emoji: "🎉", style: "primary" },
      });
      reactionRoleSetupSessions.set("s1", session);
      const interaction = createMockRoleSelectInteraction(
        "reaction-role:setup-roles:s1",
        ["role-1", "role-2"],
      );

      await reactionRoleSetupRoleSelectHandler.execute(interaction as never);

      expect(session.buttons).toHaveLength(1);
      expect(session.buttons[0]).toEqual(
        expect.objectContaining({
          buttonId: 1,
          label: "Role A",
          emoji: "🎉",
          style: "primary",
          roleIds: ["role-1", "role-2"],
        }),
      );
      expect(session.pendingButton).toBeUndefined();
      expect(interaction.update).toHaveBeenCalledWith(
        expect.objectContaining({
          components: expect.any(Array),
        }),
      );
    });

    it("ボタン上限（25個）に達した場合、追加ボタンが無効化される", async () => {
      const existingButtons = Array.from({ length: 24 }, (_, i) => ({
        buttonId: i + 1,
        label: `Btn ${i + 1}`,
        emoji: "",
        style: "primary",
        roleIds: ["role-1"],
      }));
      const session = createBaseSession({
        buttons: existingButtons,
        buttonCounter: 24,
        pendingButton: { label: "Last", emoji: "", style: "primary" },
      });
      reactionRoleSetupSessions.set("s1", session);
      const interaction = createMockRoleSelectInteraction(
        "reaction-role:setup-roles:s1",
        ["role-1"],
      );

      await reactionRoleSetupRoleSelectHandler.execute(interaction as never);

      expect(session.buttons).toHaveLength(25);
      // update が呼ばれ、コンポーネントの最初の行の最初のボタンが disabled
      const updateCall = interaction.update.mock.calls[0][0];
      const actionRow = updateCall.components[0];
      const addButton = actionRow.components[0];
      expect(addButton.data.disabled).toBe(true);
    });
  });

  // ===== reactionRoleSetupButtonHandler =====
  describe("reactionRoleSetupButtonHandler", () => {
    it("matches: 'reaction-role:setup-add:xxx' にマッチする", () => {
      expect(
        reactionRoleSetupButtonHandler.matches("reaction-role:setup-add:abc"),
      ).toBe(true);
    });

    it("matches: 'reaction-role:setup-done:xxx' にマッチする", () => {
      expect(
        reactionRoleSetupButtonHandler.matches("reaction-role:setup-done:abc"),
      ).toBe(true);
    });

    describe("Add ボタン", () => {
      it("セッション期限切れの場合、エラーを返す", async () => {
        const interaction = createMockButtonInteraction(
          "reaction-role:setup-add:expired",
        );

        await reactionRoleSetupButtonHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: [{ type: "error" }],
          }),
        );
      });

      it("有効なセッションでボタン設定モーダルを表示する", async () => {
        const session = createBaseSession({
          buttons: [
            {
              buttonId: 1,
              label: "Existing",
              emoji: "",
              style: "primary",
              roleIds: ["role-1"],
            },
          ],
          buttonCounter: 1,
        });
        reactionRoleSetupSessions.set("s1", session);
        const interaction = createMockButtonInteraction(
          "reaction-role:setup-add:s1",
        );

        await reactionRoleSetupButtonHandler.execute(interaction as never);

        expect(interaction.showModal).toHaveBeenCalled();
      });
    });

    describe("Done ボタン", () => {
      it("セッション期限切れの場合、エラーを返す", async () => {
        const interaction = createMockButtonInteraction(
          "reaction-role:setup-done:expired",
        );

        await reactionRoleSetupButtonHandler.execute(interaction as never);

        expect(interaction.reply).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: [{ type: "error" }],
          }),
        );
      });

      it("有効なセッションでパネルをチャンネルに送信し、DBに保存し、成功通知を返す", async () => {
        const panelMessageMock = {
          id: "panel-msg-1",
          edit: vi.fn().mockResolvedValue(undefined),
        };
        const channelMock = {
          id: "ch-1",
          send: vi.fn().mockResolvedValue(panelMessageMock),
        };

        const session = createBaseSession({
          title: "Panel Title",
          description: "Panel Desc",
          color: "#FF0000",
          mode: "toggle",
          buttons: [
            {
              buttonId: 1,
              label: "Role A",
              emoji: "🎉",
              style: "primary",
              roleIds: ["role-1"],
            },
          ],
          buttonCounter: 1,
        });
        reactionRoleSetupSessions.set("s1", session);

        mockConfigService.create.mockResolvedValue({
          id: "panel-db-1",
          guildId: "guild-1",
          channelId: "ch-1",
          messageId: "panel-msg-1",
        });

        const interaction = createMockButtonInteraction(
          "reaction-role:setup-done:s1",
          { channel: channelMock },
        );

        await reactionRoleSetupButtonHandler.execute(interaction as never);

        // パネルメッセージがチャンネルに送信される
        expect(channelMock.send).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: expect.any(Array),
            components: expect.any(Array),
          }),
        );

        // DB に保存される
        expect(mockConfigService.create).toHaveBeenCalledWith(
          expect.objectContaining({
            guildId: "guild-1",
            channelId: "ch-1",
            messageId: "panel-msg-1",
            mode: "toggle",
            title: "Panel Title",
            description: "Panel Desc",
            color: "#FF0000",
          }),
        );

        // パネルメッセージのボタンが正しい panelId で更新される
        expect(panelMessageMock.edit).toHaveBeenCalledWith(
          expect.objectContaining({
            components: expect.any(Array),
          }),
        );

        // セットアップメッセージが削除される
        expect(interaction.deleteReply).toHaveBeenCalled();

        // 成功通知が送信される
        expect(interaction.followUp).toHaveBeenCalledWith(
          expect.objectContaining({
            embeds: [{ type: "success" }],
          }),
        );

        // セッションが削除される
        expect(reactionRoleSetupSessions.get("s1")).toBeUndefined();
      });
    });
  });
});
