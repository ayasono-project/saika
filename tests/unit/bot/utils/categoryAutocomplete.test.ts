// tests/unit/bot/utils/categoryAutocomplete.test.ts

import { ChannelType } from "discord.js";
import { respondCategoryAutocomplete } from "@/bot/utils/categoryAutocomplete";

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
  tDefault: (_key: string) => "TOP",
  tInteraction: (_locale: string, _key: string) => "TOP",
}));

const COMMAND = "test-command";
const SUBCOMMANDS = ["setup", "teardown"] as const;
const OPTS = {
  commandName: COMMAND,
  subcommands: SUBCOMMANDS,
  topLocaleKey: "vcRecruit:vc-recruit-config.setup.category.top" as const,
  topValue: "TOP",
};

type CategoryLike = { id: string; name: string; type: ChannelType };

function createCache(items: CategoryLike[]) {
  return {
    filter: (predicate: (item: CategoryLike) => boolean) => ({
      map: <T>(mapper: (item: CategoryLike) => T) =>
        items.filter(predicate).map(mapper),
    }),
  };
}

describe("bot/utils/categoryAutocomplete", () => {
  it("コマンド名が一致しない場合は空の配列で respond が呼ばれることを確認", async () => {
    const respond = vi.fn();
    const interaction = {
      commandName: "other-command",
      options: {
        getSubcommand: vi.fn(() => "setup"),
        getFocused: vi.fn(() => ""),
      },
      guild: null,
      respond,
    };

    await respondCategoryAutocomplete(interaction as never, OPTS);

    expect(respond).toHaveBeenCalledWith([]);
  });

  it("サブコマンドが許可リストに存在しない場合は空の配列で respond が呼ばれることを確認", async () => {
    const respond = vi.fn();
    const interaction = {
      commandName: COMMAND,
      options: {
        getSubcommand: vi.fn(() => "view"),
        getFocused: vi.fn(() => ""),
      },
      guild: null,
      respond,
    };

    await respondCategoryAutocomplete(interaction as never, OPTS);

    expect(respond).toHaveBeenCalledWith([]);
  });

  it("ギルドコンテキストがない場合は空の配列で respond が呼ばれることを確認", async () => {
    const respond = vi.fn();
    const interaction = {
      commandName: COMMAND,
      options: {
        getSubcommand: vi.fn(() => "setup"),
        getFocused: vi.fn(() => ""),
      },
      guild: null,
      respond,
    };

    await respondCategoryAutocomplete(interaction as never, OPTS);

    expect(respond).toHaveBeenCalledWith([]);
  });

  it("大文字小文字を区別しないフィルタリングで一致するカテゴリが返されることを確認", async () => {
    const respond = vi.fn();
    const interaction = {
      commandName: COMMAND,
      options: {
        getSubcommand: vi.fn(() => "setup"),
        getFocused: vi.fn(() => "ga"),
      },
      guild: {
        channels: {
          cache: createCache([
            { id: "cat-1", name: "Game", type: ChannelType.GuildCategory },
            { id: "cat-2", name: "General", type: ChannelType.GuildCategory },
            { id: "text-1", name: "chat", type: ChannelType.GuildText },
          ]),
        },
      },
      respond,
    };

    await respondCategoryAutocomplete(interaction as never, OPTS);

    expect(respond).toHaveBeenCalledWith([{ name: "Game", value: "cat-1" }]);
  });

  it("入力テキストが topLabel に一致する場合は TOP 選択肢が含まれることを確認", async () => {
    const respond = vi.fn();
    const interaction = {
      commandName: COMMAND,
      options: {
        getSubcommand: vi.fn(() => "teardown"),
        getFocused: vi.fn(() => "top"),
      },
      guild: {
        channels: {
          cache: createCache([
            { id: "cat-1", name: "Game", type: ChannelType.GuildCategory },
          ]),
        },
      },
      respond,
    };

    await respondCategoryAutocomplete(interaction as never, OPTS);

    const choices = respond.mock.calls[0][0] as Array<{
      name: string;
      value: string;
    }>;
    expect(choices).toContainEqual({ name: "TOP", value: "TOP" });
  });

  it("オートコンプリートの選択肢が 25 件に制限されることを確認", async () => {
    const respond = vi.fn();
    const categories = Array.from({ length: 30 }, (_, i) => ({
      id: `cat-${i}`,
      name: `Category-${i}`,
      type: ChannelType.GuildCategory,
    }));

    const interaction = {
      commandName: COMMAND,
      options: {
        getSubcommand: vi.fn(() => "setup"),
        getFocused: vi.fn(() => ""),
      },
      guild: { channels: { cache: createCache(categories) } },
      respond,
    };

    await respondCategoryAutocomplete(interaction as never, OPTS);

    const choices = respond.mock.calls[0][0] as Array<{
      name: string;
      value: string;
    }>;
    expect(choices).toHaveLength(25);
    expect(choices[0]).toEqual({ name: "TOP", value: "TOP" });
  });
});
