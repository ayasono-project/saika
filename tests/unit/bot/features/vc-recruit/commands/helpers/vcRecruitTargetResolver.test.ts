// tests/unit/bot/features/vc-recruit/commands/helpers/vcRecruitTargetResolver.test.ts

import { ChannelType } from "discord.js";
import { resolveTargetCategory } from "@/bot/features/vc-recruit/commands/helpers/vcRecruitTargetResolver";

// ChannelType の数値をモック用に使用
const GUILD_CATEGORY = ChannelType.GuildCategory;
const GUILD_TEXT = ChannelType.GuildText;

/**
 * テスト用カテゴリーチャンネルモックを作成
 */
function makeCategoryChannel(id: string, name: string) {
  return { id, name, type: GUILD_CATEGORY };
}

/**
 * テスト用 Guild モックを作成
 */
function makeGuild(opts: {
  fetchChannelResult?: unknown;
  cacheChannels?: { id: string; name: string; type: number }[];
}) {
  return {
    channels: {
      fetch: vi.fn().mockResolvedValue(opts.fetchChannelResult ?? null),
      cache: {
        find: (predicate: (ch: { type: number; name: string }) => boolean) => {
          return (opts.cacheChannels ?? []).find(predicate) ?? undefined;
        },
      },
    },
  };
}

describe("bot/features/vc-recruit/commands/helpers/vcRecruitTargetResolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("categoryOption が null のとき、現在チャンネルの親カテゴリーを返す", async () => {
    const parentCategory = makeCategoryChannel("cat-1", "ゲームカテゴリー");
    const currentChannel = {
      id: "text-ch-1",
      type: GUILD_TEXT,
      parent: parentCategory,
    };
    const guild = makeGuild({ fetchChannelResult: currentChannel });

    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      null,
    );
    expect(result).toEqual(parentCategory);
  });

  it("categoryOption が null で現在チャンネルに親カテゴリーがない場合、null を返す", async () => {
    const currentChannel = {
      id: "text-ch-1",
      type: GUILD_TEXT,
      parent: null,
    };
    const guild = makeGuild({ fetchChannelResult: currentChannel });

    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      null,
    );
    expect(result).toBeNull();
  });

  it("categoryOption が null で fetch に失敗した場合、null を返す", async () => {
    const guild = makeGuild({ fetchChannelResult: null });

    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      null,
    );
    expect(result).toBeNull();
  });

  it('categoryOption が "TOP"（大文字）のとき、null を返す（トップカテゴリー指定）', async () => {
    const guild = makeGuild({});
    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      "TOP",
    );
    expect(result).toBeNull();
  });

  it('categoryOption が "top"（小文字）のとき、null を返す（大文字小文字無視）', async () => {
    const guild = makeGuild({});
    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      "top",
    );
    expect(result).toBeNull();
  });

  it("categoryOption がカテゴリーID のとき、ID で fetch した結果を返す", async () => {
    const category = makeCategoryChannel("cat-42", "ゲームカテゴリー");
    const guild = makeGuild({ fetchChannelResult: category });

    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      "cat-42",
    );
    expect(result).toEqual(category);
  });

  it("fetch したチャンネルが GuildCategory でなく名前でも見つからない場合、null を返す", async () => {
    const textChannel = { id: "text-ch-99", type: GUILD_TEXT };
    const guild = makeGuild({
      fetchChannelResult: textChannel,
      cacheChannels: [],
    });

    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      "text-ch-99",
    );
    expect(result).toBeNull();
  });

  it("categoryOption がカテゴリー名のとき、名前検索で該当カテゴリーを返す（大文字小文字無視）", async () => {
    const category = makeCategoryChannel("cat-1", "ゲームカテゴリー");
    const guild = makeGuild({
      fetchChannelResult: null,
      cacheChannels: [category],
    });

    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      "ゲームカテゴリー",
    );
    expect(result).toEqual(category);
  });

  it("カテゴリー名の大文字小文字を無視して一致するカテゴリーを返す", async () => {
    const category = makeCategoryChannel("cat-1", "GameCategory");
    const guild = makeGuild({
      fetchChannelResult: null,
      cacheChannels: [category],
    });

    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      "gamecategory",
    );
    expect(result).toEqual(category);
  });

  it("何も見つからない場合、null を返す", async () => {
    const guild = makeGuild({
      fetchChannelResult: null,
      cacheChannels: [],
    });

    const result = await resolveTargetCategory(
      guild as never,
      "text-ch-1",
      "nonexistent",
    );
    expect(result).toBeNull();
  });
});
