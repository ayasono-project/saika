import { EmbedBuilder } from "discord.js";
import {
  buildStickyMessagePayload,
  parseColorStr,
} from "@/features/sticky-message/services/stickyMessagePayloadBuilder";
import type { StickyEmbedData } from "@/shared/database/types";

function makeSticky(
  overrides: Partial<{
    content: string;
    embedData: StickyEmbedData | null;
    id: string;
    guildId: string;
    channelId: string;
    lastMessageId: string | null;
    updatedBy: string | null;
    createdAt: Date;
    updatedAt: Date;
  }> = {},
) {
  return {
    id: "sticky-1",
    guildId: "guild-1",
    channelId: "channel-1",
    content: "Hello World",
    embedData: null,
    lastMessageId: null,
    updatedBy: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

// スティッキーメッセージの設定データからDiscord送信ペイロードを構築するロジックと
// 色文字列パースのエッジケースを網羅的に検証するグループ
describe("bot/features/sticky-message/services/stickyMessagePayloadBuilder", () => {
  // embedData の有無・有効性によって content ペイロードと embed ペイロードを切り替える動作を検証
  describe("buildStickyMessagePayload", () => {
    it("embedData が null の場合は content ペイロードを返す", () => {
      const sticky = makeSticky({
        content: "Plain text message",
        embedData: null,
      });
      const payload = buildStickyMessagePayload(sticky);

      expect(payload).toEqual({ content: "Plain text message" });
    });

    it("embedData が設定されている場合は embed ペイロードを返す", () => {
      const embedData = {
        title: "My Title",
        description: "My Description",
        color: 0xff0000,
      };
      const sticky = makeSticky({ content: "fallback", embedData });
      const payload = buildStickyMessagePayload(sticky);

      expect(payload.embeds).toBeDefined();
      expect(payload.embeds).toHaveLength(1);
      expect(payload.embeds![0]).toBeInstanceOf(EmbedBuilder);
    });

    it("embedData に description がない場合、content フィールドを embed の description として代替使用する", () => {
      const embedData = { title: "Only Title" };
      const sticky = makeSticky({ content: "Fallback content", embedData });
      const payload = buildStickyMessagePayload(sticky);

      expect(payload.embeds).toBeDefined();
      expect(payload.embeds).toHaveLength(1);
      const embed = (payload.embeds![0] as EmbedBuilder).toJSON();
      expect(embed.description).toBe("Fallback content");
    });

    it("embedData に color がない場合はデフォルト色を使用する", () => {
      const embedData = { description: "desc" };
      const sticky = makeSticky({ embedData });
      const payload = buildStickyMessagePayload(sticky);

      expect(payload.embeds).toBeDefined();
      const embed = (payload.embeds![0] as EmbedBuilder).toJSON();
      expect(embed.color).toBe(0x008969);
    });
  });

  // 空欄は既定色、それ以外は共通の parseColorHex に任せ、読めない色は null を返すことを検証
  // （形式ごとの細かい検証は colorHex.test.ts）
  describe("parseColorStr", () => {
    it("null 入力に対してデフォルト色を返す", () => {
      expect(parseColorStr(null)).toBe(0x008969);
    });

    it("undefined 入力に対してデフォルト色を返す", () => {
      expect(parseColorStr(undefined)).toBe(0x008969);
    });

    it("空文字列に対してデフォルト色を返す", () => {
      expect(parseColorStr("")).toBe(0x008969);
    });

    it("#RRGGBB 形式をパースする", () => {
      expect(parseColorStr("#ff0000")).toBe(0xff0000);
    });

    it.each([
      ["16進数でない", "gggggg"],
      ["7桁（Discord の上限 #FFFFFF を超える）", "#1234567"],
      ["負の数", "-1"],
      ["途中から16進数でない", "12zz"],
    ])("読めない色（%s）は既定色にせず null を返す", (_label, input) => {
      expect(parseColorStr(input)).toBeNull();
    });
  });
});
