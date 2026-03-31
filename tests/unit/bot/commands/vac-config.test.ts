// tests/unit/bot/commands/vac-config.test.ts
import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
} from "discord.js";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import type { Mock } from "vitest";

const addTriggerChannelMock = vi.fn();
const getVacConfigOrDefaultMock = vi.fn();
const removeTriggerChannelMock = vi.fn();
const tDefaultMock = vi.hoisted(() => vi.fn((key: string) => `default:${key}`));
const createSuccessEmbedMock = vi.fn((description: string) => ({
  description,
}));
const createInfoEmbedMock = vi.fn((description: string, options?: unknown) => ({
  description,
  options,
}));

// VAC設定関数の依存を置き換え、コマンド分岐を実コードで検証する
vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVacConfigService: () => ({
    addTriggerChannel: (...args: unknown[]) => addTriggerChannelMock(...args),
    getVacConfigOrDefault: (...args: unknown[]) =>
      getVacConfigOrDefaultMock(...args),
    removeTriggerChannel: (...args: unknown[]) =>
      removeTriggerChannelMock(...args),
  }),
}));

// 共通エラーハンドラ委譲のみ検証する
vi.mock("@/bot/errors/interactionErrorHandler", () => ({
  handleCommandError: vi.fn(),
}));

// i18n を固定化して期待値を安定させる
vi.mock("@/shared/locale/commandLocalizations", () => ({
  getCommandLocalizations: () => ({
    ja: "desc",
    localizations: { "en-US": "desc" },
  }),
}));
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
  tDefault: tDefaultMock,
  tInteraction: (...args: unknown[]) => args[1],
}));

// Embed 生成は簡易オブジェクトを返す
vi.mock("@/bot/utils/messageResponse", () => ({
  createSuccessEmbed: (description: string) =>
    createSuccessEmbedMock(description),
  createInfoEmbed: (description: string, options?: unknown) =>
    createInfoEmbedMock(description, options),
}));

import { vacConfigCommand } from "@/bot/commands/vac-config";
import { handleCommandError } from "@/bot/errors/interactionErrorHandler";

type CommandInteractionLike = {
  guildId: string | null;
  locale: string;
  guild: {
    channels: {
      create: Mock;
      fetch: Mock;
      cache: {
        find: Mock;
        filter: Mock;
      };
    };
  } | null;
  channelId: string;
  memberPermissions: { has: Mock };
  options: {
    getSubcommand: Mock;
    getString: Mock;
  };
  reply: Mock;
};

type FakeChannel = {
  id: string;
  type: ChannelType;
  name?: string;
  parent?: { id: string; name?: string; type: ChannelType } | null;
  children?: { cache: { size: number } };
  delete?: Mock;
};

type AutocompleteInteractionLike = {
  commandName: string;
  guild: { id: string; channels: { cache: { filter: Mock } } } | null;
  options: {
    getSubcommand: Mock;
    getFocused: Mock;
  };
  respond: Mock;
};

