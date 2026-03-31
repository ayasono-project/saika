// tests/unit/bot/features/vc-recruit/commands/usecases/vcRecruitConfigSetup.test.ts

import { ChannelType, DiscordAPIError, RESTJSONErrorCodes } from "discord.js";
import { handleVcRecruitConfigSetup } from "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigSetup";
import { ValidationError } from "@/shared/errors/customErrors";

// ---- モック定義 ----

const findSetupByCategoryIdMock = vi.fn();
const addSetupMock = vi.fn();
const resolveTargetCategoryMock = vi.fn();
const tInteractionMock = vi.fn((_locale: string, key: string) => key);
const tDefaultMock = vi.fn((key: string) => key);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    findSetupByCategoryId: (...args: unknown[]) =>
      findSetupByCategoryIdMock(...args),
    addSetup: (...args: unknown[]) => addSetupMock(...args),
  }),
}));
vi.mock(
  "@/bot/features/vc-recruit/commands/helpers/vcRecruitTargetResolver",
  () => ({
    resolveTargetCategory: (...args: unknown[]) =>
      resolveTargetCategoryMock(...args),
  }),
);
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
  tInteraction: (...args: unknown[]) =>
    tInteractionMock(...(args as Parameters<typeof tInteractionMock>)),
  tDefault: (...args: unknown[]) =>
    tDefaultMock(...(args as Parameters<typeof tDefaultMock>)),
  tGuild: vi.fn(async (_guildId: string, key: string) => key),
}));

// ---- ヘルパー ----

const GUILD_ID = "guild-1";

const panelSendMock = vi.fn();
const createChannelMock = vi.fn();

function makeGuild(
  opts: {
    categoryChildren?: number;
    categoryViewAllowed?: boolean;
    categoryId?: string | null;
  } = {},
) {
  const {
    categoryChildren = 0,
    categoryViewAllowed = true,
    categoryId = null,
  } = opts;

  const everyoneRole = { id: "everyone-role" };
  const meId = "bot-me";

  const channelCounter = { count: 0 };
  createChannelMock.mockImplementation(
    (opts: { name: string; type: number }) => {
      channelCounter.count++;
      const id = `created-ch-${channelCounter.count}`;
      if (opts.type === ChannelType.GuildText) {
        return Promise.resolve({ id, send: panelSendMock });
      }
      return Promise.resolve({ id });
    },
  );

  panelSendMock.mockResolvedValue({ id: "panel-msg-1" });

  const category = categoryId
    ? {
        id: categoryId,
        children: { cache: { size: categoryChildren } },
        permissionsFor: () => ({
          has: () => categoryViewAllowed,
        }),
      }
    : null;

  return {
    id: GUILD_ID,
    roles: { everyone: everyoneRole },
    members: { me: { id: meId } },
    channels: {
      create: createChannelMock,
    },
    _category: category,
  };
}

