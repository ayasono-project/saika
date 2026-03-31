// tests/unit/bot/features/vac/commands/helpers/vacConfigTargetResolver.test.ts

import { ChannelType } from "discord.js";
import {
  findTriggerChannelByCategory,
  resolveTargetCategory,
} from "@/bot/features/vac/commands/helpers/vacConfigTargetResolver";

describe("bot/features/vac/commands/helpers/vacConfigTargetResolver", () => {
  // カテゴリ解決とトリガー探索の分岐を安定して検証する
  describe("resolveTargetCategory", () => {
    it("オプション未指定時に親カテゴリを返す", async () => {
      const category = {
        id: "cat-1",
        name: "General",
        type: ChannelType.GuildCategory,
      };
      const guild = {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            parent: category,
          }),
          cache: { find: vi.fn() },
        },
      };

      const result = await resolveTargetCategory(
        guild as never,
        "channel-1",
        null,
      );

      expect(result).toEqual(category);
    });

    it("TOPが指定された場合はnullを返す", async () => {
      const fetch = vi.fn();
      const guild = {
        channels: {
          fetch,
          cache: { find: vi.fn() },
        },
      };

      const result = await resolveTargetCategory(
        guild as never,
        "channel-1",
        "TOP",
      );

      expect(result).toBeNull();
      expect(fetch).not.toHaveBeenCalled();
    });

    it("まずIDでカテゴリを解決し、見つからなければ名前でフォールバックする", async () => {
      const categoryByName = {
        id: "cat-2",
        name: "TargetCategory",
        type: ChannelType.GuildCategory,
      };
      const guild = {
        channels: {
          fetch: vi.fn().mockResolvedValue({
            id: "voice-1",
            type: ChannelType.GuildVoice,
          }),
          cache: {
            find: vi.fn((predicate: (item: unknown) => boolean) => {
              const candidates = [categoryByName];
              return candidates.find(predicate);
            }),
          },
        },
      };

      const result = await resolveTargetCategory(
        guild as never,
        "channel-1",
        "targetcategory",
      );

      expect(result).toEqual(categoryByName);
    });
  });

  describe("findTriggerChannelByCategory", () => {
    it("指定カテゴリに一致する最初のボイストリガーチャンネルを返す", async () => {
      const guild = {
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValueOnce({
              id: "text-1",
              type: ChannelType.GuildText,
            })
            .mockResolvedValueOnce({
              id: "voice-1",
              type: ChannelType.GuildVoice,
              parent: { id: "cat-x", type: ChannelType.GuildCategory },
            })
            .mockResolvedValueOnce({
              id: "voice-2",
              type: ChannelType.GuildVoice,
              parent: { id: "cat-1", type: ChannelType.GuildCategory },
            }),
        },
      };

      const result = await findTriggerChannelByCategory(
        guild as never,
        ["text-1", "voice-1", "voice-2"],
        "cat-1",
      );

      expect(result?.id).toBe("voice-2");
    });

    it("カテゴリに一致するトリガーが存在しない場合はnullを返す", async () => {
      const guild = {
        channels: {
          fetch: vi
            .fn()
            .mockResolvedValueOnce(null)
            .mockResolvedValueOnce({
              id: "voice-1",
              type: ChannelType.GuildVoice,
              parent: { id: "cat-x", type: ChannelType.GuildCategory },
            }),
        },
      };

      const result = await findTriggerChannelByCategory(
        guild as never,
        ["missing", "voice-1"],
        "cat-1",
      );

      expect(result).toBeNull();
    });
  });
});
