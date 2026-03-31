// tests/unit/bot/features/vc-recruit/commands/usecases/vcRecruitConfigView.test.ts
import { handleVcRecruitConfigView } from "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigView";
import { ValidationError } from "@/shared/errors/customErrors";

// ---- モック定義 ----

const getVcRecruitConfigOrDefaultMock = vi.fn();
const tInteractionMock = vi.fn(
  (_locale: string, key: string, opts?: Record<string, unknown>) =>
    opts ? `${key}:${JSON.stringify(opts)}` : key,
);
const tDefaultMock = vi.fn((key: string) => key);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitRepository: () => ({
    getVcRecruitConfigOrDefault: (...args: unknown[]) =>
      getVcRecruitConfigOrDefaultMock(...args),
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
  tInteraction: (...args: unknown[]) =>
    tInteractionMock(...(args as Parameters<typeof tInteractionMock>)),
  tDefault: (...args: unknown[]) =>
    tDefaultMock(...(args as Parameters<typeof tDefaultMock>)),
}));

// ---- ヘルパー ----

const GUILD_ID = "guild-1";

function makeInteraction(
  opts: {
    hasGuild?: boolean;
    guildChannels?: Record<string, { name: string }>;
  } = {},
) {
  const { hasGuild = true, guildChannels = {} } = opts;
  return {
    locale: "ja",
    guild: hasGuild
      ? {
          id: GUILD_ID,
          channels: {
            cache: {
              get: (id: string) => guildChannels[id] ?? undefined,
            },
          },
        }
      : null,
    reply: vi.fn().mockResolvedValue(undefined),
  };
}

describe("bot/features/vc-recruit/commands/usecases/vcRecruitConfigView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guild が null の場合は ValidationError を投げる", async () => {
    const interaction = makeInteraction({ hasGuild: false });
    await expect(
      handleVcRecruitConfigView(interaction as never, GUILD_ID),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("セットアップ・ロールが空の場合もエラーなく info embed で返信する", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [],
      mentionRoleIds: [],
    });
    const interaction = makeInteraction();
    await handleVcRecruitConfigView(interaction as never, GUILD_ID);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        flags: expect.anything(),
      }),
    );
  });

  it("セットアップがある場合はカテゴリー名を含む返信をする（既知カテゴリーあり）", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [
        {
          categoryId: "cat-1",
          panelChannelId: "panel-ch-1",
          postChannelId: "post-ch-1",
        },
      ],
      mentionRoleIds: [],
    });
    const interaction = makeInteraction({
      guildChannels: { "cat-1": { name: "ゲームカテゴリー" } },
    });
    await handleVcRecruitConfigView(interaction as never, GUILD_ID);

    expect(interaction.reply).toHaveBeenCalled();
    expect(getVcRecruitConfigOrDefaultMock).toHaveBeenCalledWith(GUILD_ID);
  });

  it("categoryId が null のセットアップは TOP キーで表示する", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [
        {
          categoryId: null,
          panelChannelId: "panel-ch-1",
          postChannelId: "post-ch-1",
        },
      ],
      mentionRoleIds: [],
    });
    const interaction = makeInteraction();
    await handleVcRecruitConfigView(interaction as never, GUILD_ID);

    expect(interaction.reply).toHaveBeenCalled();
    expect(tInteractionMock).toHaveBeenCalledWith(
      "ja",
      "vcRecruit:embed.field.value.top",
    );
  });

  it("categoryId があるがキャッシュに存在しないセットアップは categoryId 文字列をフォールバックラベルとして使用する", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [
        {
          categoryId: "cat-missing",
          panelChannelId: "panel-ch-1",
          postChannelId: "post-ch-1",
        },
      ],
      mentionRoleIds: [],
    });
    // cat-missing はキャッシュに存在しない
    const interaction = makeInteraction({ guildChannels: {} });
    await handleVcRecruitConfigView(interaction as never, GUILD_ID);

    expect(interaction.reply).toHaveBeenCalled();
    // setup_item の category 引数に categoryId そのものが渡される
    expect(tInteractionMock).toHaveBeenCalledWith(
      "ja",
      "vcRecruit:embed.field.value.setup_item",
      expect.objectContaining({ category: "cat-missing" }),
    );
  });

  it("ロールがある場合はロール一覧を含む embed で返信する", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [],
      mentionRoleIds: ["role-1", "role-2"],
    });
    const interaction = makeInteraction();
    await handleVcRecruitConfigView(interaction as never, GUILD_ID);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        embeds: expect.any(Array),
        flags: expect.anything(),
      }),
    );
  });
});
