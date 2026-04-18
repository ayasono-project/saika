// tests/unit/bot/features/reaction-role/services/reactionRolePanelBuilder.test.ts

import type {
  ActionRowBuilder,
  APIButtonComponentWithCustomId,
  TextInputBuilder,
} from "discord.js";
import {
  buildButtonSettingsModal,
  buildPanelButtonRows,
  buildPanelEmbed,
  updatePanelMessage,
  validateSelectedRolesHierarchy,
} from "@/bot/features/reaction-role/services/reactionRolePanelBuilder";
import type { ReactionRoleButton } from "@/shared/database/types/reactionRoleTypes";

vi.mock("@/shared/locale/localeManager", () => ({
  tInteraction: (_locale: string, key: string) => key,
}));

function createButton(
  overrides: Partial<ReactionRoleButton> = {},
): ReactionRoleButton {
  return {
    buttonId: 1,
    label: "Test Button",
    emoji: "",
    style: "primary",
    roleIds: ["role-1"],
    ...overrides,
  };
}

describe("bot/features/reaction-role/services/reactionRolePanelBuilder", () => {
  describe("buildPanelEmbed", () => {
    it("タイトル・説明文・カラーが正しく設定されること", () => {
      const embed = buildPanelEmbed("My Title", "My Description", "#FF0000");

      expect(embed.data.title).toBe("My Title");
      expect(embed.data.description).toBe("My Description");
      expect(embed.data.color).toBe(0xff0000);
    });

    it("異なるカラーコードが正しく変換されること", () => {
      const embed = buildPanelEmbed("T", "D", "#00A8F3");

      expect(embed.data.color).toBe(0x00a8f3);
    });
  });

  describe("buildPanelButtonRows", () => {
    it("空のボタン配列で空の行配列が返されること", () => {
      const rows = buildPanelButtonRows("panel-1", []);

      expect(rows).toHaveLength(0);
    });

    it("1~5個のボタンで1行が返されること", () => {
      const buttons = [
        createButton({ buttonId: 1, label: "Btn 1" }),
        createButton({ buttonId: 2, label: "Btn 2" }),
        createButton({ buttonId: 3, label: "Btn 3" }),
      ];

      const rows = buildPanelButtonRows("panel-1", buttons);

      expect(rows).toHaveLength(1);
      expect(rows[0].components).toHaveLength(3);
    });

    it("6個のボタンで2行が返されること", () => {
      const buttons = Array.from({ length: 6 }, (_, i) =>
        createButton({ buttonId: i + 1, label: `Btn ${i + 1}` }),
      );

      const rows = buildPanelButtonRows("panel-1", buttons);

      expect(rows).toHaveLength(2);
      expect(rows[0].components).toHaveLength(5);
      expect(rows[1].components).toHaveLength(1);
    });

    it("カスタムIDが reaction-role:click:{panelId}:{buttonId} 形式であること", () => {
      const buttons = [createButton({ buttonId: 42, label: "Test" })];

      const rows = buildPanelButtonRows("panel-abc", buttons);

      const btnData = rows[0].components[0].data;
      expect(btnData).toHaveProperty(
        "custom_id",
        "reaction-role:click:panel-abc:42",
      );
    });

    it("絵文字が指定されている場合にボタンに設定されること", () => {
      const buttons = [createButton({ buttonId: 1, emoji: "🎉" })];

      const rows = buildPanelButtonRows("panel-1", buttons);

      const btnData = rows[0].components[0].data;
      expect(btnData).toHaveProperty("emoji");
    });

    it("絵文字が空文字列の場合にボタンに設定されないこと", () => {
      const buttons = [createButton({ buttonId: 1, emoji: "" })];

      const rows = buildPanelButtonRows("panel-1", buttons);

      const btnData = rows[0].components[0]
        .data as APIButtonComponentWithCustomId;
      expect(btnData.emoji).toBeUndefined();
    });
  });

  describe("buildButtonSettingsModal", () => {
    it("カスタムIDが prefix + sessionId で構成されること", () => {
      const modal = buildButtonSettingsModal(
        "reaction-role:setup-button-modal:",
        "session-123",
        "ja",
      );

      expect(modal.data.custom_id).toBe(
        "reaction-role:setup-button-modal:session-123",
      );
    });

    it("タイトルが翻訳キーから設定されること", () => {
      const modal = buildButtonSettingsModal("prefix:", "s1", "ja");

      expect(modal.data.title).toBe(
        "reactionRole:ui.modal.button_settings_title",
      );
    });

    it("モーダルにラベルと絵文字の 2 フィールドのみ含まれること", () => {
      const modal = buildButtonSettingsModal("prefix:", "s1", "ja");

      expect(modal.components).toHaveLength(2);
    });

    it("prefill 未指定時にラベルと絵文字が空文字列であること", () => {
      const modal = buildButtonSettingsModal("prefix:", "s1", "ja");

      const labelRow = modal
        .components[0] as ActionRowBuilder<TextInputBuilder>;
      const emojiRow = modal
        .components[1] as ActionRowBuilder<TextInputBuilder>;
      expect(labelRow.components[0].data.value).toBe("");
      expect(emojiRow.components[0].data.value).toBe("");
    });

    it("prefill 指定時にカスタム値が使用されること", () => {
      const modal = buildButtonSettingsModal("prefix:", "s1", "ja", {
        label: "既存ラベル",
        emoji: "🔥",
      });

      const labelRow = modal
        .components[0] as ActionRowBuilder<TextInputBuilder>;
      const emojiRow = modal
        .components[1] as ActionRowBuilder<TextInputBuilder>;
      expect(labelRow.components[0].data.value).toBe("既存ラベル");
      expect(emojiRow.components[0].data.value).toBe("🔥");
    });
  });

  describe("updatePanelMessage", () => {
    const buttons = [createButton({ buttonId: 1, label: "Btn" })];

    function createMockClient(channelResult: unknown, messageResult?: unknown) {
      const messageMock = messageResult ?? {
        edit: vi.fn().mockResolvedValue(undefined),
      };
      const channelMock = channelResult
        ? {
            messages: {
              fetch: vi.fn().mockResolvedValue(messageMock),
            },
          }
        : null;
      return {
        channels: {
          fetch: vi.fn().mockResolvedValue(channelMock),
        },
      };
    }

    it("チャンネルが見つからない場合は false を返す", async () => {
      const client = createMockClient(null);

      const result = await updatePanelMessage(
        client as never,
        "ch-1",
        "msg-1",
        "panel-1",
        "Title",
        "Desc",
        "#FF0000",
        buttons,
      );

      expect(result).toBe(false);
    });

    it("メッセージが見つからない場合は false を返す", async () => {
      const client = {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            messages: { fetch: vi.fn().mockResolvedValue(null) },
          }),
        },
      };

      const result = await updatePanelMessage(
        client as never,
        "ch-1",
        "msg-1",
        "panel-1",
        "Title",
        "Desc",
        "#FF0000",
        buttons,
      );

      expect(result).toBe(false);
    });

    it("メッセージ更新に成功した場合は true を返す", async () => {
      const editMock = vi.fn().mockResolvedValue(undefined);
      const client = createMockClient(true, { edit: editMock });

      const result = await updatePanelMessage(
        client as never,
        "ch-1",
        "msg-1",
        "panel-1",
        "Title",
        "Desc",
        "#FF0000",
        buttons,
      );

      expect(result).toBe(true);
      expect(editMock).toHaveBeenCalled();
    });

    it("channels.fetch が例外を投げた場合は false を返す", async () => {
      const client = {
        channels: {
          fetch: vi.fn().mockRejectedValue(new Error("API error")),
        },
      };

      const result = await updatePanelMessage(
        client as never,
        "ch-1",
        "msg-1",
        "panel-1",
        "Title",
        "Desc",
        "#FF0000",
        buttons,
      );

      expect(result).toBe(false);
    });
  });

  describe("validateSelectedRolesHierarchy", () => {
    function makeGuild(opts: {
      ownerId?: string;
      botHighestPosition: number;
      roles: { id: string; position: number }[];
    }) {
      const { ownerId = "owner-1", botHighestPosition, roles } = opts;
      const rolesMap = new Map(roles.map((r) => [r.id, r]));
      return {
        ownerId,
        members: {
          me: { roles: { highest: { position: botHighestPosition } } },
        },
        roles: {
          cache: {
            get: (id: string) => rolesMap.get(id),
          },
        },
      } as never;
    }

    function makeExecutor(id: string, highestPosition: number) {
      return {
        id,
        roles: { highest: { position: highestPosition } },
      } as never;
    }

    it("全ロールが Bot・実行者 両方より下位なら空配列を返す", () => {
      const guild = makeGuild({
        botHighestPosition: 10,
        roles: [
          { id: "r1", position: 5 },
          { id: "r2", position: 3 },
        ],
      });
      const executor = makeExecutor("user-1", 8);

      expect(
        validateSelectedRolesHierarchy(guild, executor, ["r1", "r2"]),
      ).toEqual([]);
    });

    it("Bot 最上位以上のロールは無効として返す", () => {
      const guild = makeGuild({
        botHighestPosition: 5,
        roles: [
          { id: "r1", position: 3 },
          { id: "r2", position: 5 },
          { id: "r3", position: 7 },
        ],
      });
      const executor = makeExecutor("user-1", 10);

      const invalid = validateSelectedRolesHierarchy(guild, executor, [
        "r1",
        "r2",
        "r3",
      ]);
      expect(invalid.map((r) => r.id)).toEqual(["r2", "r3"]);
    });

    it("実行者最上位以上のロールは無効として返す", () => {
      const guild = makeGuild({
        botHighestPosition: 20,
        roles: [
          { id: "r1", position: 3 },
          { id: "r2", position: 5 },
        ],
      });
      const executor = makeExecutor("user-1", 5);

      const invalid = validateSelectedRolesHierarchy(guild, executor, [
        "r1",
        "r2",
      ]);
      expect(invalid.map((r) => r.id)).toEqual(["r2"]);
    });

    it("実行者がサーバーオーナーなら実行者階層チェックは免除される", () => {
      const guild = makeGuild({
        ownerId: "owner-1",
        botHighestPosition: 20,
        roles: [{ id: "r1", position: 15 }],
      });
      const executor = makeExecutor("owner-1", 5);

      expect(validateSelectedRolesHierarchy(guild, executor, ["r1"])).toEqual(
        [],
      );
    });

    it("オーナー実行時でも Bot 階層チェックは常に適用される", () => {
      const guild = makeGuild({
        ownerId: "owner-1",
        botHighestPosition: 5,
        roles: [{ id: "r1", position: 10 }],
      });
      const executor = makeExecutor("owner-1", 100);

      const invalid = validateSelectedRolesHierarchy(guild, executor, ["r1"]);
      expect(invalid.map((r) => r.id)).toEqual(["r1"]);
    });

    it("存在しないロールIDは黙ってスキップされる", () => {
      const guild = makeGuild({
        botHighestPosition: 10,
        roles: [{ id: "r1", position: 5 }],
      });
      const executor = makeExecutor("user-1", 8);

      expect(
        validateSelectedRolesHierarchy(guild, executor, ["r1", "missing"]),
      ).toEqual([]);
    });
  });
});