// vac-config 実行用 interaction モック
function createCommandInteraction(
  overrides?: Partial<CommandInteractionLike>,
): CommandInteractionLike {
  return {
    guildId: "guild-1",
    locale: "ja",
    guild: {
      channels: {
        create: vi.fn().mockResolvedValue({ id: "trigger-1" }),
        fetch: vi.fn().mockResolvedValue({ id: "text-1", parent: null }),
        cache: {
          find: vi.fn(() => null),
          filter: vi.fn(() => []),
        },
      },
    },
    channelId: "text-1",
    memberPermissions: { has: vi.fn(() => true) },
    options: {
      getSubcommand: vi.fn(() => "create-trigger-vc"),
      getString: vi.fn(() => null),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function createGuildWithChannels(options?: {
  byId?: Record<string, FakeChannel | null>;
  cacheList?: FakeChannel[];
  createdChannel?: { id: string };
}): CommandInteractionLike["guild"] {
  const byId = options?.byId ?? {};
  const cacheList = options?.cacheList ?? [];
  const createdChannel = options?.createdChannel ?? { id: "trigger-1" };

  return {
    channels: {
      create: vi.fn().mockResolvedValue(createdChannel),
      fetch: vi.fn(async (id: string) => {
        if (Object.prototype.hasOwnProperty.call(byId, id)) {
          return byId[id] ?? null;
        }
        return null;
      }),
      cache: {
        find: vi.fn((predicate: (channel: FakeChannel) => boolean) =>
          cacheList.find(predicate),
        ),
        filter: vi.fn((predicate: (channel: FakeChannel) => boolean) =>
          cacheList.filter(predicate),
        ),
      },
    },
  };
}

// vac-config autocomplete 用 interaction モック
function createAutocompleteInteraction(
  overrides?: Partial<AutocompleteInteractionLike>,
): AutocompleteInteractionLike {
  const categoryA = {
    type: ChannelType.GuildCategory,
    name: "Alpha",
    id: "cat-1",
  };
  const categoryB = {
    type: ChannelType.GuildCategory,
    name: "Beta",
    id: "cat-2",
  };
  const channels = [categoryA, categoryB];

  return {
    commandName: "vac-config",
    guild: {
      id: "guild-1",
      channels: {
        cache: {
          filter: vi.fn((predicate: (channel: unknown) => boolean) =>
            channels.filter(predicate),
          ),
        },
      },
    },
    options: {
      getSubcommand: vi.fn(() => "create-trigger-vc"),
      getFocused: vi.fn(() => "a"),
    },
    respond: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

// vac-config コマンドの各サブコマンド（create-trigger-vc / remove-trigger-vc / view）と
// オートコンプリートについて、権限チェック／カテゴリ解決／DB操作／応答内容を検証する
describe("bot/commands/vac-config", () => {
  // ケース間でモック状態を初期化する
  beforeEach(() => {
    vi.clearAllMocks();
    getVacConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      triggerChannelIds: [],
      createdChannels: [],
    });
  });

  it("ManageGuild 権限がない場合に権限チェックエラーが handleCommandError へ委譲されることを確認", async () => {
    const interaction = createCommandInteraction({
      memberPermissions: { has: vi.fn(() => false) },
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.memberPermissions.has).toHaveBeenCalledWith(
      PermissionFlagsBits.ManageGuild,
    );
    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("create-trigger-vc でトリガーボイスチャンネルが作成・保存・応答されることを確認", async () => {
    const interaction = createCommandInteraction();

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.memberPermissions.has).toHaveBeenCalledWith(
      PermissionFlagsBits.ManageGuild,
    );
    expect(interaction.guild?.channels.create).toHaveBeenCalledWith({
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: null,
    });
    expect(addTriggerChannelMock).toHaveBeenCalledWith("guild-1", "trigger-1");
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [expect.objectContaining({ description: expect.any(String) })],
      flags: 64,
    });
  });

  it("現在チャンネルの親カテゴリを解決してトリガーが作成されることを確認", async () => {
    const category = {
      id: "cat-parent",
      type: ChannelType.GuildCategory,
      name: "Parent",
      children: { cache: { size: 1 } },
    };
    const interaction = createCommandInteraction({
      guild: createGuildWithChannels({
        byId: {
          "text-1": {
            id: "text-1",
            type: ChannelType.GuildText,
            parent: category,
          },
        },
      }),
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.guild?.channels.create).toHaveBeenCalledWith({
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: "cat-parent",
    });
  });

  it("現在チャンネルの取得に失敗した場合はカテゴリなし（トップレベル）でVCが作成されることを確認", async () => {
    const interaction = createCommandInteraction({
      guild: createGuildWithChannels({
        byId: {},
      }),
    });

    interaction.guild?.channels.fetch.mockRejectedValue(
      new Error("fetch failed"),
    );

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.guild?.channels.create).toHaveBeenCalledWith({
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: null,
    });
  });

  it("カテゴリオプションが TOP の場合はトップレベルでトリガーが作成されることを確認", async () => {
    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "create-trigger-vc"),
        getString: vi.fn(() => "TOP"),
      },
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.guild?.channels.create).toHaveBeenCalledWith({
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: null,
    });
  });

  it("カテゴリオプションが ID で解決された場合にトリガーが作成されることを確認", async () => {
    const category = {
      id: "cat-by-id",
      name: "ById",
      type: ChannelType.GuildCategory,
      children: { cache: { size: 1 } },
    };
    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "create-trigger-vc"),
        getString: vi.fn(() => "cat-by-id"),
      },
      guild: createGuildWithChannels({ byId: { "cat-by-id": category } }),
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.guild?.channels.create).toHaveBeenCalledWith({
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: "cat-by-id",
    });
  });

  it("カテゴリオプションが名前で解決された場合にトリガーが作成されることを確認", async () => {
    const category = {
      id: "cat-by-name",
      name: "TargetCategory",
      type: ChannelType.GuildCategory,
      children: { cache: { size: 1 } },
    };
    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "create-trigger-vc"),
        getString: vi.fn(() => "targetcategory"),
      },
      guild: createGuildWithChannels({
        byId: { targetcategory: null },
        cacheList: [category],
      }),
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.guild?.channels.create).toHaveBeenCalledWith({
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: "cat-by-name",
    });
  });

  it("カテゴリオプションが解決できない場合はトップレベルでトリガーが作成されることを確認", async () => {
    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "create-trigger-vc"),
        getString: vi.fn(() => "unknown-category"),
      },
      guild: createGuildWithChannels({
        byId: {
          "unknown-category": {
            id: "unknown-category",
            type: ChannelType.GuildText,
          },
        },
        cacheList: [],
      }),
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.guild?.channels.create).toHaveBeenCalledWith({
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: null,
    });
  });

  it("カテゴリ fetch が失敗して名前フォールバックも見つからない場合はトップレベルでトリガーが作成されることを確認", async () => {
    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "create-trigger-vc"),
        getString: vi.fn(() => "cat-error"),
      },
      guild: createGuildWithChannels({ byId: {}, cacheList: [] }),
    });

    interaction.guild?.channels.fetch.mockImplementation(async (id: string) => {
      if (id === "cat-error") {
        throw new Error("fetch error");
      }
      return null;
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.guild?.channels.create).toHaveBeenCalledWith({
      name: "CreateVC",
      type: ChannelType.GuildVoice,
      parent: null,
    });
  });

  it("同カテゴリにトリガーVCが既に存在する場合は重複作成を防いで handleCommandError へ委譲されることを確認", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["tr-existing"],
      createdChannels: [],
    });

    const category = {
      id: "cat-1",
      name: "Cat",
      type: ChannelType.GuildCategory,
      children: { cache: { size: 2 } },
    };

    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "create-trigger-vc"),
        getString: vi.fn(() => "cat-1"),
      },
      guild: createGuildWithChannels({
        byId: {
          "cat-1": category,
          "tr-existing": {
            id: "tr-existing",
            name: "CreateVC",
            type: ChannelType.GuildVoice,
            parent: category,
          },
        },
      }),
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
    expect(addTriggerChannelMock).not.toHaveBeenCalled();
  });

  it("トリガーVCの親がカテゴリ以外の場合はトップレベルの既存トリガーとみなして重複エラーになることを確認", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["tr-top"],
      createdChannels: [],
    });

    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "create-trigger-vc"),
        getString: vi.fn(() => "TOP"),
      },
      guild: createGuildWithChannels({
        byId: {
          "tr-top": {
            id: "tr-top",
            name: "CreateVC",
            type: ChannelType.GuildVoice,
            parent: { id: "text-parent", type: ChannelType.GuildText },
          },
        },
      }),
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
    expect(interaction.guild?.channels.create).not.toHaveBeenCalled();
  });

  it("対象カテゴリが 50 チャンネル上限に達している場合は作成せず handleCommandError へ委譲されることを確認", async () => {
    const category = {
      id: "cat-full",
      name: "Full",
      type: ChannelType.GuildCategory,
      children: { cache: { size: 50 } },
    };
    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "create-trigger-vc"),
        getString: vi.fn(() => "cat-full"),
      },
      guild: createGuildWithChannels({ byId: { "cat-full": category } }),
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
    expect(interaction.guild?.channels.create).not.toHaveBeenCalled();
  });

  it("create-trigger-vc でギルドが予期せず欠如している場合は handleCommandError へ委譲されることを確認", async () => {
    const interaction = createCommandInteraction({
      guild: null,
      options: {
        getSubcommand: vi.fn(() => "create-trigger-vc"),
        getString: vi.fn(() => null),
      },
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("remove-trigger-vc でトリガーチャンネルがある場合にセレクトメニュー付きで reply する", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      triggerChannelIds: ["tr-1"],
    });

    const category = {
      id: "cat-1",
      name: "Cat",
      type: ChannelType.GuildCategory,
    };
    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "remove-trigger-vc"),
        getString: vi.fn(() => null),
      },
      guild: createGuildWithChannels({
        byId: {
          "tr-1": {
            id: "tr-1",
            type: ChannelType.GuildVoice,
            parent: category,
          },
        },
      }),
      reply: vi.fn().mockResolvedValue({
        createMessageComponentCollector: () => ({ on: vi.fn() }),
      }),
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        components: expect.any(Array),
        flags: 64,
      }),
    );
  });

  it("remove-trigger-vc でトリガーチャンネルが0件の場合は handleCommandError へ委譲される", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      triggerChannelIds: [],
    });

    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "remove-trigger-vc"),
        getString: vi.fn(() => null),
      },
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("remove-trigger-vc でギルドが予期せず欠如している場合は handleCommandError へ委譲されることを確認", async () => {
    const interaction = createCommandInteraction({
      guild: null,
      options: {
        getSubcommand: vi.fn(() => "remove-trigger-vc"),
        getString: vi.fn(() => null),
      },
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("設定済みのトリガーチャンネルと作成済みチャンネルが表示されることを確認", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["tr-1", "tr-2"],
      createdChannels: [{ voiceChannelId: "vc-1", ownerId: "user-1" }],
    });

    const category = {
      id: "cat-1",
      name: "Category One",
      type: ChannelType.GuildCategory,
    };
    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "view"),
        getString: vi.fn(() => null),
      },
      guild: createGuildWithChannels({
        byId: {
          "tr-1": {
            id: "tr-1",
            type: ChannelType.GuildVoice,
            parent: category,
          },
          "tr-2": {
            id: "tr-2",
            type: ChannelType.GuildVoice,
            parent: null,
          },
        },
      }),
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(createInfoEmbedMock).toHaveBeenCalledTimes(1);
    expect(interaction.reply).toHaveBeenCalledWith({
      embeds: [
        expect.objectContaining({
          description: "",
        }),
      ],
      flags: 64,
    });
  });

  it("view でトリガーチャンネルの fetch が失敗した場合はチャンネルメンションのみが表示されることを確認", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      triggerChannelIds: ["tr-fail"],
      createdChannels: [],
    });

    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "view"),
        getString: vi.fn(() => null),
      },
      guild: createGuildWithChannels({ byId: {} }),
    });

    interaction.guild?.channels.fetch.mockRejectedValue(
      new Error("fetch failed"),
    );

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(interaction.reply).toHaveBeenCalledTimes(1);
    const [, options] = createInfoEmbedMock.mock.calls[0] as [
      string,
      {
        fields: Array<{ value: string }>;
      },
    ];
    expect(options.fields[0].value).toContain("<#tr-fail>");
  });

  it("チャンネルが未設定の場合はフォールバックラベルが表示されることを確認", async () => {
    getVacConfigOrDefaultMock.mockResolvedValue({
      enabled: true,
      triggerChannelIds: [],
      createdChannels: [],
    });

    const interaction = createCommandInteraction({
      options: {
        getSubcommand: vi.fn(() => "view"),
        getString: vi.fn(() => null),
      },
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(createInfoEmbedMock).toHaveBeenCalledTimes(1);
    const [, options] = createInfoEmbedMock.mock.calls[0] as [
      string,
      {
        fields: Array<{ value: string }>;
      },
    ];
    expect(options.fields.length).toBe(2);
  });

  it("view でギルドが予期せず欠如している場合は handleCommandError へ委譲されることを確認", async () => {
    const interaction = createCommandInteraction({
      guild: null,
      options: {
        getSubcommand: vi.fn(() => "view"),
        getString: vi.fn(() => null),
      },
    });

    await vacConfigCommand.execute(
      interaction as unknown as ChatInputCommandInteraction,
    );

    expect(handleCommandError).toHaveBeenCalledTimes(1);
  });

  it("オートコンプリートで TOP と一致するカテゴリ候補が返されることを確認", async () => {
    const interaction = createAutocompleteInteraction();

    await vacConfigCommand.autocomplete!(
      interaction as unknown as AutocompleteInteraction,
    );

    expect(interaction.respond).toHaveBeenCalledTimes(1);
    const choices = interaction.respond.mock.calls[0][0] as Array<{
      name: string;
      value: string;
    }>;
    expect(choices.some((choice) => choice.value === "TOP")).toBe(true);
    expect(choices.some((choice) => choice.value === "cat-1")).toBe(true);
  });

  it("コマンド名が一致しない場合は空の選択肢が返されることを確認", async () => {
    const interaction = createAutocompleteInteraction({ commandName: "other" });

    await vacConfigCommand.autocomplete!(
      interaction as unknown as AutocompleteInteraction,
    );

    expect(interaction.respond).toHaveBeenCalledWith([]);
  });

  it("サブコマンドが非対応の場合は空の選択肢が返されることを確認", async () => {
    const interaction = createAutocompleteInteraction({
      options: {
        getSubcommand: vi.fn(() => "view"),
        getFocused: vi.fn(() => "a"),
      },
    });

    await vacConfigCommand.autocomplete!(
      interaction as unknown as AutocompleteInteraction,
    );

    expect(interaction.respond).toHaveBeenCalledWith([]);
  });

  it("オートコンプリートでギルドが欠如している場合は空の選択肢が返されることを確認", async () => {
    const interaction = createAutocompleteInteraction({ guild: null });

    await vacConfigCommand.autocomplete!(
      interaction as unknown as AutocompleteInteraction,
    );

    expect(interaction.respond).toHaveBeenCalledWith([]);
  });

  it("remove-trigger-vc のオートコンプリートが有効パスとして機能することを確認", async () => {
    const interaction = createAutocompleteInteraction({
      options: {
        getSubcommand: vi.fn(() => "remove-trigger-vc"),
        getFocused: vi.fn(() => "be"),
      },
    });

    await vacConfigCommand.autocomplete!(
      interaction as unknown as AutocompleteInteraction,
    );

    const choices = interaction.respond.mock.calls[0][0] as Array<{
      name: string;
      value: string;
    }>;
    expect(choices.some((choice) => choice.value === "cat-2")).toBe(true);
  });
});
