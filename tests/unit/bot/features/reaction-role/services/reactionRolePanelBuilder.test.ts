// tests/unit/bot/features/reaction-role/services/reactionRolePanelBuilder.test.ts

import type {
  ActionRowBuilder,
  APIButtonComponentWithCustomId,
  TextInputBuilder,
} from "discord.js";
import { REACTION_ROLE_DEFAULT_BUTTON_STYLE } from "@/bot/features/reaction-role/commands/reactionRoleCommand.constants";
import {
  buildButtonSettingsModal,
  buildPanelButtonRows,
  buildPanelEmbed,
  updatePanelMessage,
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

    it("prefill 未指定時にスタイルのデフォルト値が primary であること", () => {
      const modal = buildButtonSettingsModal("prefix:", "s1", "ja");

      // 3番目のコンポーネント（スタイルフィールド）
      const styleRow = modal
        .components[2] as ActionRowBuilder<TextInputBuilder>;
      const styleInput = styleRow.components[0];
      expect(styleInput.data.value).toBe(REACTION_ROLE_DEFAULT_BUTTON_STYLE);
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
        style: "danger",
      });

      const labelRow = modal
        .components[0] as ActionRowBuilder<TextInputBuilder>;
      const emojiRow = modal
        .components[1] as ActionRowBuilder<TextInputBuilder>;
      const styleRow = modal
        .components[2] as ActionRowBuilder<TextInputBuilder>;
      expect(labelRow.components[0].data.value).toBe("既存ラベル");
      expect(emojiRow.components[0].data.value).toBe("🔥");
      expect(styleRow.components[0].data.value).toBe("danger");
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
});