function makeInteraction(
  opts: {
    hasGuild?: boolean;
    guildObj?: ReturnType<typeof makeGuild> | null;
    categoryOption?: string | null;
    threadArchiveOption?: string | null;
    channelId?: string;
  } = {},
) {
  const {
    hasGuild = true,
    guildObj,
    categoryOption = null,
    threadArchiveOption = null,
    channelId = "cmd-channel-1",
  } = opts;

  const guild =
    guildObj !== undefined ? guildObj : hasGuild ? makeGuild() : null;

  return {
    guild,
    guildId: GUILD_ID,
    locale: "ja",
    channelId,
    options: {
      getString: (key: string) => {
        if (key === "category") return categoryOption;
        if (key === "thread-archive") return threadArchiveOption;
        return null;
      },
    },
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

describe("bot/features/vc-recruit/commands/usecases/vcRecruitConfigSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findSetupByCategoryIdMock.mockResolvedValue(null);
    addSetupMock.mockResolvedValue(undefined);
    // デフォルト: カテゴリーなし（TOP）
    resolveTargetCategoryMock.mockResolvedValue(null);
  });

  it("guild が null の場合は ValidationError を投げる", async () => {
    const interaction = makeInteraction({ hasGuild: false });
    await expect(
      handleVcRecruitConfigSetup(interaction as never, GUILD_ID),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("既にセットアップ済みの場合は ValidationError を投げる", async () => {
    findSetupByCategoryIdMock.mockResolvedValue({
      panelChannelId: "old-panel",
    });

    const guild = makeGuild();
    const interaction = makeInteraction({ guildObj: guild });
    await expect(
      handleVcRecruitConfigSetup(interaction as never, GUILD_ID),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("カテゴリーが満杯（50チャンネル）の場合は ValidationError を投げる", async () => {
    const category = {
      id: "cat-full",
      children: { cache: { size: 50 } },
      permissionsFor: () => ({ has: () => true }),
    };
    resolveTargetCategoryMock.mockResolvedValue(category);

    const guild = makeGuild({ categoryId: "cat-full", categoryChildren: 50 });
    const interaction = makeInteraction({ guildObj: guild });
    await expect(
      handleVcRecruitConfigSetup(interaction as never, GUILD_ID),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("guild.channels.create で MissingPermissions エラーが発生した場合は上位ハンドラへ伝播する", async () => {
    const apiError = new DiscordAPIError(
      {
        code: RESTJSONErrorCodes.MissingPermissions,
        message: "Missing Permissions",
      },
      RESTJSONErrorCodes.MissingPermissions,
      403,
      "POST",
      "/guilds/guild-1/channels",
      {},
    );
    const guild = makeGuild();
    guild.channels.create = vi.fn().mockRejectedValue(apiError);
    const interaction = makeInteraction({ guildObj: guild });

    await expect(
      handleVcRecruitConfigSetup(interaction as never, GUILD_ID),
    ).rejects.toBe(apiError);
  });

  it("カテゴリーなし（TOP）で正常にセットアップでき、パネル/投稿チャンネルを作成して DB に保存する", async () => {
    const guild = makeGuild();
    const interaction = makeInteraction({ guildObj: guild });
    await handleVcRecruitConfigSetup(interaction as never, GUILD_ID);

    // 2チャンネル作成確認
    expect(createChannelMock).toHaveBeenCalledTimes(2);
    // パネルメッセージ送信確認
    expect(panelSendMock).toHaveBeenCalled();
    // DB 保存確認
    expect(addSetupMock).toHaveBeenCalledWith(
      GUILD_ID,
      expect.objectContaining({
        categoryId: null,
        panelChannelId: expect.any(String),
        postChannelId: expect.any(String),
        panelMessageId: expect.any(String),
      }),
    );
    // 返信確認
    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        flags: expect.anything(),
      }),
    );
  });

  it("カテゴリーあり（49チャンネル）で正常にセットアップでき、指定カテゴリー下にチャンネルを作成する", async () => {
    const category = {
      id: "cat-1",
      name: "ゲームカテゴリー",
      children: { cache: { size: 49 } },
      permissionsFor: () => ({ has: () => true }),
    };
    resolveTargetCategoryMock.mockResolvedValue(category);

    const guild = makeGuild({ categoryId: "cat-1", categoryChildren: 49 });
    const interaction = makeInteraction({ guildObj: guild });
    await handleVcRecruitConfigSetup(interaction as never, GUILD_ID);

    expect(addSetupMock).toHaveBeenCalledWith(
      GUILD_ID,
      expect.objectContaining({ categoryId: "cat-1" }),
    );
  });

  it("threadArchiveOption が指定されている場合は正しい分数に変換される", async () => {
    const guild = makeGuild();
    const interaction = makeInteraction({
      guildObj: guild,
      threadArchiveOption: "1h",
    });
    await handleVcRecruitConfigSetup(interaction as never, GUILD_ID);

    expect(addSetupMock).toHaveBeenCalledWith(
      GUILD_ID,
      expect.objectContaining({ threadArchiveDuration: 60 }),
    );
  });

  it("@everyone が ViewChannel を持たないカテゴリーでは everyoneViewAllowed=false となり、チャンネルが正常に作成される", async () => {
    const category = {
      id: "cat-restricted",
      name: "制限カテゴリー",
      children: { cache: { size: 0 } },
      // ViewChannel なし → everyoneViewAllowed = false
      permissionsFor: () => ({ has: () => false }),
    };
    resolveTargetCategoryMock.mockResolvedValue(category);

    const guild = makeGuild({
      categoryId: "cat-restricted",
      categoryViewAllowed: false,
    });
    const interaction = makeInteraction({ guildObj: guild });
    await handleVcRecruitConfigSetup(interaction as never, GUILD_ID);

    expect(addSetupMock).toHaveBeenCalledWith(
      GUILD_ID,
      expect.objectContaining({ categoryId: "cat-restricted" }),
    );
    // チャンネルは everyoneViewAllowed=false でも正常に作成される
    expect(createChannelMock).toHaveBeenCalledTimes(2);
  });
});
