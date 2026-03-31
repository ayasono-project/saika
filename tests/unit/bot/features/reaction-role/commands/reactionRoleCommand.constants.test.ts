// tests/unit/bot/features/reaction-role/commands/reactionRoleCommand.constants.test.ts
import {
  isValidButtonStyle,
  isValidEmoji,
  normalizeEmoji,
  parseButtons,
} from "@/bot/features/reaction-role/commands/reactionRoleCommand.constants";

// parseButtons / isValidButtonStyle のユーティリティ関数を検証する
describe("bot/features/reaction-role/commands/reactionRoleCommand.constants", () => {
  describe("parseButtons", () => {
    it("有効なJSON配列をパースしてボタン配列を返すこと", () => {
      const buttons = [
        {
          buttonId: 1,
          label: "Role A",
          emoji: "",
          style: "Primary",
          roleIds: ["role-1"],
        },
      ];
      const json = JSON.stringify(buttons);

      const result = parseButtons(json);

      expect(result).toEqual(buttons);
    });

    it("不正なJSON文字列の場合は空配列を返すこと", () => {
      const result = parseButtons("{invalid json}");

      expect(result).toEqual([]);
    });

    it("配列でないJSONの場合は空配列を返すこと", () => {
      const result = parseButtons(JSON.stringify({ key: "value" }));

      expect(result).toEqual([]);
    });

    it("空配列のJSON文字列をパースして空配列を返すこと", () => {
      const result = parseButtons("[]");

      expect(result).toEqual([]);
    });

    it("空文字列の場合は空配列を返すこと", () => {
      const result = parseButtons("");

      expect(result).toEqual([]);
    });
  });

  describe("isValidButtonStyle", () => {
    it.each([
      "primary",
      "secondary",
      "success",
      "danger",
    ])("有効なスタイル '%s' に対して true を返すこと", (style) => {
      expect(isValidButtonStyle(style)).toBe(true);
    });

    it.each([
      "Primary",
      "SECONDARY",
      "Success",
      "DANGER",
    ])("大文字混在のスタイル '%s' でも true を返すこと（大小文字不問）", (style) => {
      expect(isValidButtonStyle(style)).toBe(true);
    });

    it("無効なスタイル文字列に対して false を返すこと", () => {
      expect(isValidButtonStyle("link")).toBe(false);
      expect(isValidButtonStyle("unknown")).toBe(false);
      expect(isValidButtonStyle("")).toBe(false);
    });
  });

  describe("isValidEmoji", () => {
    it("空文字列は有効として true を返すこと", () => {
      expect(isValidEmoji("")).toBe(true);
    });

    it.each([
      "👍",
      "🎉",
      "❤️",
      "🇯🇵",
      "👨‍👩‍👧‍👦",
    ])("Unicode絵文字 '%s' に対して true を返すこと", (emoji) => {
      expect(isValidEmoji(emoji)).toBe(true);
    });

    it.each([
      "<:custom:123456789012345678>",
      "<a:animated:123456789012345678>",
    ])("Discordカスタム絵文字 '%s' に対して true を返すこと", (emoji) => {
      expect(isValidEmoji(emoji)).toBe(true);
    });

    it("冗余なVS16付きEmoji_Presentation文字は正規化後に有効と判定すること", () => {
      // "✅️" = U+2705 + U+FE0F（冗余なVS16）
      expect(isValidEmoji("✅️")).toBe(true);
    });

    it.each([
      "hello",
      "abc",
      ":invalid:",
      "<:>",
      "12345",
    ])("無効な文字列 '%s' に対して false を返すこと", (emoji) => {
      expect(isValidEmoji(emoji)).toBe(false);
    });
  });

  describe("normalizeEmoji", () => {
    it("Emoji_Presentation文字に続く冗余なVS16を除去すること", () => {
      // "✅️" (U+2705 + U+FE0F) → "✅" (U+2705)
      expect(normalizeEmoji("✅️")).toBe("✅");
    });

    it("VS16が必要な非Emoji_Presentation文字はそのまま保持すること", () => {
      // "❤️" = U+2764 + U+FE0F（VS16が必要）
      expect(normalizeEmoji("❤️")).toBe("❤️");
    });

    it("空文字列はそのまま返すこと", () => {
      expect(normalizeEmoji("")).toBe("");
    });

    it("カスタム絵文字はそのまま返すこと", () => {
      expect(normalizeEmoji("<:custom:123456789012345678>")).toBe(
        "<:custom:123456789012345678>",
      );
    });
  });
});
