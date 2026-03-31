// tests/unit/bot/features/vc-recruit/commands/usecases/vcRecruitConfigTeardown.test.ts
import { handleVcRecruitConfigTeardown } from "@/bot/features/vc-recruit/commands/usecases/vcRecruitConfigTeardown";
import { VC_RECRUIT_TIMEOUT } from "@/bot/features/vc-recruit/commands/vcRecruitConfigCommand.constants";
import { disableComponentsAfterTimeout } from "@/bot/shared/disableComponentsAfterTimeout";
import { ValidationError } from "@/shared/errors/customErrors";

// ---- モック定義 ----

const getVcRecruitConfigOrDefaultMock = vi.fn();
const tInteractionMock = vi.fn(
  (_locale: string, key: string, opts?: Record<string, unknown>) =>
    opts ? `${key}:${JSON.stringify(opts)}` : key,
);
const tDefaultMock = vi.fn((key: string) => key);

vi.mock("@/bot/services/botCompositionRoot", () => ({
  getBotVcRecruitConfigService: () => ({
    getVcRecruitConfigOrDefault: (...args: unknown[]) =>
      getVcRecruitConfigOrDefaultMock(...args),
  }),
}));
vi.mock("@/bot/shared/disableComponentsAfterTimeout", () => ({
  disableComponentsAfterTimeout: vi.fn(),
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

/** テスト用インタラクションモックを生成する */
function makeInteraction(guildChannels: Record<string, { name: string }> = {}) {
  return {
    id: "interaction-001",
    locale: "ja",
    guild: {
      id: GUILD_ID,
      channels: {
        cache: {
          get: (id: string) => guildChannels[id] ?? undefined,
        },
      },
    },
    reply: vi.fn().mockResolvedValue(undefined),
    editReply: vi.fn().mockResolvedValue(undefined),
  };
}

// handleVcRecruitConfigTeardown のユースケースロジックを検証
describe("bot/features/vc-recruit/commands/usecases/vcRecruitConfigTeardown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("guild が null の場合は ValidationError を投げる", async () => {
    const interaction = { guild: null };
    await expect(
      handleVcRecruitConfigTeardown(interaction as never, GUILD_ID),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("セットアップが0件の場合は ValidationError を投げる", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({ setups: [] });

    const interaction = makeInteraction();
    await expect(
      handleVcRecruitConfigTeardown(interaction as never, GUILD_ID),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("セットアップが存在する場合は StringSelectMenu 付きのエフェメラルメッセージで応答する", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [{ categoryId: null, panelChannelId: "panel-ch-1" }],
    });

    const interaction = makeInteraction();
    await handleVcRecruitConfigTeardown(interaction as never, GUILD_ID);

    expect(interaction.reply).toHaveBeenCalledWith(
      expect.objectContaining({
        components: expect.any(Array),
        flags: expect.anything(),
      }),
    );
  });

  it("categoryId が null の場合は TOP ラベルを使用する", async () => {
    const topLabel = "TOP（カテゴリーなし）";
    tInteractionMock.mockImplementation((_locale: string, key: string) => {
      if (key === "vcRecruit:ui.select.teardown_top") return topLabel;
      return key;
    });

    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [{ categoryId: null, panelChannelId: "panel-ch-1" }],
    });

    const interaction = makeInteraction();
    await handleVcRecruitConfigTeardown(interaction as never, GUILD_ID);

    // reply が呼ばれ、コンポーネントが含まれることを確認
    expect(interaction.reply).toHaveBeenCalled();
    const callArg = (interaction.reply as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as {
      components: {
        components: { options: { data: { label: string; value: string } }[] }[];
      }[];
    };
    const selectOptions = callArg.components[0].components[0].options;
    expect(selectOptions[0].data.label).toBe(topLabel);
    expect(selectOptions[0].data.value).toBe("panel-ch-1");
  });

  it("categoryId のチャンネルが存在する場合はチャンネル名を使用する", async () => {
    const channelName = "ゲームカテゴリー";
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [{ categoryId: "cat-1", panelChannelId: "panel-ch-1" }],
    });

    const interaction = makeInteraction({ "cat-1": { name: channelName } });
    await handleVcRecruitConfigTeardown(interaction as never, GUILD_ID);

    expect(interaction.reply).toHaveBeenCalled();
    const callArg = (interaction.reply as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as {
      components: {
        components: { options: { data: { label: string; value: string } }[] }[];
      }[];
    };
    const selectOptions = callArg.components[0].components[0].options;
    expect(selectOptions[0].data.label).toBe(channelName);
    expect(selectOptions[0].data.value).toBe("panel-ch-1");
  });

  it("categoryId が存在しないチャンネルの場合は unknown_category ラベルを使用する", async () => {
    const unknownLabel = "不明なカテゴリー（ID: cat-999）";
    tInteractionMock.mockImplementation(
      (_locale: string, key: string, opts?: Record<string, unknown>) => {
        if (key === "vcRecruit:ui.select.teardown_unknown_category")
          return `不明なカテゴリー（ID: ${opts?.id}）`;
        return key;
      },
    );

    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [{ categoryId: "cat-999", panelChannelId: "panel-ch-1" }],
    });

    // cat-999 は guild キャッシュに存在しない
    const interaction = makeInteraction({});
    await handleVcRecruitConfigTeardown(interaction as never, GUILD_ID);

    const callArg = (interaction.reply as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as {
      components: {
        components: { options: { data: { label: string; value: string } }[] }[];
      }[];
    };
    const selectOptions = callArg.components[0].components[0].options;
    expect(selectOptions[0].data.label).toBe(unknownLabel);
  });

  it("disableComponentsAfterTimeout が COMPONENT_DISABLE_MS で呼ばれる", async () => {
    getVcRecruitConfigOrDefaultMock.mockResolvedValue({
      setups: [{ categoryId: null, panelChannelId: "panel-ch-1" }],
    });

    const interaction = makeInteraction();
    await handleVcRecruitConfigTeardown(interaction as never, GUILD_ID);

    expect(disableComponentsAfterTimeout).toHaveBeenCalledWith(
      interaction,
      expect.any(Array),
      VC_RECRUIT_TIMEOUT.COMPONENT_DISABLE_MS,
    );
  });
});
