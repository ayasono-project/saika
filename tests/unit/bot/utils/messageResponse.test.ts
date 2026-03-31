// tests/unit/bot/utils/messageResponse.test.ts
// メッセージレスポンスユーティリティのテスト

import { EmbedBuilder } from "discord.js";
import {
  createErrorEmbed,
  createInfoEmbed,
  createStatusEmbed,
  createSuccessEmbed,
  createWarningEmbed,
  type MessageStatus,
} from "@/bot/utils/messageResponse";
import { localeManager } from "@/shared/locale/localeManager";

// i18n 依存のタイトル検証に備えてロケールを初期化
beforeAll(async () => {
  await localeManager.initialize();
});

describe("messageResponse", () => {
  // ステータス別Embed生成とオプション反映の挙動を検証
  describe("createStatusEmbed", () => {
    it.each<[MessageStatus, number, string]>([
      ["success", 0x57f287, "✅"],
      ["info", 0x3498db, "ℹ️"],
      ["warning", 0xfee75c, "⚠️"],
      ["error", 0xed4245, "❌"],
    ])("%s ステータスの embed に正しい色と絵文字が設定されることを確認", (status, expectedColor, expectedEmoji) => {
      const title = "Test Title";
      const description = "Test Description";

      const embed = createStatusEmbed(status, title, description);

      expect(embed).toBeInstanceOf(EmbedBuilder);
      expect(embed.data.color).toBe(expectedColor);
      expect(embed.data.title).toBe(`${expectedEmoji} ${title}`);
      expect(embed.data.description).toBe(description);
    });

    it("timestamp オプションが true の場合に embed にタイムスタンプが付与されることを確認", () => {
      // timestamp オプション有効時は埋め込みに時刻が付与される
      const embed = createStatusEmbed("info", "Title", "Description", {
        timestamp: true,
      });

      expect(embed.data.timestamp).toBeDefined();
    });

    it("timestamp オプションが false または未指定の場合はタイムスタンプが付与されないことを確認", () => {
      // false/未指定時は timestamp を付与しない
      const embed1 = createStatusEmbed("info", "Title", "Description", {
        timestamp: false,
      });
      const embed2 = createStatusEmbed("info", "Title", "Description");

      expect(embed1.data.timestamp).toBeUndefined();
      expect(embed2.data.timestamp).toBeUndefined();
    });

    it("空文字列が渡された場合は description が省略されることを確認", () => {
      const embed = createStatusEmbed("info", "Title", "");

      expect(embed.data.description).toBeUndefined();
    });

    it("fields オプションが指定された場合に embed にフィールドが追加されることを確認", () => {
      // fields オプションで任意フィールドが反映されること
      const fields = [
        { name: "Field 1", value: "Value 1", inline: true },
        { name: "Field 2", value: "Value 2", inline: false },
      ];

      const embed = createStatusEmbed("info", "Title", "Description", {
        fields,
      });

      expect(embed.data.fields).toHaveLength(2);
      expect(embed.data.fields?.[0]).toMatchObject({
        name: "Field 1",
        value: "Value 1",
        inline: true,
      });
      expect(embed.data.fields?.[1]).toMatchObject({
        name: "Field 2",
        value: "Value 2",
        inline: false,
      });
    });

    it("タイトルが 256 文字を超える場合は切り詰められることを確認", () => {
      const longTitle = "a".repeat(260);
      const embed = createStatusEmbed("info", longTitle, "Description");

      expect(embed.data.title?.length).toBeLessThanOrEqual(256);
      expect(embed.data.title).toContain("...");
    });
  });

  describe("createSuccessEmbed", () => {
    it("正しい色とロケールタイトルで success embed が生成されることを確認", () => {
      const embed = createSuccessEmbed("Operation completed");

      expect(embed.data.color).toBe(0x57f287);
      // タイトルはロケール設定から取得（デフォルト: ja → "成功"）
      expect(embed.data.title).toBe("✅ 成功");
      expect(embed.data.description).toBe("Operation completed");
    });

    it("オプションが反映されることを確認", () => {
      const embed = createSuccessEmbed("Description", {
        timestamp: true,
      });

      expect(embed.data.timestamp).toBeDefined();
    });
  });

  describe("createInfoEmbed", () => {
    it("デフォルトタイトルで info embed が生成されることを確認", () => {
      const embed = createInfoEmbed("Information message");

      expect(embed.data.color).toBe(0x3498db);
      expect(embed.data.title).toBe("ℹ️ 情報");
      expect(embed.data.description).toBe("Information message");
    });

    it("options でカスタムタイトルが指定された場合に反映されることを確認", () => {
      const embed = createInfoEmbed("Information message", { title: "Custom" });

      expect(embed.data.title).toBe("ℹ️ Custom");
    });

    it("fields オプションが反映されることを確認", () => {
      // ラッパー関数経由でも fields 指定が維持されること
      const fields = [{ name: "Status", value: "Active", inline: true }];
      const embed = createInfoEmbed("Description", { fields });

      expect(embed.data.fields).toHaveLength(1);
      expect(embed.data.fields?.[0].name).toBe("Status");
    });
  });

  describe("createWarningEmbed", () => {
    it("デフォルトタイトルで warning embed が生成されることを確認", () => {
      const embed = createWarningEmbed("Please be careful");

      expect(embed.data.color).toBe(0xfee75c);
      expect(embed.data.title).toBe("⚠️ 警告");
      expect(embed.data.description).toBe("Please be careful");
    });

    it("options でカスタムタイトルが指定された場合に反映されることを確認", () => {
      const embed = createWarningEmbed("Please be careful", {
        title: "Custom Warning",
      });

      expect(embed.data.title).toBe("⚠️ Custom Warning");
    });
  });

  describe("createErrorEmbed", () => {
    it("デフォルトタイトルで error embed が生成されることを確認", () => {
      const embed = createErrorEmbed("An error occurred");

      expect(embed.data.color).toBe(0xed4245);
      expect(embed.data.title).toBe("❌ エラー");
      expect(embed.data.description).toBe("An error occurred");
    });

    it("options でカスタムタイトルが指定された場合に反映されることを確認", () => {
      const embed = createErrorEmbed("An error occurred", {
        title: "Permission Error",
      });

      expect(embed.data.title).toBe("❌ Permission Error");
    });
  });
});
